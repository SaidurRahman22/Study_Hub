/* ====================================================================== *
 *  COOKIE AND STORAGE CONSENT                                            *
 *                                                                        *
 *  The site sets no tracking cookies today. It keeps two things in the   *
 *  browser's local storage, both strictly necessary: the student portal  *
 *  sign-in flag and the theme preference. Neither identifies anyone to   *
 *  us and neither leaves the device.                                     *
 *                                                                        *
 *  So the banner below is a NOTICE today, not a consent request. Asking  *
 *  for consent you do not need is its own compliance problem: it trains  *
 *  people to click through, and regulators treat a pointless banner as a *
 *  dark pattern rather than a safeguard.                                 *
 *                                                                        *
 *  The moment a non-essential service is added, flip it on in            *
 *  `NON_ESSENTIAL` below. The banner then becomes a real consent gate    *
 *  with equally weighted Accept and Reject, and `mayLoad()` returns      *
 *  false until the visitor has actively accepted. Nothing in the app     *
 *  should ever load a third-party script without asking `mayLoad` first. *
 * ====================================================================== */

export type ConsentCategory = "analytics" | "marketing";

export type ConsentState = {
  /** schema version, so an old stored choice can be re-asked if the
   *  categories change */
  v: number;
  at: string;
  analytics: boolean;
  marketing: boolean;
};

const KEY = "shb_consent";
const VERSION = 1;

/**
 * Non-essential services the site actually uses. EMPTY ON PURPOSE.
 *
 * Add an entry here, and only here, when a tracker is introduced, for
 * example:
 *   { category: "analytics", name: "Umami", purpose: "page counts" }
 */
export const NON_ESSENTIAL: {
  category: ConsentCategory;
  name: string;
  purpose: string;
}[] = [];

/** True when the site has anything to ask permission for. */
export function needsConsent(): boolean {
  return NON_ESSENTIAL.length > 0;
}

function read(): ConsentState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed?.v !== VERSION) return null;
    return parsed;
  } catch {
    // private windows, blocked storage, or a half-written value
    return null;
  }
}

function write(state: ConsentState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // a choice that cannot be remembered still applies to this visit
  }
}

/** The stored decision, or null if the visitor has not answered. */
export function getConsent(): ConsentState | null {
  return read();
}

export function setConsent(choice: { analytics: boolean; marketing: boolean }) {
  const state: ConsentState = {
    v: VERSION,
    at: new Date().toISOString(),
    analytics: choice.analytics,
    marketing: choice.marketing,
  };
  write(state);
  window.dispatchEvent(new CustomEvent("shb:consent", { detail: state }));
  return state;
}

/** Forget the decision so the banner asks again. Used by the "change your
 *  choice" control on the cookie page. */
export function clearConsent() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  window.dispatchEvent(new CustomEvent("shb:consent", { detail: null }));
}

/**
 * The gate. Call this before loading ANY third-party script.
 *
 * Returns false unless the visitor has actively said yes to that
 * category. No answer means no, which is what "consent" has to mean:
 * silence is not agreement.
 */
export function mayLoad(category: ConsentCategory): boolean {
  const state = read();
  if (!state) return false;
  return state[category] === true;
}

/**
 * Loads a third-party script only once consent exists for its category,
 * and re-checks if the visitor changes their mind later. Returns a
 * function that stops listening.
 *
 * Nothing calls this yet, because nothing third-party is used yet. It is
 * here so that whoever adds analytics has an obvious correct path and no
 * reason to drop a <script> into index.html.
 */
export function loadWhenAllowed(
  category: ConsentCategory,
  load: () => void
): () => void {
  let done = false;
  const attempt = () => {
    if (done || !mayLoad(category)) return;
    done = true;
    load();
  };
  attempt();
  window.addEventListener("shb:consent", attempt);
  return () => window.removeEventListener("shb:consent", attempt);
}
