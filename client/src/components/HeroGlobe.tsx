import { useCallback, useEffect, useRef, useState } from "react";

import type { InteractiveApi } from "@/lib/hero/interactive";
import "@/lib/hero/interactive.css";
import { HERO_DESTINATIONS, HERO_ORIGIN } from "@/lib/hero/destinations";

declare global {
  interface Window {
    /** Read once by the scene at mount; it must be set before mountInteractive. */
    __HERO_CONFIG__?: Record<string, unknown>;
    /** Set by the Play control: overrides the scene's soft fallbacks. */
    __HERO_FORCE_MOTION__?: boolean;
  }
}

/** Everything the scene's config layer reads. Every field is validated on
 *  the other side; a bad one falls back on its own and warns by name. */
function buildHeroConfig(): Record<string, unknown> {
  return {
    brand: { name: "Study Hub BD" },
    theme: {
      // navy land and the land-side walls
      primary: "#15466B",
      // gold: the origin pin, the active arc and the travelling pulse
      accent: "#C9A227",
      // The hero's navy field. The scene derives its sky, its ocean and the
      // destination card's ground from this, so interactive.css carries the
      // DARK ink set to pair with it (see the note at the top of that file).
      neutral: "#0F1A2E",
      lane: "clay",
    },
    /**
     * The scene derives the ocean tone from `neutral`, so a pure-white
     * neutral gives a near-white sea and the globe reads washed out.
     * A hair of cool grey puts the ocean back without opening a seam
     * against the page, which the stage's three-edge mask feathers anyway.
     */
    quality: {
      // Off by default, which renders a still frame with a Play button on
      // anything under 768px, i.e. no drag and no click-to-name on a
      // phone. "Not interactive" was the complaint, so it is on. The
      // scene's own frame-time probe still tears the canvas down and falls
      // back if a device cannot hold the budget.
      mobileVideoOnly: false,
    },
    origin: {
      label: HERO_ORIGIN.label,
      lat: HERO_ORIGIN.lat,
      lon: HERO_ORIGIN.lon,
    },
    // the same array the page renders as its no-JS list; the scene ignores
    // the `city` field, which is not in its schema
    destinations: HERO_DESTINATIONS,
    /**
     * The client watched the five-second default and said the loop "looks
     * very fast". Every idle animation in this scene is a pure function of
     * `u = (elapsed % loopSeconds) / loopSeconds`, so lengthening the loop
     * slows all of them at once without retiming anything by hand.
     *
     * Each value is inside the schema's own range (idleDelaySeconds 0.5-12,
     * loopSeconds 2-12, parallaxStrength 0-2), so none of them is clamped.
     */
    motion: {
      // the globe settles back to the composed shot sooner after a touch
      idleDelaySeconds: 2.5,
      // 5s -> 9s: the same choreography, at a little over half the speed
      loopSeconds: 9,
      // scales every tuning value rather than replacing them, so the
      // pointer drift and the camera sway are calmer without going dead
      parallaxStrength: 0.6,
    },
  };
}

/**
 * The hero globe: a turnable, clickable Earth with flight arcs from Tangail
 * to the ten destinations, orbiting study props, and a card for whatever
 * pin you pick.
 *
 * The scene itself is `lib/hero/interactive.js`, loaded by dynamic import so
 * three.js and the engine code-split out of the main bundle. Nothing heavy
 * renders here -- this component is the stage markup the scene queries, and
 * if the import or the start-up fails the stage is left empty and the page's
 * own copy carries the hero.
 */
