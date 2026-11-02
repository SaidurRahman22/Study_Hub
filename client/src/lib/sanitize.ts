/* Sanitising the HTML the site renders from editable content.
 *
 * WHY THIS EXISTS: several components put CMS text straight into the DOM as
 * HTML so an editor can bold a word or add a line break. That is a script
 * injection waiting to happen the moment anyone who can edit content is not
 * fully trusted, or the content store is tampered with: a single
 * <img src=x onerror=...> in a field would run in every visitor's browser,
 * with their session.
 *
 * The allowlist below is deliberately small. Today's content has no markup in
 * it at all, so nothing here is speculative generosity: it covers the small
 * set of formatting an editor would reasonably reach for, and drops the rest
 * rather than guessing. Widen it only when a real field needs a tag, never
 * "just in case".
 */

import DOMPurify from "dompurify";

/* Inline formatting plus the few block tags a paragraph of copy can need.
 * No <script>, <style>, <iframe>, <object>, <embed>, <form>, <input>, and no
 * <svg> or <math>, which are the usual ways a filter gets walked around. */
const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "mark",
  "small",
  "sub",
  "sup",
  "br",
  "span",
  "p",
  "ul",
  "ol",
  "li",
  "a",
];

/* Only what those tags genuinely need. Note there is no "style": a style
 * attribute can load a URL and can cover the page with a transparent overlay,
 * and no editor here needs one. Event handlers (onclick and friends) are not
 * listed and so are dropped. */
const ALLOWED_ATTR = ["href", "title", "lang", "dir"];

let hooked = false;

/* Links get target and rel added after sanitising. rel="noopener" matters:
 * without it a page opened by target="_blank" can navigate this one away via
 * window.opener, which is a convincing way to fake a sign-in screen. */
function installLinkHook(): void {
  if (hooked) return;
  hooked = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element) || node.tagName !== "A") return;

    const href = node.getAttribute("href") ?? "";

    // Keep ordinary destinations only. DOMPurify already drops javascript:,
    // but an editable field is the wrong place to allow data: or blob: either.
    const safe =
      href.startsWith("/") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("https://") ||
      href.startsWith("http://");

    if (!safe) {
      node.removeAttribute("href");
      return;
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/** Clean a string of editable content for rendering as HTML. */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  // DOMPurify needs a DOM. In a browser there always is one; if this ever
  // runs anywhere else, strip every tag rather than returning it unchecked.
  if (typeof window === "undefined" || typeof window.document === "undefined") {
    return dirty.replace(/<[^>]*>/g, "");
  }

  installLinkHook();

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block anything that tries to escape into a different parser.
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "svg", "math"],
    FORBID_ATTR: ["style", "srcset", "formaction", "xlink:href"],
    // Keep the text of a removed tag, so stripping markup never silently
    // deletes a sentence from the page.
    KEEP_CONTENT: true,
    // No <template>, no shadow DOM tricks.
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    USE_PROFILES: { html: true },
  });
}
