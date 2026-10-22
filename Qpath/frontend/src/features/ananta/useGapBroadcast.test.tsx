// Tests for the reverse-flow broadcast hook: it posts the gap list to the
// Ananta parent with the exact origin, updates when declared skills shrink
// the list, never reposts an identical list, posts [] once no tracked path
// remains, stays silent while data is loading, and does nothing standalone.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The three source hooks are mocked so no HTTP happens and each test controls
// loading state, the tracked path and declared skills directly; the REAL
// computeGaps runs (pure, no mocks needed).
vi.mock('../tracker/hooks/useTracker', () => ({
  useChosenPath: vi.fn(),
}));
vi.mock('../paths/hooks/usePaths', () => ({
  usePaths: vi.fn(),
}));
vi.mock('../skills/hooks/useSkills', () => ({
  useProfile: vi.fn(),
}));

import { useChosenPath } from '../tracker/hooks/useTracker';
import { usePaths } from '../paths/hooks/usePaths';
import { useProfile } from '../skills/hooks/useSkills';
import { useGapBroadcast } from './useGapBroadcast';
import type {
  ChosenPathResponse,
  PathResult,
  PathSkillShare,
  PathsOut,
  ProfileResponse,
} from '../../types/api';

const ANANTA_ORIGIN = 'http://localhost:5500';

const mockChosenPath = vi.mocked(useChosenPath);
const mockPaths = vi.mocked(usePaths);
const mockProfile = vi.mocked(useProfile);

/**
 * Build a query-state object with only the flags the broadcast hook reads,
 * cast to the real hook return type (UseQueryResult has ~20 more fields the
 * hook never touches; mocking them all would be test-only noise).
 */
function gateState<TData, TError>(opts: {
  data?: TData;
  isPending: boolean;
  isError?: boolean;
}): UseQueryResult<TData, TError> {
  return opts as unknown as UseQueryResult<TData, TError>;
}

const TRACKED: ChosenPathResponse = { profile_id: 'p1', chosen_path_id: 'qec_engineer' };

/** The paths query's error shape (HTTP status + code) when used as a type. */
type PathsError = { status: number; message: string };

function pathResult(topSkillIds: string[]): PathResult {
  const topSkills: PathSkillShare[] = topSkillIds.map((skill_id) => ({
    skill_id,
    name: skill_id,
    share: 0.5,
    share_pct: 50,
  }));
  return {
    path_id: 'qec_engineer',
    title: 'QEC Engineer',
    subfield_id: 'qec',
    rank: 1,
    score: 80,
    breakdown: { interest: 80, demand: 80, readiness: 80, weights: {} },
    is_top3: true,
    low_data: false,
    saturated: false,
    evidence: {
      active_postings: 10,
      internship_postings: 1,
      top_skills: topSkills,
      phd_share: null,
      phd_share_pct: null,
      sample_postings: [],
    },
    explanation: null,
  };
}

function pathsOut(path: PathResult): PathsOut {
  return {
    profile_id: 'p1',
    assessment_id: 1,
    region: 'global',
    saturation_note: null,
    paths: [path],
  };
}

function profileOut(declaredSkills: string[]): ProfileResponse {
  return {
    profile_id: 'p1',
    created_at: '2026-10-01T00:00:00',
    interests: {},
    declared_skills: declaredSkills,
    chosen_path_id: 'qec_engineer',
  };
}

/** Everything resolved: path qec_engineer tracked, given top skills/declared. */
function mockResolved(topSkillIds: string[], declaredSkills: string[]) {
  mockChosenPath.mockReturnValue(
    gateState<ChosenPathResponse, Error>({ data: TRACKED, isPending: false }),
  );
  mockPaths.mockReturnValue(
    gateState<PathsOut, PathsError>({
      data: pathsOut(pathResult(topSkillIds)),
      isPending: false,
    }),
  );
  mockProfile.mockReturnValue(
    gateState<ProfileResponse, Error>({ data: profileOut(declaredSkills), isPending: false }),
  );
}

