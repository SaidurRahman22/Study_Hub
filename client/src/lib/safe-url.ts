/* Guards for URLs that come from editable content or from the API.
 *
 * WHY: a link destination is a script sink. `javascript:` in an href runs on
 * click, and in an iframe `src` it runs on render, in this page's own origin,
 * with access to everything the signed-in visitor has. Sanitising HTML does
 * not help here, because these values never pass through an HTML parser: they
 * go straight into a React attribute.
 *
 * Both functions fail closed. They return undefined rather than something
 * patched up, so a bad value renders a link that goes nowhere or no frame at
 * all, which is a visible, harmless failure.
 */

/* Schemes that are safe to put in an href. A value with no scheme at all,
 * like "/student/documents" or "#section", is a same-page destination and is
 * fine; the test below only rejects a scheme that is present and not allowed. */
const SAFE_SCHEME = /^(https?|mailto|tel):/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Clean a link destination. Returns undefined if it is not safe to follow. */
export function safeHref(url?: string | null): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Control characters are how "java\nscript:" gets past a naive check.
  // eslint-disable-next-line no-control-regex
  const clean = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");

  if (HAS_SCHEME.test(clean) && !SAFE_SCHEME.test(clean)) return undefined;

  // A protocol-relative URL (//evil.example) inherits the page's scheme and
  // leaves the site without looking like it does.
  if (clean.startsWith("//")) return undefined;

  return clean;
}

/* A map embed is narrower still: it is the one value that gets to be an
 * iframe src, so it is matched against the provider rather than merely
 * checked for a safe scheme. Anything else renders no frame. */
const MAP_EMBED = /^https:\/\/(www\.)?google\.com\/maps\/embed(\?|\/)/i;

/** Clean a map embed URL. Returns undefined if it is not a Google Maps embed. */
export function safeMapEmbed(url?: string | null): string | undefined {
  if (!url) return undefined;
  const clean = url.trim();

  return MAP_EMBED.test(clean) ? clean : undefined;
}
