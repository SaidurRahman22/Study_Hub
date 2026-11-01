/**
 * Resolve a path in `client/public` against wherever the app is served from.
 *
 * Vite rewrites asset URLs it can see at build time — the ones in `import`
 * statements and in CSS. It cannot rewrite a string like "/images/x.jpg" that
 * only exists at runtime, so those stay absolute and 404 the moment the site
 * is served from a sub-folder (http://localhost/studyhub/) rather than a
 * domain root. Every runtime reference to a public file goes through here.
 *
 * With the default base this returns the path unchanged.
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${path.replace(/^\/+/, "")}`.replace(/([^:])\/{2,}/g, "$1/");
}
