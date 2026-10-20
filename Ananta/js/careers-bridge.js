/*
 * careers-bridge.js — Tier 2 handoff from Ananta to QPath.
 *
 * When a mission is solved in Ananta, this script posts the completed mission
 * ids and the QPath skill ids they have earned to the QPath app running inside
 * the #view-careers iframe (window.postMessage, cross-origin). QPath replies
 * 'qpath:ready' after mounting and on reloads; this file only READS local
 * progress and SENDS it — it never clears or resets anything.
 *
 * Honest note: only two QPath skills are reachable from Ananta's missions, so
 * this is a real but small handoff. No globals are added; everything lives in
 * this IIFE.
 */
(function () {
  'use strict';

  // The one origin QPath runs on locally; every postMessage and every inbound
  // message check is pinned to it. Never '*' — the two apps share nothing else.
  var QPATH_ORIGIN = 'http://localhost:5173';

  // Mission-progress storage written by MissionManager.markMissionSolved.
  var STORAGE_KEY = 'ananta_completed_missions_v2';

  /*
   * Which missions exercise which QPath skill:
   *   1 coin flip, 4 interference, 6 phase  -> quantum_mechanics
   *   2 Bell, 5 GHZ, 7 W, 8 Grover          -> quantum_information
   * Mission 3 (NOT gate) maps to nothing. A skill needs 2 completed missions
   * so it is earned, not given for a single click.
   */
  var SKILL_MISSIONS = {
    quantum_mechanics: [1, 4, 6],
    quantum_information: [2, 5, 7, 8],
  };
  var MISSIONS_REQUIRED = 2;

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
   * Skill ids whose mission list has at least MISSIONS_REQUIRED ids present
   * in the given missions array.
   */
  function earnedSkills(missions) {
    return Object.keys(SKILL_MISSIONS).filter(function (skill) {
      var needed = SKILL_MISSIONS[skill];
      var done = needed.filter(function (id) {
        return missions.indexOf(id) !== -1;
      });
      return done.length >= MISSIONS_REQUIRED;
    });
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
        skills: earnedSkills(missions),
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
})();
