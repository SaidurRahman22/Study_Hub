import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Cookie } from "lucide-react";
import {
  getConsent,
  needsConsent,
  setConsent,
  NON_ESSENTIAL,
} from "@/lib/consent";

/* ====================================================================== *
 *  The banner.                                                           *
 *                                                                        *
 *  Two shapes, depending on what the site actually does:                 *
 *                                                                        *
 *  NOTICE  (today) nothing non-essential is loaded, so there is nothing  *
 *          to consent to. One line, one "Got it", and a link to the      *
 *          full notice. Dismissing it is remembered.                     *
 *                                                                        *
 *  CONSENT (the moment anything is added to NON_ESSENTIAL) Accept and    *
 *          Reject, same size, same weight, same prominence. A reject     *
 *          that is harder to find than an accept is not a free choice,   *
 *          and regulators read it that way.                              *
 *                                                                        *
 *  It is not a modal. It does not trap focus or block the page, because  *
 *  access to the site must not depend on answering it.                   *
 * ====================================================================== */

const DISMISSED_KEY = "shb_cookie_notice_seen";

function seenNotice(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberNotice() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    /* a banner that cannot be remembered simply shows again */
  }
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const asksConsent = needsConsent();

  useEffect(() => {
    // Decide after mount: localStorage is not available during SSR or a
    // prerender, and reading it during render would be a side effect.
    setShow(asksConsent ? getConsent() === null : !seenNotice());
  }, [asksConsent]);

  // Re-show if the visitor clears their choice from the cookie page.
  useEffect(() => {
    const onChange = () => {
      if (asksConsent) setShow(getConsent() === null);
    };
    window.addEventListener("shb:consent", onChange);
    return () => window.removeEventListener("shb:consent", onChange);
  }, [asksConsent]);

  /* The notice is fixed to the bottom of the viewport, so on its own it lies
   * on top of whatever the page's last screen happens to be — which is how
   * it ended up covering a heading. Measure it and have the page reserve
   * exactly that much room underneath instead. Re-measured on resize,
   * because the text wraps to two or three lines on a phone. */
  useEffect(() => {
    if (!show) return;
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      document.body.dataset.cookieOpen = "1";
      document.body.style.setProperty("--cookie-h", `${el.offsetHeight}px`);
    };
    apply();

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
      delete document.body.dataset.cookieOpen;
      document.body.style.removeProperty("--cookie-h");
    };
  }, [show]);

  if (!show) return null;

  const close = () => setShow(false);

  const acceptAll = () => {
    setConsent({ analytics: true, marketing: true });
    close();
  };
  const rejectAll = () => {
    setConsent({ analytics: false, marketing: false });
    close();
  };
  const gotIt = () => {
    rememberNotice();
    close();
  };

  return (
    <div
      className="lp-cookie"
      role="region"
      aria-label={asksConsent ? "Cookie consent" : "Cookie notice"}
      ref={ref}
    >
      <div className="lp-cookie-inner">
        <Cookie size={18} aria-hidden="true" className="lp-cookie-mark" />

        <div className="lp-cookie-text">
          {asksConsent ? (
            <p>
              We would like to use {NON_ESSENTIAL.map(s => s.name).join(", ")}{" "}
              to understand how this site is used. It only loads if you say yes.
              Essential storage, such as staying signed in, works either way.{" "}
              <Link href="/cookies" className="lp-link">
                What we store
              </Link>
            </p>
          ) : (
            <p>
              This site sets no tracking cookies. It keeps your sign-in and your
              theme choice on your own device, and nothing else.{" "}
              <Link href="/cookies" className="lp-link">
                What we store
              </Link>
            </p>
          )}
        </div>

        <div className="lp-cookie-actions">
          {asksConsent ? (
            <>
              {/* Identical styling on purpose. Reject has to be as easy
                  and as visible as accept, and a gold accept beside a
                  plain reject is exactly the nudge regulators read as a
                  dark pattern. Same size, same weight, same one click. */}
              <button
                type="button"
                className="lp-btn lp-btn-quiet"
                onClick={rejectAll}
              >
                Reject
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-quiet"
                onClick={acceptAll}
              >
                Accept
              </button>
            </>
          ) : (
            <button type="button" className="lp-btn" onClick={gotIt}>
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
