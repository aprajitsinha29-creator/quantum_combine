/*
 * careers-bridge.js — Tier 2 handoff from Ananta to QPath.
 *
 * When a mission is solved in Ananta, this script posts the completed mission
 * ids and the QPath skill ids they have earned to the QPath app running inside
 * the #view-careers iframe (window.postMessage, cross-origin). QPath replies
 * 'qpath:ready' after mounting and on reloads; this file only READS local
 * progress and SENDS it — it never clears or resets anything.
 *
 * Honest note: four QPath skills are reachable — two via missions and two
 * via achievement events fired by the studio scripts on real successes.
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
  var ACHIEVEMENTS_KEY = 'ananta_achievements_v1';

  // Caps storage growth: a counter can only reach 100, so a runaway event
  // loop cannot bloat localStorage.
  var ACHIEVEMENT_COUNT_MAX = 100;

  /*
   * One declarative rule per QPath skill. A skill is earned once its
   * evidence count reaches the required amount:
   *
   * Missions (ids are the mission numbers used in algorithms.js):
   *   1 coin flip, 4 interference, 6 phase  -> quantum_mechanics
   *   2 Bell, 5 GHZ, 7 W, 8 Grover          -> quantum_information
   * Mission 3 (NOT gate) maps to nothing. Each mission skill needs 2
   * completed missions so it is earned, not given for a single click.
   *
   * Achievements (events fired by studio scripts on real successes):
   *   surface_decode: the surface-code studio's decoder freed the lattice of
   *     defects WITHOUT a logical error and applied >= 2 corrections —
   *     proof the learner actually used the decoder, not a clean click.
   *   vqe_chem_acc: the VQE studio reached chemical accuracy with noise OFF,
   *     once per page load — proof of a converged optimisation run.
   */
  var SKILL_RULES = [
    { skill: 'quantum_mechanics', missions: [1, 4, 6], requiredMissions: 2 },
    { skill: 'quantum_information', missions: [2, 5, 7, 8], requiredMissions: 2 },
    { skill: 'surface_codes', achievement: 'surface_decode', requiredAchievements: 2 },
    { skill: 'variational_algorithms', achievement: 'vqe_chem_acc', requiredAchievements: 1 },
  ];

  // The achievement ids this bridge understands, derived from the rules so
  // there is a single source of truth (junk events are filtered against it).
  var ACHIEVEMENT_IDS = SKILL_RULES
    .filter(function (rule) { return rule.achievement; })
    .map(function (rule) { return rule.achievement; });

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
   * becomes an empty object.
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
   * Skill ids whose evidence (completed missions or achievement counts)
   * has reached the required amount. Pure: same inputs, same outputs.
   */
  function earnedSkills(missions, achievements) {
    return SKILL_RULES.filter(function (rule) {
      if (rule.achievement) {
        return (achievements[rule.achievement] || 0) >= rule.requiredAchievements;
      }
      var done = rule.missions.filter(function (id) {
        return missions.indexOf(id) !== -1;
      });
      return done.length >= rule.requiredMissions;
    }).map(function (rule) { return rule.skill; });
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
        skills: earnedSkills(missions, achievementCounts()),
        missions: missions,
      },
      QPATH_ORIGIN,
    );
  }

  // Inbound: QPath says it can receive progress. Only accept messages from
  // the exact iframe window on the exact QPath origin; ignore everything else.
  window.addEventListener('message', function (event) {
    if (event.origin !== QPATH_ORIGIN) return;
    var frame = careersFrame();
    if (!frame || event.source !== frame.contentWindow) return;
    if (!event.data || event.data.type !== 'qpath:ready') return;
    sendProgress();
  });

  // Ananta emits this after each newly solved mission; resend the current set.
  window.addEventListener('ananta:mission-solved', function () {
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
