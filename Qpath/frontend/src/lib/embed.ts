/**
 * Embedded-QPath detection (Ananta Careers iframe).
 *
 * QPath renders inside Ananta's #view-careers <iframe> as an embedded page:
 * the shell drops its own header, nav and footer there because Ananta's
 * navigation bar is the only navigation the user sees. Detection is the
 * standard parent-window check; the typeof guard keeps the module importable
 * in non-browser environments (unit tests, SSR tooling).
 *
 * Deliberately a function (evaluated per call, not module load) so callers
 * render-time decisions are live and tests can stub window.parent first.
 */

/** True when this window has a distinct parent window, i.e. runs in an iframe. */
export function isEmbedded(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}
