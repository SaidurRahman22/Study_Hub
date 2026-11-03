/* One place that decides how a Bangladeshi number is written and dialled.
 *
 * WHY THIS EXISTS: the numbers are stored in the CMS in the local form the
 * office writes them in, `01623-935872`. Four components were each rebuilding
 * the dial string inline with their own
 * `.replace(/\D/g, "").replace(/^0/, "")`, and a fifth (the contact page)
 * was not, so one page dialled the local number while the rest dialled the
 * international one.
 *
 * It is deliberately NOT fixed by rewriting the stored values. If the CMS
 * held "+880 1623-935872", every one of those inline `replace(/^0/, "")`
 * calls would leave the 880 in place and then prefix another one, producing
 * tel:+8808801623935872. Store local, present international.
 */

/** Just the digits, with the local trunk 0 dropped. `01623-935872` → `1623935872`. */
function national(raw: string): string {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .replace(/^880/, "") // already international, do not add it twice
    .replace(/^0/, "");
}

/** What a person reads: `+880 1623-935872`. */
export function phoneDisplay(raw: string): string {
  const n = national(raw);
  if (!n) return "";
  // 10 digits after the trunk zero: group as 4 + 6, the way they are written
  // locally, so the number still looks familiar with the country code on it.
  const grouped = n.length === 10 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
  return `+880 ${grouped}`;
}

/** What a phone dials: `tel:+8801623935872`, no spaces or dashes. */
export function phoneHref(raw: string): string {
  const n = national(raw);
  return n ? `tel:+880${n}` : "";
}
