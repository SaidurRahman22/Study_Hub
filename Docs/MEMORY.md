# StudyHub BD — Project Memory

> **Purpose:** The single file to read at the start of any future session on this project.
> It holds everything established about StudyHub BD as of **2026-10-31**: what it is, how
> it is built, what is wrong with it, what to fix, and the traps to avoid.
> **Keep this updated as work lands.** Full detail lives in
> [`ASSESSMENT.md`](./ASSESSMENT.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
> [`REMEDIATION-PLAN.md`](./REMEDIATION-PLAN.md).

---

## 1. One-paragraph orientation

StudyHub BD is a **marketing and lead-generation website for a Bangladeshi study-abroad
consultancy** (IELTS prep, Japanese language/JLPT, university admission and visa support).
It is a React 19 + Vite SPA on Vercel with 7 serverless functions. **There is no database**
— a single JSON file in a GitHub repo is the datastore, and every content edit is a commit
that triggers a full site rebuild. Content is edited through a hand-written HTML admin
panel. The project started from a "Manus" scaffold and still carries its residue. Current
state: structurally simple and readable, but **not production-safe** — 5 Critical findings,
and the contact form does not work at all.

---

## 2. Project facts

| | |
|---|---|
| Root | `D:\project\StudyHub` |
| Git | **Not a git repo right now** — history was stripped (see `CLEAN_PUSH_INSTRUCTIONS.txt`) |
| Package manager | npm (`package-lock.json`); build uses `--legacy-peer-deps` |
| Node entry | `npm run dev` (Vite, port 3000), `npm run build`, `npm run check` (tsc) |
| Deploy | Vercel — static `dist/public` + `api/**` serverless functions |
| Public routes | `/`, `/about`, `/services`, `/destinations`, `/ielts`, `/japanese`, `/success-stories`, `/contact`, 404 catch-all |
| Admin | `/admin` (HTTP Basic → `admin/panel.html`) and `/admin.html` (**public, must be deleted**) |
| Env vars | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN` |
| Brand | Golden `#D4AF37`, dark golden `#B8860B`, black `#1A1A1A`, off-white `#FFFEF9` |
| Fonts | Playfair Display (headings), Inter (body) — loaded via CSS `@import` |
| Languages | English + Bengali **mixed inside the same content fields** (no i18n structure) |
| Contact | `studyhubbd2023@gmail.com`, WhatsApp `01623935872` |
| Real lead path | A **Google Form** (`forms.gle`) in `global.registrationLink` — leads live outside this system |

### Size

| Area | Size |
|---|---|
| Client source | ~8,300 LOC (of which **6,189 is unused `components/ui/`**) |
| Pages | 1,241 LOC across 9 files |
| API | 536 LOC, plain ESM JS, **not type-checked** |
| Admin panels | 1,246 lines (`admin/panel.html`) + 409 lines (`client/public/admin.html`) |
| Content | 24.8 KB JSON, 601 nodes, depth 5, 14 top-level sections |
| Tests | **0** |

---

## 3. Architecture in five lines

1. **Read path:** visitor loads the SPA → it renders a *build-time copy* of the content
   bundled into the JS → then fetches `/api/content`, which reads the JSON from GitHub
   with a PAT, and swaps it in. Content therefore exists in three places that drift.
2. **Write path:** admin panel → `/api/admin/content` (PUT) → GitHub Contents API commit →
   Vercel rebuild (1–3 min) → new static site.
3. **Auth:** one shared password → an 8-hour hand-rolled HS256 JWT in `localStorage` →
   `/api/admin/*` → a GitHub PAT with **write access to the whole repo**.
4. **The PAT can write `api/**`, and a repo write auto-deploys.** So the admin password is
   effectively a production remote-code-execution credential.
5. **No database, no SSR, no tests, no staging, no monitoring, no backups.**

See `ARCHITECTURE.md` for the Mermaid diagrams of all of this.

---

## 4. The five things that matter most

| # | Finding | Where | Status |
|---|---|---|---|
| 1 | **Path traversal in image delete** — `startsWith` check passes, then `new URL()` collapses `..` and the request hits a different GitHub path. **Reproduced with a PoC.** Lets an admin token delete any repo file, or reach other GitHub REST endpoints with the PAT. | `api/admin/images.js:67`, `api/_lib/github.js:88` | ❌ open |
| 2 | **Stored XSS** — all CMS text goes through `dangerouslySetInnerHTML` unsanitised, at 49 sites. Steals the admin token from `localStorage` → repo write → RCE. | `client/src/components/RichText.tsx:12` | ❌ open |
| 3 | **`/admin.html` is a public second admin panel**, bypassing the Basic-auth gate on `/admin`, with no HTML escaping and no security headers. | `client/public/admin.html` | ❌ open |
| 4 | **Admin password = production RCE** (design) — PAT writes to `api/**`, which auto-deploys. | `api/_lib/github.js` | ❌ open |
| 5 | **The contact form does not work.** No `onSubmit`, no `name` attrs, no endpoint. Native GET submit reloads the page and discards the enquiry. **Every lead since launch has been lost silently.** | `client/src/pages/Contact.tsx:87-145` | ❌ open |
| 6 | **The Contact page's phone/email/address can never be edited.** `Contact.tsx` renders `content.contact.*`; both admin panels only write `content.global.*`. Changing the phone number updates the header, footer and WhatsApp button — **and not the Contact page.** Verified: zero matches for `c.contact.phone1/email/address/website` in either panel's save routine. | `Contact.tsx:34,44,45,56,69,175` vs `admin/panel.html:918-923` | ❌ open |

Full list: 6 Critical, 20 High, 27 Medium, 14 Low — see `ASSESSMENT.md`.

---

## 5. Traps — read before touching code

These will bite anyone who does not know them.

- **`client/public/` is deployed verbatim.** Anything placed there is public with no auth.
  This is how `/admin.html` became an unauthenticated admin panel.
- **`SiteContent` is `typeof defaultContent`** — the type is *inferred from the JSON file*,
  so content shape drift is invisible to TypeScript and the API response is cast
  unchecked. Changing a key in `site-content.json` can crash the site at runtime.
- **The content JSON is imported at build time AND fetched at runtime.** After an admin
  save, `/api/content` is fresh but the bundled fallback is one build stale. If
  `/api/content` fails, the site silently serves stale content with no error anywhere.
- **HTML inside content is intentional.** `admin/panel.html:609` is a `contenteditable`
  WYSIWYG using `document.execCommand`. Do not "fix" `RichText` by switching to plain
  text globally — sanitise instead, and convert only the genuinely-plain fields.
- **`api/**` is plain JavaScript and is excluded from typechecking.** `tsconfig.json`
  includes `server/**/*`, which does not exist.
- **`config.api.bodyParser` in `api/admin/upload.js:76` is a Next.js convention and is
  inert on Vercel's Node runtime.** The real body cap is ~4.5 MB, so the 5 MB check never
  fires.
- **Any `VITE_`-prefixed env var is inlined into the public JS bundle.** `vite.config.ts`
  sets `envDir` to the repo root, widening that surface.
- **`vercel.json` has no SPA fallback rewrite.** Deep links such as `/ielts` may 404 —
  **verify this against the live site first** (ASSESSMENT OPS-07). It would be the single
  largest SEO problem if true.
- **The GitHub `sha` is an optimistic lock.** A stale `sha` surfaces to the admin as an
  opaque 500, not a useful conflict message.
- **A content file over 1 MB bricks the CMS.** GitHub returns an empty body with
  `encoding: "none"`, `JSON.parse('')` throws, and the admin can no longer read or repair
  the file through the UI. The panel's raw-JSON textarea makes this one bad paste away.
- **The CMS only covers ~80% of the rendered text.** Not editable anywhere in the admin:
  the whole `services[12]` array, `ielts`/`japanese.courseFeatures[4]`, several section
  titles, all of `footer.*` (including the rendered copyright), and the `contact.*`
  details. Assume a field is *not* editable until you find its form input.
- **`id` fields are meaningless.** They are positional indices (`String(idx+1)`)
  re-derived from DOM order on every save, and only locally unique — `"1"` appears in 13
  arrays. Never build a deep link, analytics event or foreign key on them.
- **Some arrays are read by hard-coded index.** `IELTS.tsx`/`Japanese.tsx` render
  `courseFeatures[0]`–`[3]` individually; the array must contain exactly 4 items or the
  page renders `undefined`. `Services.tsx:10` maps icons positionally with
  `icons[index % icons.length]`, so a 13th service silently reuses the first icon.
- **A save conflict strands the editor.** A stale `sha` returns 409, which surfaces as an
  opaque HTTP 500, and `state.sha` is never refreshed — every later save also fails. The
  only recovery is a reload, which discards unsaved work. Conflict granularity is the
  whole document, so two editors on unrelated pages collide.
- **`GITHUB_BRANCH` and Vercel's production branch are configured independently.** If they
  diverge, the site appears to update (the runtime fetch wins) while the deployed bundle
  never changes — and silently reverts the day `/api/content` fails.
- **`api/admin-panel.js` reads `panel.html` via `process.cwd()`.** Vercel traces function
  files by static analysis, so this is not guaranteed to be bundled. It can ENOENT after a
  runtime update and take the admin panel offline.

---

## 6. Dead code and template residue

The project was scaffolded from a "Manus" template. Unused, safe to delete:

| Item | Note |
|---|---|
| `client/src/components/Map.tsx` | Google Maps loader proxying `forge.butterfly-effect.dev`; reads `VITE_FRONTEND_FORGE_API_KEY` |
| `client/src/components/ManusDialog.tsx` | — |
| `client/src/const.ts` | `getLoginUrl()` for a non-existent OAuth portal |
| `shared/const.ts` | `COOKIE_NAME`, `ONE_YEAR_MS` — unused |
| `hooks/useMobile.tsx`, `usePersistFn.ts`, `useComposition.ts` | unused |
| **49 of 53 `components/ui/*`** | only `button`, `card`, `sonner`, `tooltip` are used |
| `vite-plugin-manus-runtime`, `allowedHosts: [*.manus*.computer]` | `vite.config.ts` |
| `@assets` alias → `attached_assets/` | directory does not exist |
| `studyhubbdwadmin-main.zip` (470 KB) | **audited:** byte-identical to the tree, no `.git`, no `.env`, no secrets. Pure bloat |
| Unused deps | `framer-motion`, `axios`, `zod`*, `streamdown`†, `nanoid`, `add` (junk), `pnpm` (devDep while the build uses npm), ~25 Radix packages |

\* `zod` is installed and unused — **use it** for the content schema rather than removing it.
† `streamdown` is unused but transitively pulls mermaid, katex, shiki and the whole
unified/remark stack, inflating every Vercel build.

**`--legacy-peer-deps` exists for exactly one reason:** `lucide-react@0.453.0`'s React peer
range covers `^19.0.0-rc` but not stable `^19.0.0`. It is the only dependency in the
lockfile that excludes React 19 stable. Bump it to ≥0.460.0 and the flag can go — it
currently disables peer checking for *every* package.

---

## 7. Content gotchas (`content/site-content.json`)

- Line 246: `destinations[0].image` holds a **Bing search results page URL**. Dormant
  today — `Destinations.tsx:39` renders only `country.flag` (an emoji), never `.image` —
  but it breaks the moment destination imagery is wired up. The other 9 are `""`.
- Lines 409–449: all five "student success story" photos are **Unsplash stock models**,
  two of them duplicated. Trust and advertising-standards risk.
- Line 399: a story photo hotlinks `i.ibb.co.com`.
- 9 `"image": ""` empty fields.
- Line 721: `mapEmbedUrl` is **fabricated** — null place ID `0x0:0x0`, rounded coords,
  placeholder `v=1234567890`. Shows a generic area, not the office.
- All four `socialMedia` links are `"#"`. Footer "Privacy Policy" / "Terms" are `"#"` too.
- `copyrightYear: "2024"` is editable but **rendered nowhere**; the copyright that *is*
  rendered is `footer.copyrightText` ("© 2024 …"), which is **not editable**.
- `contact.phone1/email/address` duplicate `global.*` — see trap #6 above, they have
  already drifted beyond the editor's reach.
- **~10% of the store is inert:** 44 of ~471 leaf values are `""`, plus 4 `"#"` links.
  Always-empty fields: `destinations[*].universities`, `destinations[*].students`,
  `successStories[*].program`, `successStories[*].year`, both `ctaButton`s.
- **Referential integrity is free text:** `successStories[2].country = "Malaysia"`, but
  Malaysia is not one of the 10 destinations — almost certainly a typo for Malta.
- **Derived counts are frozen literals:** `destinationsPage.heroSubtitle` says "Explore 10
  countries"; the `500+`/`10+`/`50+` stats live in 4 places, one of them hardcoded in
  `SuccessStories.tsx:12-14`.
- **Nothing marks which fields are rich text.** ~30 go through `RichText`; the rest render
  as plain text. There is no metadata distinguishing them.
- **Zero Bengali on the public site** — one Bengali sentence exists in the whole repo, in
  the admin panel. Playfair Display and Inter ship no Bengali glyphs, so adding Bengali
  also needs a font (Noto Sans Bengali / Hind Siliguri).
- Collection items mostly lack `id`/`slug`/`order`. No draft/publish split — **saving
  publishes to production immediately**.
- `index.html:20-23` loads Umami with unset env vars, so it requests the literal
  `%VITE_ANALYTICS_ENDPOINT%/umami`. **No analytics are being collected.**

---

## 8. Accessibility baseline

- `maximum-scale=1` in the viewport meta **blocks pinch-zoom** (WCAG 1.4.4).
- **Golden `#D4AF37` on white measures 2.1:1** — fails AA (needs 4.5:1). Used in 60
  places via `text-golden`. White text on the golden gradient is also 2.1:1.
  **Black on golden is 8.3:1 and passes** — that is the pattern to standardise on.
  Recommended body/link token: `--golden-text: #8A6D0B` (≈5.4:1).
- Form labels not associated with inputs; icon-only buttons have no `aria-label`;
  mobile menu has no `aria-expanded`; infinite animations have no `prefers-reduced-motion`
  guard; no skip link; heading levels skip.

---

## 9. What is genuinely good — keep it

- Password comparison is constant-time in both `login.js` and `admin-panel.js`.
- Every `/api/admin/*` handler calls `requireAuth` first — no missing authz checks.
- GitHub `sha` gives real optimistic locking.
- `rel="noopener noreferrer"` is applied consistently on every `target="_blank"`.
- Pages are cleanly data-driven from one context — swapping the CMS backend touches
  `CmsContext.tsx`, not nine page files.
- `strict: true` is on and not bypassed with `any` outside `ui/`.
- Clean, SEO-friendly route slugs and a working 404 catch-all.
- `.env` is correctly gitignored; **no secrets were found anywhere in the tree or the zip**.

---

## 10. Plan at a glance

| Phase | What | Duration |
|---|---|---|
| **P0** | Rotate secrets · delete `/admin.html` · fix path traversal · verify deep links · fix/remove the contact form · point `Contact.tsx` at `global.*` · cache `/api/content` | 1–2 days |
| **P1** | DOMPurify + zod schema + `safeUrl` · security headers · auth hardening · upload hardening · SEO · accessibility · content integrity · CI gate · monitoring | 1–2 weeks |
| **P2** | Choose a data platform (**recommended: Supabase/Postgres**) · move to SSG/Next.js · delete dead code · rebuild the admin panel in React | 3–4 weeks |
| **P3** | Lead capture + CRM · WhatsApp integration · payments · booking · blog · EN/BN i18n · course finder · student document portal | ongoing |

**Non-negotiable ordering:** P0 before anything. P1.1 (sanitising + schema) before any
content work. P2.1 (data platform) before any P3 feature — every roadmap feature needs
per-user storage that does not exist today. The student document portal handles passports
and must not start before P1 is complete.

---

## 11. Open questions for the owner

1. Is the site live? At what domain? (Needed for OPS-07/08/09 verification.)
2. Is the `GITHUB_TOKEN` a classic PAT with full `repo` scope, or fine-grained?
3. Are `ADMIN_PASSWORD` / `JWT_SECRET` in Vercel still the `.env.example` placeholders?
4. Was a PAT ever committed before the history was stripped?
5. How many people edit content, and do they need separate logins?
6. Where should leads actually go — email, WhatsApp, a CRM, a spreadsheet?
7. Is there budget for a managed database/CMS (~$25/mo), or must it stay free?
8. Are the "success story" students real, and is there written consent for their photos?
9. Is a Bengali/English toggle required, or is mixed-language copy acceptable?
10. Is there a logo source file? The current `logo.png` is 260 KB for a 64 px display.

---

## 12. Changelog

| Date | Change |
|---|---|
| 2026-10-31 | Initial full assessment. 49 findings documented. No code changed — analysis only. `Docs/` created with `ASSESSMENT.md`, `ARCHITECTURE.md`, `REMEDIATION-PLAN.md`, `MEMORY.md`. |
