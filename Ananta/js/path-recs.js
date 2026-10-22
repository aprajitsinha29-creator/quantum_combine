/*
 * path-recs.js — QPath → Ananta reverse flow (recommendation strip on Overview).
 *
 * careers-bridge.js stores the skill gaps QPath sends ({skills, at} under the
 * 'ananta_qpath_gaps_v1' localStorage key). This file turns those gap ids into
 * a small "Recommended for your path" strip at the top of the Overview tab,
 * linking to the Ananta studios where the learner can PRACTISE those skills.
 *
 * It is a RECOMMENDATION only: a listed skill is "a skill the tracked career
 * path asks for that you have not yet declared in QPath" — never proof that
 * the learner has any skill or has done anything in a studio.
 *
 * Storage and message payloads are treated as untrusted: everything is type
 * checked and capped, and message-derived strings are only ever placed via
 * createElement + textContent (never innerHTML). The only element attributes
 * built here come from the hardcoded mapping table below, never from storage.
 * No globals are added; everything lives in this IIFE.
 */
(function () {
  'use strict';

  // Written only by careers-bridge.js after validating a 'qpath:gaps' message.
  var STORAGE_KEY = 'ananta_qpath_gaps_v1';

  // The reply fires after a skill is declared or removed in QPath mid-session.
  var UPDATE_EVENT = 'ananta:gaps-updated';

  // At most four studio links keep the strip a strip, not a wall of text.
  var MAX_RECOMMENDATIONS = 4;

  /**
   * THE mapping: QPath skill ids (from Qpath/backend/app/data/skills_vocab.json)
   * → the Ananta tab that genuinely lets a learner practise them. Each group
   * carries a short, verified summary of what the studio really offers:
   *
   * surface-code   rotated planar code builder, X/Z stabilizer visualizer and a
   *                live MWPM decoder the learner runs on their own circuits.
   * pulse-studio   transmon Hamiltonian simulator, DRAG pulse shaping and Rabi
   *                oscillations driven by hands-on sliders.
   * vqe-chemistry  VQE ansatz on Pauli (Jordan-Wigner) terms with a manual
   *                ground-state energy search.
   * transpiler     6-way cross-framework transpiler (Qiskit, Cirq, PennyLane,
   *                OpenQASM 3.0, Braket, PyQuil) with parser + code generation.
   * topic-roadmap  checked, graded curriculum exercises spanning linear algebra,
   *                quantum mechanics and quantum information (Bell/BJP modules).
   *
   * Skills NOT listed here (python, hpc, hardware, PQC, optimization, ...) have
   * no Ananta studio that genuinely practises them and are simply never
   * recommended. Do not add rows without verifying the practice exists.
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
   * Pure: turn raw gap skill ids into strip entries. Ids not in the mapping are
   * dropped, duplicates removed, and the remaining skills grouped one entry per
   * destination tab. Entries keep the order in which any of their skills first
   * appeared (most in-demand first, per the 'qpath:gaps' contract) and the list
   * is capped at 4 entries. Empty/malformed input returns [].
   */
  function recommendationsFor(skillIds) {
    if (!Array.isArray(skillIds)) return [];
    var seenSkills = {};
    var clusters = [];
    var byTab = {};
    for (var i = 0; i < skillIds.length; i++) {
      var id = skillIds[i];
      if (typeof id !== 'string' || seenSkills[id]) continue;
      seenSkills[id] = true;
      var entry = SKILLS_BY_ID[id];
      if (!entry) continue;
      if (!byTab[entry.group.tab]) {
        byTab[entry.group.tab] = {
          tab: entry.group.tab,
          tabLabel: entry.group.tabLabel,
          skills: [],
        };
        clusters.push(byTab[entry.group.tab]);
      }
      byTab[entry.group.tab].skills.push(entry.name);
    }
    return clusters.slice(0, MAX_RECOMMENDATIONS);
  }

  /**
   * Read the validated gaps storage written by careers-bridge.js. Anything
   * malformed (missing, non-JSON, wrong types) counts as empty and never
   * throws; skill ids are filtered to strings so late defence stays local.
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

  /** Build one studio link; label and coverage come from the mapping only. */
  function buildLink(rec) {
    var link = document.createElement('a');
    link.href = '#' + rec.tab;
    link.textContent = rec.tabLabel + ' — ' + rec.skills.join(', ');
    return link;
  }

  /**
   * Render the strip inside #path-recs. Unsafe characters can only end up in
   * text nodes (textContent), never in markup, and the `hidden` attribute plus
   * an explicit display toggle keep the element gone when there is nothing to
   * show (an empty list means "no gaps or no tracked path").
   */
  function render() {
    var container = document.querySelector('#path-recs');
    if (!container) return;
    var recs = recommendationsFor(readGaps());

    while (container.firstChild) container.removeChild(container.firstChild);

    var heading = document.createElement('h3');
    heading.textContent = 'Recommended for your path';
    container.appendChild(heading);

    var intro = document.createElement('p');
    intro.textContent =
      'Based on the career path you are tracking in Careers. These studios let you practise skills it asks for.';
    container.appendChild(intro);

    recs.forEach(function (rec) {
      container.appendChild(buildLink(rec));
    });

    container.hidden = recs.length === 0;
    container.style.display = recs.length === 0 ? 'none' : 'block';
  }

  // The script tag sits at the end of <body> after the #path-recs div, but the
  // full page may still be parsing, so wait for DOMContentLoaded when needed.
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(render);
  window.addEventListener(UPDATE_EVENT, render);
})();