export default function HeroGlobe() {
  const rootRef = useRef<HTMLDivElement>(null);
  /**
   * Mount and teardown are serialised through this chain, and that is load
   * bearing rather than tidiness. Both passes of a StrictMode double-invoke
   * share one set of DOM nodes, and the scene's teardown clears the pin list
   * it rendered into `#pinList`. Let the second mount start before the first
   * has finished tearing down and the first one's cleanup wipes the second
   * one's buttons -- leaving a working globe with no keyboard parity, which
   * nothing reports as an error. The same race is there on any real remount.
   */
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  /**
   * The scene turns itself into a single still frame (no loop, and not even
   * the pointer listeners) whenever `prefers-reduced-motion` is set, Data
   * Saver is on, the browser reports under 4 GB of memory, or the viewport
   * is under the mobile breakpoint. On Windows that first one is the "Show
   * animation effects" switch in Settings, which is commonly off; the result
   * looks identical to a hero that was never built. When that happens we say
   * so, and offer to play it anyway.
   */
  const [fellBack, setFellBack] = useState(false);
  const [forced, setForced] = useState(false);
  /** Why the scene is not running, in words, when it is not running. The old
   *  behaviour was a console line and an empty box, which is
   *  indistinguishable from a hero that was never built. */
  const [failure, setFailure] = useState<string | null>(null);

  const play = useCallback(() => {
    window.__HERO_FORCE_MOTION__ = true;
    setFellBack(false);
    setForced(true); // changes the effect key, so the scene is torn down and rebuilt
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // `ignore` covers the other window: cleanup landing while the import or
    // the mount is still in flight. Whatever finishes after that destroys
    // itself rather than leaking a WebGL context.
    let ignore = false;
    let api: InteractiveApi | null = null;

    const started = chainRef.current.then(async () => {
      if (ignore) return;
      try {
        // set before the scene reads it, which it does once, at mount
        window.__HERO_CONFIG__ = buildHeroConfig();

        const { mountInteractive } = await import("@/lib/hero/interactive.js");
        const mounted = await mountInteractive(root);

        if (ignore) {
          mounted.destroy();
          return;
        }
        api = mounted;

        // `running` is false when the scene took the still-frame path. WebGL2
        // is checked separately: if the browser genuinely cannot render, there
        // is nothing to offer and the control would be a lie.
        const stillOnly = mounted.stats?.running === false;
        const canRender =
          typeof document !== "undefined" &&
          !!document.createElement("canvas").getContext("webgl2");
        // `data-mode="video"` means the scene gave up on the canvas entirely.
        // There is no exported video in this build, so that leaves a blank box.
        const gaveUp = root.querySelector("#stage")?.getAttribute("data-mode") === "video";

        if (ignore) return;
        setFellBack(stillOnly && canRender && !gaveUp);
        setFailure(
          !canRender
            ? "This browser has no WebGL2, so the globe cannot be drawn. It is usually hardware acceleration being switched off. In Chrome, Settings → System → “Use graphics acceleration when available”."
            : gaveUp
              ? "The scene stopped before it could draw. Open the console: the reason is logged there, prefixed [hero]."
              : null,
        );
      } catch (err) {
        // Never throw into React, and never fail silently either: an empty
        // box looks exactly like a hero that was never built.
        console.error("[HeroGlobe] the scene did not start:", err);
        if (!ignore) {
          setFailure(
            `The 3D scene failed to load: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    });
    chainRef.current = started;

    return () => {
      ignore = true;
      chainRef.current = started.then(() => {
        api?.destroy();
        api = null;
      });
    };
  }, [forced]);

  return (
    /* The key is what makes Play work. Teardown calls `forceContextLoss()`,
       which kills the WebGL context on that canvas element for good; reusing
       the same <canvas> on the remount hands the new renderer a dead context
       and it throws on `precision`. Changing the key makes React build a
       fresh subtree, so the second scene gets a canvas of its own. */
    <div
      className="globe-stage"
      ref={rootRef}
      key={forced ? "forced" : "auto"}
      data-forced-motion={forced ? "true" : undefined}
    >
      <div className="stage" id="stage" data-mode="canvas">
        <video
          id="heroVideo"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <canvas id="heroCanvas" aria-hidden="true" />
        <div className="scrim" />
        <ul className="pinlist" id="pinList" aria-label="Destinations shown on the globe" />
        {/* Clicking the globe names what is under the pointer. The name is
            drawn in the scene, where it can ride the sphere; this is the
            same answer for anyone who is not looking at the canvas. */}
        <p className="vh" id="globeReadout" role="status" aria-live="polite" />
      </div>

      {fellBack && (
        <button type="button" className="globe-play" onClick={play}>
          <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
            <path d="M1 1.5v15l14-7.5z" fill="currentColor" />
          </svg>
          Play the animation
        </button>
      )}

      {failure && (
        <p className="globe-failure" role="status">
          {failure}
        </p>
      )}

      <aside className="destcard" id="destCard" aria-live="polite" data-open="false">
        <button className="close" id="destClose" type="button" aria-label="Close">
          &times;
        </button>
        <h2 id="destCardTitle" />
        <p id="destCardBody" />
        <a className="btn" id="destCardCta" href="/destinations" />
      </aside>
    </div>
  );
}
