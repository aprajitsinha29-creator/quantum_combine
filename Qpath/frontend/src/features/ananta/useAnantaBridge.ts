/**
 * useAnantaBridge — event layer for the Ananta → QPath handoff (Tier 2).
 *
 * Lives in the app shell. When QPath runs inside Ananta's Careers iframe it
 * answers Ananta's 'qpath:ready' handshake with its own 'qpath:ready', then
 * imports the 'ananta:progress' payloads Ananta posts back via
 * importAnantaSkills. When QPath is opened standalone there is no parent
 * window and the hook does nothing at all, so standalone behaviour is
 * unchanged.
 *
 * Failure is contained: a failed import is logged and never breaks the UI,
 * and Ananta's parent owns its own bridge file (careers-bridge.js).
 */

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { importAnantaSkills, parseAnantaProgress } from './importAnantaSkills';

/** Ananta's local origin; override with VITE_ANANTA_ORIGIN if the ports move. */
const anantaOrigin =
  (import.meta.env.VITE_ANANTA_ORIGIN as string | undefined) || 'http://localhost:5500';

/**
 * Create a per-effect promise chain so two progress messages arriving close
 * together cannot race on the read-merge-write in importAnantaSkills (a
 * stale PUT could otherwise drop a newer skill). Every link catches its own
 * error and the chain continues; an import failure must never break QPath.
 */
function appendToChain(chain: Promise<void>, work: () => Promise<void>): Promise<void> {
  return chain.then(work).catch((err: unknown) => {
    console.warn('[ananta bridge] skill import failed:', err);
  });
}

/**
 * Returns { imported, dismiss }: imported holds the display names of the
 * skills freshly imported from the latest 'ananta:progress' message
 * (replaced, not accumulated — an empty list clears, so the notice does not
 * duplicate stale text on reloads), and dismiss hides it.
 */
export function useAnantaBridge(): { imported: string[]; dismiss: () => void } {
  const queryClient = useQueryClient();
  const [imported, setImported] = useState<string[]>([]);
  const dismiss = useCallback(() => setImported([]), []);

  useEffect(() => {
    // Standalone QPath (no Ananta parent): no handshake, no listener.
    if (window.parent === window) {
      return undefined;
    }

    // One serialized chain per effect instance (see appendToChain).
    let chain: Promise<void> = Promise.resolve();

    const handleMessage = (event: MessageEvent) => {
      // Only the exact Ananta parent window on the exact Ananta origin.
      if (event.origin !== anantaOrigin) return;
      if (event.source !== window.parent) return;
      const skills = parseAnantaProgress(event.data);
      if (!skills) return;
      chain = appendToChain(chain, async () => {
        const names = await importAnantaSkills(queryClient, skills);
        if (names.length > 0) {
          setImported(names);
        }
      });
    };

    window.addEventListener('message', handleMessage);
    // Tell Ananta we are listening. StrictMode mounts effects twice in dev;
    // the second trigger only causes a repeat, idempotent import (already
    // declared ids add nothing), so it is harmless.
    window.parent.postMessage({ type: 'qpath:ready' }, anantaOrigin);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [queryClient]);

  return { imported, dismiss };
}
