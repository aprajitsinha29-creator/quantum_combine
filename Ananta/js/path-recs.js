/*
 * path-recs.js — QPath → Ananta reverse flow (gap-suggestion bubble).
 *
 * careers-bridge.js stores the skill gaps QPath sends ({skills, at} under the
 * 'ananta_qpath_gaps_v1' localStorage key). This file turns the FIRST NEW gap
 * skill in each update into a small fixed-position bubble in the upper right
 * corner of the page — on WHICHEVER view the user is on, since the bubble is
 * created on <body>, not inside any view section. The bubble names the topic
 * the learner should study next and, when a studio module for it exists, the
 * module and a button that navigates to it. If no module exists for the
 * recommended topic, only the topic name is shown, without the button.
 *
 * The bubble has a cross that removes it and otherwise hides itself after
 * 1 minute. It is a RECOMMENDATION only: the named skill is "a skill the
 * tracked career path asks for that you have not yet declared in QPath" —
 * never proof that the learner has any skill or has done anything in a studio.
 *
 * Storage and message payloads are treated as untrusted: everything is type
 * checked and capped (by careers-bridge.js), and message-derived strings are
 * only ever placed via createElement + textContent (never innerHTML). All
 * hrefs and labels come from the hardcoded mapping table below, never from
 * storage. No globals are added; everything lives in this IIFE.
 */
