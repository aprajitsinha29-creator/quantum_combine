// Tests for the Ananta → QPath handoff data layer: the strict payload parser
// and the read-merge-write import (union PUT, no loss of existing skills,
// cache/invalidate mirroring useSaveDeclaredSkills). apiClient and the skills
// api module are mocked the way SkillPicker.test.tsx mocks them: no fetch.
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileResponse, SkillOut } from '../../types/api';

// ensureProfileId is mocked so POST /profiles never happens and the reported
// profile id is fixed; apiClient is mocked so the fresh GET is recorded.
vi.mock('../../lib/profileId', () => ({ ensureProfileId: vi.fn() }));
vi.mock('../skills/api', () => ({ getSkills: vi.fn(), putDeclaredSkills: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { ensureProfileId } from '../../lib/profileId';
import { apiClient } from '../../lib/apiClient';
import { getSkills, putDeclaredSkills } from '../skills/api';
import { profileQueryKey } from '../skills/hooks/useSkills';
import { importAnantaSkills, parseAnantaProgress } from './importAnantaSkills';

const mockEnsure = vi.mocked(ensureProfileId);
const mockApiGet = vi.mocked(apiClient.get);
const mockGetSkills = vi.mocked(getSkills);
const mockPut = vi.mocked(putDeclaredSkills);

const VOCABULARY: SkillOut[] = [
  {
    id: 'quantum_information',
    name: 'Quantum information',
    aliases: [],
    subfield_ids: [],
  },
  {
    id: 'quantum_mechanics',
    name: 'Quantum mechanics',
    aliases: [],
    subfield_ids: [],
  },
  { id: 'python', name: 'Python', aliases: [], subfield_ids: [] },
];

function profileFixture(declared: string[]): ProfileResponse {
  return {
    profile_id: 'p1',
    created_at: '2026-10-01T00:00:00',
    interests: {},
    declared_skills: declared,
    chosen_path_id: null,
  };
}

let client: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockEnsure.mockResolvedValue('p1');
  mockGetSkills.mockResolvedValue(VOCABULARY);
  // Each GET /profiles/{id} returns the CURRENT server state the callback sets.
  let current: ProfileResponse = profileFixture(['python']);
  mockApiGet.mockImplementation(() => Promise.resolve(current));
  mockPut.mockImplementation((_profileId, skillIds) => {
    current = profileFixture(skillIds);
    return Promise.resolve(current);
  });
});

// --------------------------------------------------------------- parser

describe('parseAnantaProgress', () => {
  const progress = { type: 'ananta:progress', version: 1, skills: ['python'], missions: [1, 4] };

  it('test_accepts_valid_progress_message', () => {
    expect(parseAnantaProgress(progress)).toEqual(['python']);
  });

  it('test_rejects_wrong_message_type', () => {
    expect(parseAnantaProgress({ ...progress, type: 'other' })).toBeNull();
  });

  it('test_rejects_wrong_version', () => {
    expect(parseAnantaProgress({ ...progress, version: 2 })).toBeNull();
  });

  it('test_rejects_non_array_skills', () => {
    expect(parseAnantaProgress({ ...progress, skills: 'python' })).toBeNull();
  });

  it('test_rejects_non_string_skill_entries', () => {
    expect(parseAnantaProgress({ ...progress, skills: [1, 2] })).toBeNull();
  });

  it('test_rejects_more_than_20_skills', () => {
    expect(parseAnantaProgress({ ...progress, skills: Array(21).fill('python') })).toBeNull();
  });

  it('test_rejects_null_undefined_and_primitives', () => {
    expect(parseAnantaProgress(null)).toBeNull();
    expect(parseAnantaProgress(undefined)).toBeNull();
    expect(parseAnantaProgress('ananta:progress')).toBeNull();
    expect(parseAnantaProgress(42)).toBeNull();
  });
});

// ------------------------------------------------------- importAnantaSkills

describe('importAnantaSkills', () => {
  it('test_merges_existing_and_incoming_put_union_existing_first', async () => {
    const added = await importAnantaSkills(client, ['quantum_mechanics']);
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith('p1', ['python', 'quantum_mechanics']);
    expect(added).toEqual(['Quantum mechanics']);
  });

  it('test_no_put_when_incoming_already_declared', async () => {
    const added = await importAnantaSkills(client, ['python']);
    expect(mockPut).not.toHaveBeenCalled();
    expect(added).toEqual([]);
  });

  it('test_no_put_when_all_incoming_are_unknown', async () => {
    const added = await importAnantaSkills(client, ['bogus_skill']);
    expect(mockPut).not.toHaveBeenCalled();
    expect(added).toEqual([]);
  });

  it('test_unknown_ids_filtered_valid_still_imported', async () => {
    const added = await importAnantaSkills(client, ['bogus_skill', 'quantum_information']);
    expect(mockPut).toHaveBeenCalledWith('p1', ['python', 'quantum_information']);
    expect(added).toEqual(['Quantum information']);
  });

  it('test_profile_cache_written_and_opportunities_invalidated', async () => {
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    await importAnantaSkills(client, ['quantum_mechanics']);
    const saved = mockPut.mock.results[0]?.value as Promise<ProfileResponse>;
    await saved.then((value) => expect(client.getQueryData(profileQueryKey('p1'))).toEqual(value));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['opportunities', 'p1'] });
  });

  it('test_ensure_profile_id_runs_before_the_put', async () => {
    await importAnantaSkills(client, ['quantum_mechanics']);
    expect(mockEnsure.mock.invocationCallOrder[0]).toBeLessThan(
      mockPut.mock.invocationCallOrder[0],
    );
  });

  it('test_reuses_seeded_vocabulary_cache_without_refetch', async () => {
    // Production caches the vocabulary for an hour (useSkills staleTime), so
    // the seeded entry is fresh here too — mirroring that keeps fetchQuery on
    // the cached data instead of a refetch.
    const cachedClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    cachedClient.setQueryData(['skills'], VOCABULARY);
    await importAnantaSkills(cachedClient, ['quantum_mechanics']);
    expect(mockGetSkills).not.toHaveBeenCalled();
  });
});
