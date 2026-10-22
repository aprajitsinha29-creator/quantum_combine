/*
 * careers-bridge.js — Tier 2 handoff from Ananta to QPath.
 *
 * When a mission is solved in Ananta, this script posts the completed mission
 * ids and the QPath skill ids they have earned to the QPath app running inside
 * the #view-careers iframe (window.postMessage, cross-origin). QPath replies
 * 'qpath:ready' after mounting and on reloads; this file only READS local
 * progress and SENDS it — it never clears or resets anything.
 *
 * Honest note: four QPath skills are reachable — two via missions and two via
 * two-part evidence (a passed checked roadmap exercise AND one real success
 * achievement fired by the matching studio script).
 * No globals are added; everything lives in this IIFE.
 */
(function () {
  'use strict';

  // The one origin QPath runs on locally; every postMessage and every inbound
  // message check is pinned to it. Never '*' — the two apps share nothing else.
  var QPATH_ORIGIN = 'http://localhost:5173';

  // Mission-progress storage written by MissionManager.markMissionSolved.
  var STORAGE_KEY = 'ananta_completed_missions_v2';

  // Achievement counters written by this file only; studio scripts just fire
  // 'ananta:achievement' events when a real, checkable success happens.
  // v1 held ONE-event evidence under the old weak triggers; every v1 value is
  // deliberately ignored after that data meant something else.
  var ACHIEVEMENTS_KEY = 'ananta_achievements_v2';

  // Roadmap modules the learner has fully passed in topic-roadmap.js, written
  // by this file only when 'ananta:module-passed' arrives for a known id.
  var MODULE_KEY = 'ananta_roadmap_passed_v1';

  // Reverse flow: the skill ids QPath says the tracked career path asks for
  // but the learner has not declared (most in-demand first). path-recs.js
  // renders the "Recommended for your path" strip from this key.
  var GAPS_KEY = 'ananta_qpath_gaps_v1';

  // Caps for the reverse flow payload: at most 20 ids, each a short string,
  // so a hostile message cannot bloat storage or the strip.
  var GAPS_MAX_SKILLS = 20;
  var GAPS_MAX_SKILL_LENGTH = 64;

  // Caps storage growth: a counter can only reach 100, so a runaway event
  // loop cannot bloat localStorage.
  var ACHIEVEMENT_COUNT_MAX = 100;

  /*
   * One declarative rule per QPath skill. Two rule forms exist:
   *
   * Mission form: skill is earned once at least requiredMissions of the
   * listed completed missions (ids are the mission numbers used in
   * algorithms.js) are done:
   *   1 coin flip, 4 interference, 6 phase  -> quantum_mechanics
   *   2 Bell, 5 GHZ, 7 W, 8 Grover          -> quantum_information
   * Mission 3 (NOT gate) maps to nothing.
   *
   * All-of form: skill is earned ONLY when EVERY listed requirement is met
   * simultaneously — checked roadmap exercise passed AND independent studio
   * success. Requirement kinds:
   *   { kind: 'module', id }        module with this id was passed
   *   { kind: 'achievement', id }   this achievement is stored (count >= 1)
   * A single studio achievement is no longer enough by itself, so a script
   * auto-optimize or a preset the learner never touched proves nothing.
   *   surface_codes        = module-12 passed AND surface_decode achieved
   *   variational_algorithms = module-10 passed AND vqe_chem_acc achieved
   */
  var SKILL_RULES = [
    { skill: 'quantum_mechanics', missions: [1, 4, 6], requiredMissions: 2 },
    { skill: 'quantum_information', missions: [2, 5, 7, 8], requiredMissions: 2 },
    {
      skill: 'surface_codes',
      allOf: [
        { kind: 'module', id: 'module-12' },
        { kind: 'achievement', id: 'surface_decode' },
      ],
    },
    {
      skill: 'variational_algorithms',
      allOf: [
        { kind: 'module', id: 'module-10' },
        { kind: 'achievement', id: 'vqe_chem_acc' },
      ],
    },
  ];

  // The achievement ids this bridge understands, derived from the rules so
  // there is a single source of truth (junk events are filtered against it).
  var ACHIEVEMENT_IDS = SKILL_RULES.reduce(function (ids, rule) {
    if (rule.allOf) {
      rule.allOf.forEach(function (req) {
        if (req.kind === 'achievement' && ids.indexOf(req.id) === -1) ids.push(req.id);
      });
    }
    return ids;
  }, []);

  // The module ids this bridge stores as passed, derived from the same rules.
  // Unknown module-passed events are junk and are ignored entirely.
  var MODULE_IDS = SKILL_RULES.reduce(function (ids, rule) {
    if (rule.allOf) {
      rule.allOf.forEach(function (req) {
        if (req.kind === 'module' && ids.indexOf(req.id) === -1) ids.push(req.id);
      });
    }
    return ids;
  }, []);

  /**
   * Read the completed mission ids from localStorage.
   * Returns only an array of integers; anything else (missing, malformed,
   * non-JSON, non-integer entries) becomes an empty array.
   */
  function completedMissions() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (id) {
        return typeof id === 'number' && Number.isInteger(id);
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Read the achievement counters from localStorage.
   * Returns only an object of id -> positive integer; anything else (missing,
   * malformed, non-JSON, wrong types, non-integer or non-positive counts)
   * becomes an empty object. The v1 key is not read at all: those counts were
   * accumulated under the weak triggers and must not satisfy the new rules.
   */
  function achievementCounts() {
    try {
      var raw = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
      var counts = {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (var id in raw) {
          if (ACHIEVEMENT_IDS.indexOf(id) !== -1 &&
              typeof raw[id] === 'number' &&
              Number.isInteger(raw[id]) &&
              raw[id] > 0) {
            counts[id] = raw[id];
          }
        }
      }
      return counts;
    } catch (err) {
      return {};
    }
  }

  /**
   * Read the set of passed module ids (true entries only) from localStorage.
   * Unknown ids are ignored — the allowlist comes from SKILL_RULES — so a
   * stale or hostile storage value outside the curriculum is harmless.
   * Anything malformed (non-JSON, array, wrong types) becomes an empty object
   * and the read never throws.
   */
  function passedModules() {
    try {
      var raw = JSON.parse(localStorage.getItem(MODULE_KEY) || '{}');
      var passed = {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (var id in raw) {
          if (MODULE_IDS.indexOf(id) !== -1 && raw[id] === true) {
            passed[id] = true;
          }
        }
      }
      return passed;
    } catch (err) {
      return {};
    }
  }

  /**
   * Skill ids whose evidence has been earned. Pure: same inputs, same
   * outputs. Mission rules need the required mission count; all-of rules
   * need every requirement met (module passed, achievement counted).
   */
  function earnedSkills(missions, achievements, modules) {
    return SKILL_RULES.filter(function (rule) {
      if (rule.allOf) {
        return rule.allOf.every(function (req) {
          if (req.kind === 'module') return !!modules[req.id];
          return (achievements[req.id] || 0) >= 1;
        });
      }
      var done = rule.missions.filter(function (id) {
        return missions.indexOf(id) !== -1;
      });
      return done.length >= rule.requiredMissions;
    }).map(function (rule) { return rule.skill; });
  }

  /**
   * Validate a 'qpath:gaps' payload: an array of at most 20 strings, each at
   * most 64 characters, non-string entries dropped. An empty array is VALID
   * (it means "no gaps or no tracked path" and clears the strip). Returns
   * null when the payload itself is unusable; null means "ignore silently".
   */
  function parseGaps(data) {
    var skills = data && data.skills;
    if (!Array.isArray(skills)) return null;
    var clean = [];
    for (var i = 0; i < skills.length; i++) {
      if (typeof skills[i] === 'string' && skills[i].length <= GAPS_MAX_SKILL_LENGTH) {
        clean.push(skills[i]);
      }
      if (clean.length > GAPS_MAX_SKILLS) break;
    }
    if (clean.length > GAPS_MAX_SKILLS) clean = clean.slice(0, GAPS_MAX_SKILLS);
    return clean;
  }

  /**
   * Store the validated gap list and notify path-recs.js. Storage errors are
   * swallowed (same convention as the achievements above): the strip can
   * still update from other sends, and no payload is ever trusted further.
   */
  function handleGapsMessage(data) {
    var skills = parseGaps(data);
    if (!skills) return;
    try {
      localStorage.setItem(GAPS_KEY, JSON.stringify({ skills: skills, at: Date.now() }));
    } catch (err) {
      // Storage may be disabled or full; nothing downstream can read a write
      // that failed, so skip the redraw and wait for the next message.
      return;
    }
    window.dispatchEvent(new window.Event('ananta:gaps-updated'));
  }

  /** The Careers iframe (its contentWindow is the QPath child window). */
  function careersFrame() {
    return document.querySelector('#view-careers iframe');
  }

  /**
   * Post the progress payload to QPath only. Missing iframe (Careers tab not
   * in the DOM yet) simply does nothing; there is no load listener anywhere —
   * the 'qpath:ready' message covers first load and reloads.
   */
  function sendProgress() {
    var frame = careersFrame();
    if (!frame || !frame.contentWindow) return;
    var missions = completedMissions();
    frame.contentWindow.postMessage(
      {
        type: 'ananta:progress',
        version: 1,
        skills: earnedSkills(missions, achievementCounts(), passedModules()),
        missions: missions,
      },
      QPATH_ORIGIN,
    );
  }

  // Inbound: QPath says it can receive progress. Only accept messages from
  // the exact iframe window on the exact QPath origin; ignore everything else.
  // The origin and source checks below are THE shared gate for both inbound
  // message types: 'qpath:ready' (handshake) and 'qpath:gaps' (reverse flow)
  // reuse them rather than duplicating any check.
  window.addEventListener('message', function (event) {
    if (event.origin !== QPATH_ORIGIN) return;
    var frame = careersFrame();
    if (!frame || event.source !== frame.contentWindow) return;
    if (!event.data) return;
    if (event.data.type === 'qpath:gaps') {
      // Version 1 only; unknown versions (future or hostile) are ignored so
      // the stored shape never changes underneath path-recs.js.
      if (event.data.version === 1) handleGapsMessage(event.data);
      return;
    }
    if (event.data.type !== 'qpath:ready') return;
    sendProgress();
  });

  // Ananta emits this after each newly solved mission; resend the current set.
  window.addEventListener('ananta:mission-solved', function () {
    sendProgress();
  });

  // A studio reported a real, checkable success. Only known achievement ids
  // count, so junk or hostile events are harmless. The existing mission
  // listener and 'qpath:ready' handshake are untouched, and achievements are
  // never cleared or reset anywhere.
  window.addEventListener('ananta:achievement', function (event) {
    var id = event && event.detail && event.detail.id;
    if (ACHIEVEMENT_IDS.indexOf(id) === -1) return;
    try {
      var counts = achievementCounts();
      // Cap the stored count to bound storage growth.
      counts[id] = Math.min((counts[id] || 0) + 1, ACHIEVEMENT_COUNT_MAX);
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(counts));
    } catch (err) {
      // Storage may be disabled or full; the learner keeps their progress in
      // memory for this send and retries naturally on the next event.
    }
    sendProgress();
  });

  // topic-roadmap.js fired this after a render verified a passing exercise.
  // Same convention as 'ananta:achievement': only ids that some all-of rule
  // names are stored, storage is never cleared, and progress is re-sent so
  // the second half of the skill's evidence updates QPath immediately.
  window.addEventListener('ananta:module-passed', function (event) {
    var id = event && event.detail && event.detail.id;
    if (MODULE_IDS.indexOf(id) === -1) return;
    try {
      var passed = passedModules();
      passed[id] = true;
      localStorage.setItem(MODULE_KEY, JSON.stringify(passed));
    } catch (err) {
      // Storage may be disabled or full; treated the same way everywhere.
    }
    sendProgress();
  });

  /*
   * Careers dropdown route handling. The five menu items point at QPath
   * pages inside the #view-careers iframe; QPath's router wants a clean
   * path (e.g. /diagnostic), not an Ananta hash. Route changes therefore
   * simply set iframe.src — no extra message types, and Ananta's existing
   * click handler (data-tab="careers") still opens the view because we
   * never preventDefault here. The dropdown does not follow navigation
   * made inside QPath; it only tracks the last route opened from Ananta.
   *
   * Safety: urls are only ever built from this hardcoded allowlist, never
   * from arbitrary DOM input.
   */
  var CAREER_ROUTES = ['/pulse', '/diagnostic', '/paths', '/opportunities', '/method'];

  /** QPath page path last opened from Ananta (used by the hashchange refresh). */
  var lastOpenedRoute = null;

  /**
   * Load a QPath page in the Careers iframe. Routes outside the allowlist
   * are ignored. Always assigns iframe.src, even for the same route: the
   * user may have navigated inside QPath since the last open, and a reload
   * is accepted (the qpath:ready handshake re-sends progress).
   */
  function openCareersRoute(route) {
    if (CAREER_ROUTES.indexOf(route) === -1) return;
    var frame = careersFrame();
    if (!frame) return;
    lastOpenedRoute = route;
    frame.src = QPATH_ORIGIN + route;
  }

  /**
   * Highlight ONLY the careers menu item matching the opened route (desktop
   * and mobile). Ananta's generic code marks all five active because they
   * share data-tab="careers", so clear siblings everywhere before marking.
   */
  function markActiveRoute(route) {
    var items = document.querySelectorAll('[data-careers-route]');
    for (var i = 0; i < items.length; i++) {
      if (items[i].getAttribute('data-careers-route') === route) {
        items[i].classList.add('active');
      } else {
        items[i].classList.remove('active');
      }
    }
  }

  /** True while the Careers view is the visible viewport-section. */
  function careersViewIsActive() {
    return document.querySelector('#view-careers.active');
  }

  // Delegated listener: catches desktop dropdown items and mobile drawer
  // items alike. Ananta's own handler opens the view via data-tab; we only
  // point the iframe at the right QPath page and then (after that handler
  // ran) fix up the active highlighting that would otherwise mark all five.
  document.addEventListener('click', function (event) {
    var target = event.target;
    while (target && target !== document.body) {
      if (target.hasAttribute && target.hasAttribute('data-careers-route')) {
        openCareersRoute(target.getAttribute('data-careers-route'));
        setTimeout(function () {
          if (lastOpenedRoute && careersViewIsActive()) {
            markActiveRoute(lastOpenedRoute);
          }
        }, 0);
        break;
      }
      target = target.parentNode;
    }
  });

  // Keep the highlight consistent on back/forward: re-mark the last opened
  // route when Careers is the active view; otherwise do nothing.
  window.addEventListener('hashchange', function () {
    if (lastOpenedRoute && careersViewIsActive()) {
      setTimeout(function () {
        if (lastOpenedRoute && careersViewIsActive()) {
          markActiveRoute(lastOpenedRoute);
        }
      }, 0);
    }
  });
})();
