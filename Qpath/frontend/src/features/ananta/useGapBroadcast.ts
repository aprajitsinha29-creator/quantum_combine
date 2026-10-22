/**
 * useGapBroadcast — the reverse flow: QPath → Ananta skill gaps.
 *
 * While QPath runs inside Ananta's Careers iframe, it tells Ananta which
 * skills the learner's tracked career path asks for (the path's
 * evidence.top_skills, ordered most in-demand first) but the learner has
 * not declared, so Ananta can show a studio recommendation strip. The
 * message is a RECOMMENDATION feed only — Ananta never treats it as proof
 * of a skill.
 *
 * Contract (mirrors careers-bridge.js on the Ananta side):
 *   { type: 'qpath:gaps', version: 1, skills: string[] }
 * posted to window.parent with the exact Ananta origin, never '*'.
 *
 * - Nothing is posted while any input query is still loading: unresolved
 *   data must never look like "no gaps". Once everything has resolved and
 *   no path is tracked (or the paths query 409'd without a diagnostic), an
 *   empty list is posted, which clears Ananta's strip.
 * - Identical lists are not reposted (a JSON snapshot is kept in a ref);
 *   a duplicate post under StrictMode would be harmless anyway because
 *   Ananta stores and re-renders idempotently.
 * - Standalone QPath (window.parent === window) does nothing at all, so
 *   the standalone app is unchanged.
 */

import { useEffect, useRef } from 'react';
import { computeGaps } from './computeGaps';
import { anantaOrigin } from './anantaOrigin';
import { useChosenPath } from '../tracker/hooks/useTracker';
import { usePaths } from '../paths/hooks/usePaths';
import { useProfile } from '../skills/hooks/useSkills';
import { getOrCreateProfileId } from '../../lib/profileId';

/**
 * One post per distinct gap list: derive the list (null until every source
 * query has resolved), then let the effect stringify-diff it against the
 * last posted snapshot. Reads chosen path, ranked paths and declared skills
 * from the same TanStack cache hooks the rest of the app uses, so a path
 * switch or a declared-skill save here immediately re-derives the list.
 */
export function useGapBroadcast(): void {
  const profileId = getOrCreateProfileId();
  const chosenPath = useChosenPath(profileId);
  const paths = usePaths(profileId);
  const profile = useProfile(profileId);
  const lastPostedRef = useRef<string | null>(null);

  // null = inputs not resolved yet (still loading) → post nothing.
  // []  = resolved with no tracked path / no evidence → clear Ananta's strip.
  let gaps: string[] | null = null;
  if (!chosenPath.isPending && !paths.isPending && !profile.isPending) {
    const trackedId = chosenPath.data?.chosen_path_id ?? null;
    if (trackedId && paths.data) {
      const tracked = paths.data.paths.find((path) => path.path_id === trackedId);
      gaps = computeGaps(
        tracked ? tracked.evidence.top_skills : [],
        profile.data?.declared_skills ?? [],
      );
    } else {
      // No tracked path (or paths unavailable): resolved, so the empty
      // list is the honest message ("no gaps or no tracked path").
      gaps = [];
    }
  }

  useEffect(() => {
    // Standalone QPath: no Ananta parent, no broadcast, ever.
    if (window.parent === window) return undefined;
    if (gaps === null) return undefined;

    const listJson = JSON.stringify(gaps);
    if (lastPostedRef.current === listJson) return undefined;
    lastPostedRef.current = listJson;
    window.parent.postMessage({ type: 'qpath:gaps', version: 1, skills: gaps }, anantaOrigin);
    return undefined;
  }, [gaps]);
}
