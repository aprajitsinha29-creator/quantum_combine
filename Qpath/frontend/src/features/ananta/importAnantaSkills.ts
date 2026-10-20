/**
 * Ananta → QPath skill import (Tier 2 handoff).
 *
 * The Ananta learning app (the parent page, http://localhost:5500) posts
 * { type: 'ananta:progress', version: 1, skills, missions } into this app
 * when it runs inside the Careers iframe. This module is the data layer for
 * that handoff: a defensive parser for the untrusted message payload and the
 * read-merge-write sequence that adds earned skill ids to the learner's
 * declared skills without losing anything already declared.
 *
 * Honest limit: only two skills (quantum_mechanics, quantum_information) are
 * reachable from Ananta's missions, so this is a real but small handoff.
 *
 * No React here — useAnantaBridge owns the event wiring; the backend owns
 * the profile. All HTTP goes through the feature api / apiClient as usual.
 */

import type { QueryClient } from '@tanstack/react-query';
import { ensureProfileId } from '../../lib/profileId';
import type { ProfileResponse } from '../../types/api';
import { opportunitiesPrefixKey } from '../tracker/hooks/useTracker';
import { getSkills, putDeclaredSkills } from '../skills/api';
import { profileQueryKey } from '../skills/hooks/useSkills';
import { apiClient } from '../../lib/apiClient';

/** The one message shape accepted from Ananta; anything else is ignored. */
export interface AnantaProgress {
  skills: string[];
}

/**
 * Validate the untrusted message data and return its skill ids.
 *
 * Accepts ONLY an exact 'ananta:progress' / version 1 message whose `skills`
 * is an array of at most 20 strings (strings only, no coercion; duplicate
 * ids are tolerated and deduplicated later by the union). Returns null for
 * every other shape — wrong type/version, non-array skills, non-string
 * entries, oversized arrays, and null/undefined/primitives.
 */
export function parseAnantaProgress(data: unknown): string[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.type !== 'ananta:progress') return null;
  if (record.version !== 1) return null;
  if (!Array.isArray(record.skills)) return null;
  if (record.skills.length > 20) return null;
  if (!record.skills.every((id) => typeof id === 'string')) return null;
  return record.skills;
}

/**
 * Add the incoming skill ids to the learner's declared skills.
 *
 * 1. ensureProfileId first: PUT returns 404 for an unknown profile, so the
 *    profile must exist (POST /profiles is idempotent) before any PUT.
 * 2. The vocabulary is fetched through the same ['skills'] query key
 *    useSkills caches, so the seeded list is reused, not refetched. Incoming
 *    ids not in it are dropped — the backend would reject the whole PUT with
 *    422 invalid_skills otherwise.
 * 3. The CURRENT profile is read fresh from GET /profiles/{id}; the cached
 *    copy can be stale and a union against stale data could drop skills.
 * 4. New ids are the filtered incoming ids minus the declared ones. With
 *    none, nothing is sent and [] is returned (idempotent repeats are free).
 * 5. putDeclaredSkills REPLACES the whole list, so the PUT body is the union
 *    of the existing declared skills and the new ids; existing order is
 *    preserved and new ids are appended.
 * 6. On success the profile query cache is written with the returned
 *    profile and the opportunities feed prefix invalidated — exactly what
 *    useSaveDeclaredSkills does — so Paths and Opportunities update without
 *    a reload.
 *
 * @returns the vocabulary display names of the skills newly added ([] when
 *   nothing changed). Errors propagate; the caller handles them.
 */
export async function importAnantaSkills(
  queryClient: QueryClient,
  incomingIds: string[],
): Promise<string[]> {
  const profileId = await ensureProfileId();

  const vocabulary = await queryClient.fetchQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });
  const vocabularyIds = new Set(vocabulary.map((skill) => skill.id));
  const knownIncoming = incomingIds.filter((id) => vocabularyIds.has(id));

  // Fresh, not cached: the PUT would silently drop skills declared after the
  // cache was filled if the union were computed against stale data.
  const profile = await apiClient.get<ProfileResponse>(
    `/profiles/${encodeURIComponent(profileId)}`,
  );
  const declared = new Set(profile.declared_skills);
  const newIds: string[] = [];
  for (const id of knownIncoming) {
    if (!declared.has(id) && !newIds.includes(id)) {
      newIds.push(id);
    }
  }

  if (newIds.length === 0) {
    return [];
  }

  // PUT replaces the whole list: existing skills first (order preserved),
  // then the newly earned ones appended.
  const saved = await putDeclaredSkills(profileId, [...profile.declared_skills, ...newIds]);

  // Mirror useSaveDeclaredSkills so Paths/Opportunities stay in lockstep.
  queryClient.setQueryData<ProfileResponse>(profileQueryKey(profileId), saved);
  void queryClient.invalidateQueries({
    queryKey: opportunitiesPrefixKey(profileId),
  });

  const nameById = new Map(vocabulary.map((skill) => [skill.id, skill.name]));
  return newIds.map((id) => nameById.get(id) ?? id);
}
