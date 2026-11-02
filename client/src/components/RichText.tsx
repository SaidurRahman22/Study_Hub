import { createElement, useMemo, type ElementType } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

/* Renders a piece of editable content as HTML, so an editor can bold a word
 * or add a line break.
 *
 * Everything that reaches dangerouslySetInnerHTML goes through sanitizeHtml
 * first. Without that, one <img src=x onerror=...> saved into any CMS field
 * would run in every visitor's browser. See client/src/lib/sanitize.ts for
 * what survives the filter and why the allowlist is as small as it is. */

type RichTextProps = {
  text?: string;
  as?: ElementType;
  className?: string;
};

export default function RichText({ text = "", as = "span", className }: RichTextProps) {
  // Sanitising walks the string through a DOM parse, so keep the result for
  // as long as the input is unchanged rather than redoing it every render.
  const clean = useMemo(() => sanitizeHtml(text), [text]);

  return createElement(as, {
    className,
    dangerouslySetInnerHTML: { __html: clean },
  });
}