function resolvedWithoutTrackedPath() {
  mockChosenPath.mockReturnValue(
    gateState<ChosenPathResponse, Error>({
      data: { profile_id: 'p1', chosen_path_id: null },
      isPending: false,
    }),
  );
  // No diagnostic yet: the paths query 409s (error, no data).
  mockPaths.mockReturnValue(gateState<PathsOut, PathsError>({ isPending: false, isError: true }));
  mockProfile.mockReturnValue(
    gateState<ProfileResponse, Error>({ data: profileOut([]), isPending: false }),
  );
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

let parentWasStubbed = false;

beforeEach(() => {
  vi.clearAllMocks();
  parentWasStubbed = false;
});

afterEach(() => {
  if (parentWasStubbed) {
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
    parentWasStubbed = false;
  }
});

function stubParent(value: Partial<Window>): void {
  Object.defineProperty(window, 'parent', { configurable: true, value });
  parentWasStubbed = true;
}

function renderBroadcast(client: QueryClient) {
  return renderHook(() => useGapBroadcast(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

function lastPostedSkillList(): string[] {
  const parent = window.parent as unknown as { postMessage: ReturnType<typeof vi.fn> };
  const calls = parent.postMessage.mock.calls as [
    { type: string; version: number; skills: string[] },
    string,
  ][];
  const last = calls[calls.length - 1];
  expect(last[1]).toBe(ANANTA_ORIGIN);
  expect(last[0].type).toBe('qpath:gaps');
  expect(last[0].version).toBe(1);
  return last[0].skills;
}

describe('useGapBroadcast', () => {
  it('posts the gap list to the parent with the exact Ananta origin', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    mockResolved(['surface_codes', 'qiskit'], ['qiskit']);

    renderBroadcast(makeClient());
    await waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));
    expect(lastPostedSkillList()).toEqual(['surface_codes']);
  });

  it('reposts when declared skills change so the list shrinks', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    mockResolved(['surface_codes', 'qiskit'], []);

    const { rerender } = renderBroadcast(makeClient());
    await waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));
    expect(lastPostedSkillList()).toEqual(['surface_codes', 'qiskit']);

    // The learner declares surface_codes in QPath → list shrinks.
    mockResolved(['surface_codes', 'qiskit'], ['surface_codes']);
    rerender();
    await waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(2));
    expect(lastPostedSkillList()).toEqual(['qiskit']);
  });

  it('does not repost an identical list on unrelated re-renders', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    mockResolved(['surface_codes'], []);

    const { rerender } = renderBroadcast(makeClient());
    await waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));

    // Several re-renders with unchanged inputs: identical list, no repost.
    rerender();
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
  });

  it('posts [] once resolved and no path is tracked (clears the strip)', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    resolvedWithoutTrackedPath();

    renderBroadcast(makeClient());
    await waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));
    expect(lastPostedSkillList()).toEqual([]);
  });

  it('posts nothing while any source query is still loading', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    // Paths still pending although chosen path and profile resolved.
    mockChosenPath.mockReturnValue(
      gateState<ChosenPathResponse, Error>({ data: TRACKED, isPending: false }),
    );
    mockPaths.mockReturnValue(gateState<PathsOut, PathsError>({ isPending: true }));
    mockProfile.mockReturnValue(
      gateState<ProfileResponse, Error>({ data: profileOut([]), isPending: false }),
    );

    const { rerender } = renderBroadcast(makeClient());
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(parent.postMessage).not.toHaveBeenCalled();

    // Resolving the last query releases exactly one post.
    mockResolved(['surface_codes'], []);
    rerender();
    await waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));
    expect(lastPostedSkillList()).toEqual(['surface_codes']);
  });

  it('does nothing when window.parent === window (standalone)', async () => {
    // Default jsdom: window.parent === window; spy to prove silence.
    const postSpy = vi.spyOn(window, 'postMessage');
    mockResolved(['surface_codes'], []);

    const { rerender } = renderBroadcast(makeClient());
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(postSpy).not.toHaveBeenCalled();
    postSpy.mockRestore();
  });
});
