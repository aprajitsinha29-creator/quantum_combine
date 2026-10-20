// Tests for the Ananta handshake hook: it posts qpath:ready only when QPath
// runs inside a parent window, accepts ananta:progress only from the exact
// Ananta origin AND window, serializes imports through
// importAnantaSkills (mocked here), and does nothing when QPath is opened
// standalone (window.parent === window, the jsdom default).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The import routine is mocked so no HTTP happens and imports are observable
// as plain calls; the REAL payload parser and effect wiring run.
vi.mock('./importAnantaSkills', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./importAnantaSkills')>()),
  importAnantaSkills: vi.fn(),
}));

import { importAnantaSkills } from './importAnantaSkills';
import { useAnantaBridge } from './useAnantaBridge';

const mockImport = vi.mocked(importAnantaSkills);

const ANANTA_ORIGIN = 'http://localhost:5500';
const PROGRESS = { type: 'ananta:progress', version: 1, skills: ['quantum_mechanics'], missions: [1] };

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

let parentWasStubbed = false;

// window.parent is a jsdom accessor; note when it was redefined and restore a
// plain parent-to-window property afterwards so the standalone (default)
// behaviour is intact for every other test.
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

function renderBridge(client: QueryClient) {
  return renderHook(() => useAnantaBridge(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

/** Window-source MessageEvent; source coerced because jsdom accepts any here. */
function messageFrom(
  origin: string,
  source: unknown,
  data: unknown,
): MessageEvent {
  const event = new MessageEvent('message', { origin, data });
  Object.defineProperty(event, 'source', { value: source });
  return event;
}

describe('useAnantaBridge', () => {
  it('test_posts_ready_to_parent_with_ananta_origin', () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    renderBridge(makeClient());
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: 'qpath:ready' },
      ANANTA_ORIGIN,
    );
  });

  it('test_valid_message_triggers_one_import_and_sets_names', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    mockImport.mockResolvedValue(['Quantum mechanics']);
    const { result } = renderBridge(makeClient());

    act(() => {
      window.dispatchEvent(messageFrom(ANANTA_ORIGIN, window.parent, PROGRESS));
    });

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledTimes(1);
      expect(mockImport).toHaveBeenCalledWith(expect.anything(), ['quantum_mechanics']);
      expect(result.current.imported).toEqual(['Quantum mechanics']);
    });
  });

  it('test_message_from_wrong_origin_or_source_is_ignored', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    mockImport.mockResolvedValue([]);
    renderBridge(makeClient());

    act(() => {
      window.dispatchEvent(messageFrom('http://evil.test', window.parent, PROGRESS));
      window.dispatchEvent(messageFrom(ANANTA_ORIGIN, {}, PROGRESS));
    });

    // Let microtasks settle: no import may have been queued.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('test_dismiss_clears_imported_names', async () => {
    const parent = { postMessage: vi.fn() };
    stubParent(parent as Partial<Window>);
    mockImport.mockResolvedValue(['Quantum information']);
    const { result } = renderBridge(makeClient());

    act(() => {
      window.dispatchEvent(messageFrom(ANANTA_ORIGIN, window.parent, PROGRESS));
    });
    await waitFor(() => expect(result.current.imported).not.toEqual([]));

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.imported).toEqual([]);
  });

  it('test_standalone_window_posts_nothing_and_listens_not', async () => {
    // Default jsdom: window.parent === window. Spy postMessage on both windows.
    const postSpy = vi.spyOn(window, 'postMessage');
    mockImport.mockResolvedValue([]);
    renderBridge(makeClient());

    act(() => {
      window.dispatchEvent(messageFrom(ANANTA_ORIGIN, window, PROGRESS));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(postSpy).not.toHaveBeenCalled();
    expect(mockImport).not.toHaveBeenCalled();
  });
});
