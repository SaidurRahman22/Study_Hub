/**
 * Types for `interactive.js`, which is a verbatim port of a 3,700-line untyped
 * scene module and stays plain JavaScript. Only the surface the React
 * component touches is declared; the rest of `api` is reachable but untyped.
 */

/** What `api.stats` reports on every frame it is read. */
export interface InteractiveStats {
  /** The quality tier the capability probe settled on. */
  tier: string;
  /** Draw calls in the last rendered frame. */
  calls: number;
  /** Triangles in the last rendered frame. */
  triangles: number;
  geometries: number;
  textures: number;
  /** Triangles in the extruded Natural Earth crust alone. */
  landTriangles: number;
  /** False when the scene took the still-frame path and never started. */
  running: boolean;
  /** Per-field config warnings, each naming the field that fell back. */
  warnings: string[];
}

/** The scene's public api, as returned by `mountInteractive`. */
export interface InteractiveApi {
  /** Tear the scene down: stop the loop, drop every listener and free the
   *  GL context. Idempotent. */
  destroy(): void;
  /** Start the render loop, if it is stopped. */
  start(): void;
  /** Stop the render loop without tearing anything down. */
  stop(): void;
  /** Apply one validated config change by dotted path. */
  applyChange(path: string, value: unknown): void;
  /** Replace the whole config object, validating it per field. */
  loadConfigObject(obj: unknown): void;
  readonly config: Record<string, unknown>;
  readonly tier: string;
  readonly stats: InteractiveStats;
  [key: string]: unknown;
}

/**
 * Build the interactive globe inside `root` and start it.
 *
 * `root` must already contain the scene DOM: `#stage`, `#heroVideo`,
 * `#heroCanvas`, `.scrim`, `#pinList`, `#globeReadout` and the destination
 * card (`#destCard`, `#destCardTitle`, `#destCardBody`, `#destCardCta`,
 * `#destClose`). Every lookup the scene makes is scoped to `root`, so more
 * than one instance can live on one page.
 *
 * It reads `window.__HERO_CONFIG__` once, at mount, so set that first.
 * It resolves after the scene has started (or after it has fallen back to
 * the video/still path); it does not reject -- a start-up failure is logged
 * and the stage is left on its fallback.
 */
export function mountInteractive(root: HTMLElement): Promise<InteractiveApi>;
