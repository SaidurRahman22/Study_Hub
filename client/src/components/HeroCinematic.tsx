import { useCallback, useEffect, useRef, useState } from "react";

import type { CinematicApi } from "@/lib/hero/cinematic";
import "@/lib/hero/cinematic.css";
import { HERO_DESTINATIONS, HERO_ORIGIN } from "@/lib/hero/destinations";

declare global {
  interface Window {
    /** Read once by the scene at mount; it must be set before mountCinematic. */
    __HERO_CONFIG__?: Record<string, unknown>;
    /** Set by the Play control: overrides the scene's soft fallbacks. */
    __HERO_FORCE_MOTION__?: boolean;
  }
}

export interface HeroCinematicProps {
  /**
   * The page's real call-to-action, which the demo cursor walks to and
   * hovers. An attribute, not a class: classes churn with every CSS
   * refactor and the cursor would silently start aiming at nothing.
   */
  ctaSelector?: string;
}

const DEFAULT_CTA_SELECTOR = "[data-hero-cta]";

/** Everything the scene's config layer reads. Every field is validated on
 *  the other side; a bad one falls back on its own and warns by name. */
function buildHeroConfig(ctaSelector: string): Record<string, unknown> {
  return {
    brand: { name: "Study Hub BD" },
    theme: {
      primary: "#15466B",
      accent: "#C9A227",
      // the page's ivory ground, so the canvas and the page are one surface
      neutral: "#FFFFFF",
      lane: "clay",
    },
    origin: {
      label: HERO_ORIGIN.label,
      lat: HERO_ORIGIN.lat,
      lon: HERO_ORIGIN.lon,
    },
    // the same array the page renders as its no-JS list; the scene ignores
    // the `city` field, which is not in its schema
    destinations: HERO_DESTINATIONS,
    cursor: { enabled: true, mode: "hover", targetSelector: ctaSelector },
    cinematic: { enabled: true },
  };
}

/**
 * The hero cinematic: a ten-second, six-beat loop that hands the same scene
 * graph to an interactive globe the moment anyone touches it.
 *
 * The scene itself is `lib/hero/cinematic.js`, loaded by dynamic import so
 * three.js and the ~270 KB engine code-split out of the main bundle. Nothing
 * heavy renders here -- this component is the stage markup the scene queries,
 * and if the import or the start-up fails the stage is simply left empty and
 * the page's own copy carries the hero.
 */
export default function HeroCinematic({ ctaSelector = DEFAULT_CTA_SELECTOR }: HeroCinematicProps) {
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
   * Saver is on, or the browser reports under 4 GB of memory. On Windows that
   * first one is the "Show animation effects" switch in Settings, which is
   * commonly off; the result looks identical to a hero that was never built.
   * When that happens we say so, and offer to play it anyway.
   */
  const [fellBack, setFellBack] = useState(false);
  const [forced, setForced] = useState(false);
  /** Why the scene is not running, in words, when it is not running. The old
   *  behaviour was a console line and an empty black box, which is
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
    let api: CinematicApi | null = null;

    const started = chainRef.current.then(async () => {
      if (ignore) return;
      try {
        // set before the scene reads it, which it does once, at mount
        window.__HERO_CONFIG__ = buildHeroConfig(ctaSelector);

        const { mountCinematic } = await import("@/lib/hero/cinematic.js");
        const mounted = await mountCinematic(root);

        if (ignore) {
          mounted.destroy();
          return;
        }
        api = mounted;

        // Start the loop at Explore, not at Open. The six beats open on a
        // closed laptop and the globe does not finish rising until 2.6s,
        // so for the first two and a half seconds the hero's one large
        // shape is a desk, which is not what this section is for. Jumping
        // in at Explore puts the globe up on the first frame; the loop then
        // runs on through Travel, Click and Collapse and comes back round
        // to the laptop, so nothing is lost but the wait.
        mounted.jumpToBeat?.("explore");

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
              ? "The scene stopped before it could draw. Open the console: the reason is logged there, prefixed [cinematic]."
              : null,
        );
      } catch (err) {
        // Never throw into React, and never fail silently either: an empty
        // black box looks exactly like a hero that was never built.
        console.error("[HeroCinematic] the scene did not start:", err);
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
  }, [ctaSelector, forced]);

  return (
    /* The key is what makes Play work. Teardown calls `forceContextLoss()`,
       which kills the WebGL context on that canvas element for good; reusing
       the same <canvas> on the remount hands the new renderer a dead context
       and it throws on `precision`. Changing the key makes React build a
       fresh subtree, so the second scene gets a canvas of its own. */
    <div
      className="cine-stage"
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
        {/* The demo cursor is decoration over a demonstration; a screen
            reader is told nothing about it, and it never takes focus. */}
        <div className="demo-cursor" id="demoCursor" aria-hidden="true">
          <span className="trail" />
          <span className="ring" />
          <span className="dot" />
        </div>
      </div>

      {fellBack && (
        <button type="button" className="cine-play" onClick={play}>
          <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
            <path d="M1 1.5v15l14-7.5z" fill="currentColor" />
          </svg>
          Play the animation
        </button>
      )}

      {failure && (
        <p className="cine-failure" role="status">
          {failure}
        </p>
      )}

      <ol className="beatbar" id="beatBar" aria-hidden="true" />

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
