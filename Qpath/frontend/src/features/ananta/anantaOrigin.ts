/**
 * The one Ananta origin QPath talks to when embedded in Ananta's Careers
 * iframe: every postMessage targetOrigin and every inbound origin check is
 * pinned to it (never '*'). Override with VITE_ANANTA_ORIGIN if the local
 * ports move. Shared by useAnantaBridge (handshake + progress import) and
 * useGapBroadcast (reverse flow), so the two hooks cannot diverge.
 */
export const anantaOrigin =
  (import.meta.env.VITE_ANANTA_ORIGIN as string | undefined) || 'http://localhost:5500';
