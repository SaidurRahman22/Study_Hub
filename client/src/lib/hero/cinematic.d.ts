/**
 * Types for `cinematic.js`, which is a verbatim port of a 6,000-line untyped
 * scene module and stays plain JavaScript. Only the surface the React
 * component touches is declared; the rest of `api` is reachable but untyped.
 */

/** The scene's public api, as returned by `mountCinematic`. */
export interface CinematicApi {
  /** Tear the scene down: stop the loop, drop every listener, free the GL
   *  context and strip every class the demo cursor applied. Idempotent. */
  destroy(): void;
  /** Start the render loop, if it is stopped. */
  start(): void;
  /** Stop the render loop without tearing anything down. */
  stop(): void;
  /** Hold the timeline at `t` seconds, or pass null to let it run again. */
  scrub(t: number | null): number | null;
  /** Jump to the start of a named beat; returns the time, or null. */
  jumpToBeat(key: string): number | null;
  /** Apply one validated config change by dotted path. */
  applyChange(path: string, value: unknown): void;
  readonly config: Record<string, unknown>;
  readonly tier: string;
  readonly beats: Record<string, { start: number; dur: number }> | null;
  readonly state: {
    mode: string;
    beat: string;
    t: number;
    cineMix: number;
    blend: number;
    scrubbing: boolean;
  };
  readonly stats: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Build the cinematic inside `root` and start it.
 *
 * `root` must already contain the scene DOM: `#stage`, `#heroVideo`,
 * `#heroCanvas`, `.scrim`, `#pinList`, `#globeReadout`, `#demoCursor`,
 * `#destCard` and `#beatBar`. Every lookup the scene makes is scoped to
 * `root`, so more than one instance can live on one page.
 *
 * It reads `window.__HERO_CONFIG__` once, at mount, so set that first.
 * It resolves after the scene has started (or after it has fallen back to
 * the video/still path); it does not reject -- a start-up failure is logged
 * and the stage is left on its fallback.
 */
export function mountCinematic(root: HTMLElement): Promise<CinematicApi>;