(function () {
  'use strict';

  // Written only by careers-bridge.js after validating a 'qpath:gaps' message.
  var STORAGE_KEY = 'ananta_qpath_gaps_v1';

  // Persists the set of skill ids whose bubble has already been shown and
  // dismissed (by cross or auto-hide). A skill in this set will never trigger
  // the bubble again, even after a page reload.
  var DISMISSED_KEY = 'ananta_gap_bubble_dismissed_v1';

  // The reply fires after a skill is declared or removed in QPath mid-session.
  var UPDATE_EVENT = 'ananta:gaps-updated';

  /** One minute of visibility, then the bubble hides itself. */
  var AUTO_HIDE_MS = 60000;

  /**
   * THE mapping: QPath skill ids (from Qpath/backend/app/data/skills_vocab.json)
   * → the Ananta tab (module) that genuinely lets a learner practise them:
   *
   * surface-code   rotated planar code builder, X/Z stabilizer visualizer and a
   *                live MWPM decoder the learner runs on their own circuits.
   * pulse-studio   transmon Hamiltonian simulator, DRAG pulse shaping and Rabi
   *                oscillations driven by hands-on sliders.
   * vqe-chemistry  VQE ansatz on Pauli (Jordan-Wigner) terms with a manual
   *                ground-state energy search.
   * transpiler     6-way cross-framework transpiler (Qiskit, Cirq, PennyLane,
   *                OpenQASM 3.0, Braket, PyQuil) + AI doctor.
   * topic-roadmap  checked, graded curriculum exercises spanning linear algebra,
   *                quantum mechanics and quantum information (Bell/BJP modules).
   *
   * Skills NOT listed here (python, hpc, hardware, PQC, optimization, ...) have
   * no Ananta studio that genuinely practises them: their bubble shows only
   * the topic name, without a module or button. Do not add rows without
   * verifying the practice exists.
   */
  var SKILL_MAP = [
    {
      tab: 'surface-code',
      tabLabel: 'Surface Code Studio',
      skills: [
        { id: 'surface_codes', name: 'Surface codes' },
        { id: 'decoding_algorithms', name: 'Decoding algorithms' },
        { id: 'stabilizer_formalism', name: 'Stabilizer formalism' },
      ],
    },
    {
      tab: 'pulse-studio',
      tabLabel: 'Microwave Pulse Studio',
      skills: [
        { id: 'pulse_control', name: 'Pulse-level control & calibration' },
        { id: 'microwave_rf', name: 'Microwave / RF engineering' },
      ],
    },
    {
      tab: 'vqe-chemistry',
      tabLabel: 'VQE Molecular Chemistry',
      skills: [
        { id: 'variational_algorithms', name: 'Variational algorithms' },
        { id: 'quantum_chemistry', name: 'Quantum chemistry' },
      ],
    },
    {
      tab: 'transpiler',
      tabLabel: 'Universal Transpiler & AI Doctor',
      skills: [
        { id: 'qiskit', name: 'Qiskit' },
        { id: 'cirq', name: 'Cirq' },
        { id: 'pennylane', name: 'PennyLane' },
        { id: 'openqasm', name: 'OpenQASM' },
        { id: 'circuit_compilation', name: 'Circuit compilation & transpilation' },
      ],
    },
    {
      tab: 'topic-roadmap',
      tabLabel: 'Roadmap Studio',
      skills: [
        { id: 'quantum_mechanics', name: 'Quantum mechanics' },
        { id: 'quantum_information', name: 'Quantum information theory' },
        { id: 'linear_algebra', name: 'Linear algebra' },
      ],
    },
  ];

  /** Flat skill-id → { name, group } index over SKILL_MAP (single source). */
  var SKILLS_BY_ID = {};
  SKILL_MAP.forEach(function (group) {
    group.skills.forEach(function (skill) {
      SKILLS_BY_ID[skill.id] = { name: skill.name, group: group };
    });
  });

  /**
   * Read the persisted set of already-dismissed skill ids from localStorage.
   * Returns a plain object keyed by skill id (values are `true`). Malformed
   * or missing storage counts as an empty set and never throws.
   */
  function readDismissed() {
    try {
      var raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) || 'null');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      return raw;
    } catch (err) {
      return {};
    }
  }

  /**
   * Mark a skill id as dismissed so it will never re-show the bubble after a
   * page reload. Storage errors are swallowed: if writing fails the dismissed
   * state is still correct for the current page session (knownSkillIds covers
   * that), so no bubble will pop again during this tab's lifetime.
   */
  function markDismissed(id) {
    try {
      var dismissed = readDismissed();
      dismissed[id] = true;
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    } catch (err) {
      /* storage may be disabled or full; best-effort only */
    }
  }

  // The gap list seen at the previous update; the first id that is NOT in it
  // AND has not been dismissed is "a newly transferred skill" and triggers
  // the bubble. Pre-seeded from localStorage so existing gaps are never
  // treated as new on a page reload.
  var knownSkillIds = readGaps();

  /** Id of the timer hiding the bubble; null when no timer is pending. */
  var hideTimerId = null;

  /** The skill id currently shown in the bubble (null when hidden). */
  var currentSkillId = null;

  /**
   * Read the validated gaps storage written by careers-bridge.js. Anything
   * malformed (missing, non-JSON, wrong types) counts as empty and never
   * throws; skill ids are filtered to strings so late defence stays local.
   * An empty list (no gaps or no tracked path) clears nothing — it simply
   * never matches a fresh skill, so no bubble pops.
   */
  function readGaps() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
      if (!Array.isArray(raw.skills)) return [];
      return raw.skills.filter(function (id) {
        return typeof id === 'string';
      });
    } catch (err) {
      return [];
    }
  }

  /** Build one node with a class and inline styles; text set by the caller. */
  function node(tag, className, styles) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    for (var key in (styles || {})) el.style[key] = styles[key];
    return el;
  }

  var BUBBLE_STYLES = {
    position: 'fixed',
    top: '68px', // below the 56px navigation bar
    right: '16px',
    zIndex: '10000',
    maxWidth: '300px',
    padding: '14px 16px',
    background: 'rgba(13, 15, 26, 0.95)',
    color: '#f2f3f7',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    fontSize: '13px',
    lineHeight: '1.45',
    fontFamily: 'system-ui, sans-serif',
  };

  /**
   * Create (or reuse) the bubble container on <body>, fixed in the upper
   * right corner so it shows on whichever view the user is on. Returns null
   * when <body> is not available yet (the caller then does nothing).
   */
  function ensureBubble() {
    if (!document.body || !document.body.appendChild) return null;
    var bubble = document.querySelector('[data-gap-bubble]');
    if (!bubble) {
      bubble = node('div', 'gap-bubble', BUBBLE_STYLES);
      bubble.setAttribute('data-gap-bubble', '');
      bubble.style.display = 'none';
      document.body.appendChild(bubble);
    }
    return bubble;
  }

  /** Hide the bubble (cross click or the one-minute timer). */
  function hide() {
    if (hideTimerId !== null) {
      clearTimeout(hideTimerId);
      hideTimerId = null;
    }
    var bubble = ensureBubble();
    if (bubble) bubble.style.display = 'none';
    // Persist the dismissal so the bubble won't re-appear after a reload.
    if (currentSkillId !== null) {
      markDismissed(currentSkillId);
      currentSkillId = null;
    }
  }

  /**
   * Rebuild the bubble contents for one recommendation and show it for
   * AUTO_HIDE_MS. `topic` is the display name of the recommended topic,
   * `module` the { tab, tabLabel } of the studio that practises it, or null
   * when no module exists (topic shown without a button). `skillId` is stored
   * so that hide() can persist the dismissal.
   */
  function show(topic, module, skillId) {
    var bubble = ensureBubble();
    if (!bubble) return;

    currentSkillId = skillId || null;

    while (bubble.firstChild) bubble.removeChild(bubble.firstChild);

    // The cross: removes the bubble immediately.
    var cross = node('button', 'gap-bubble-close', {
      position: 'absolute',
      top: '6px',
      right: '8px',
      background: 'transparent',
      color: '#9aa0b4',
      border: '0',
      fontSize: '16px',
      lineHeight: '1',
      cursor: 'pointer',
      padding: '4px',
    });
    cross.setAttribute('aria-label', 'Dismiss');
    cross.textContent = '×';
    cross.onclick = hide;
    bubble.appendChild(cross);

    var title = node('div', 'gap-bubble-title', {
      fontWeight: '600',
      marginBottom: '6px',
      paddingRight: '18px',
    });
    title.textContent = 'Recommended for your path';
    bubble.appendChild(title);

    var topicLine = node('div', 'gap-bubble-topic', { marginBottom: module ? '6px' : '0' });
    topicLine.textContent = 'Next topic: ' + topic;
    bubble.appendChild(topicLine);

    if (module) {
      var moduleLine = node('div', 'gap-bubble-module', { marginBottom: '10px' });
      moduleLine.textContent = 'Module: ' + module.tabLabel;
      bubble.appendChild(moduleLine);

      // The "button": an anchor to the studio tab it practises this topic in.
      var link = node('a', 'gap-bubble-link', {
        display: 'inline-block',
        padding: '6px 12px',
        background: '#2f6bff',
        color: '#ffffff',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: '600',
        cursor: 'pointer',
      });
      link.href = '#' + module.tab;
      link.textContent = 'Open ' + module.tabLabel;
      bubble.appendChild(link);
    }

    bubble.style.display = 'block';

    // Rebroadcasts reset the one-minute window.
    if (hideTimerId !== null) clearTimeout(hideTimerId);
    hideTimerId = setTimeout(hide, AUTO_HIDE_MS);
  }

  /**
   * One bubble per update: the FIRST gap skill that was not in the previous
   * gap list AND has not been dismissed before is the freshly transferred
   * recommendation. It is shown with its module whenever the skill maps to a
   * studio, and topic-only when it does not. With nothing new (repeat list,
   * empty list, or all-dismissed), the bubble is not touched at all — a
   * cross-dismissed bubble stays dismissed across reloads.
   */
  function handleUpdate() {
    var ids = readGaps();
    var dismissed = readDismissed();
    var freshId = null;
    for (var i = 0; i < ids.length; i++) {
      if (knownSkillIds.indexOf(ids[i]) === -1 && !dismissed[ids[i]]) {
        freshId = ids[i];
        break;
      }
    }
    knownSkillIds = ids.slice();
    if (freshId === null) return;

    var entry = SKILLS_BY_ID[freshId];
    show(entry ? entry.name : freshId, entry ? entry.group : null, freshId);
  }

  window.addEventListener(UPDATE_EVENT, handleUpdate);
})();
