# StudyHub BD — System Architecture

> **Status:** As-built documentation of the system *as it exists today* (2026-10-31).
> This describes reality, not the target state. For problems found in this architecture
> see [`ASSESSMENT.md`](./ASSESSMENT.md); for the proposed target state see
> [`REMEDIATION-PLAN.md`](./REMEDIATION-PLAN.md).

---

## 1. What this system is

StudyHub BD is a **marketing / lead-generation website for a Bangladeshi study-abroad
consultancy**, with a self-service CMS bolted on so non-technical staff can edit copy.

| Attribute | Value |
|---|---|
| Type | Public marketing SPA + micro-CMS |
| Frontend | React 19 + TypeScript 5.6, Vite 7, Tailwind v4, shadcn/ui (Radix), wouter |
| Backend | 7 Vercel serverless functions, plain ESM JavaScript (no TypeScript) |
| **Database** | **None.** A single JSON file in a GitHub repo is the datastore |
| Hosting | Vercel (static `dist/public` + `/api/*` functions) |
| Auth | One shared admin password; two independent auth mechanisms |
| Public pages | 8 routes + 404 |
| Source size | ~8,300 LOC client (6,189 of it unused `ui/`), 536 LOC API |
| Content size | 24.8 KB JSON, 601 nodes, 5 levels deep, 14 top-level sections |

**The defining architectural decision is that git is the database.** Every content edit
is a GitHub commit, and every commit triggers a full Vercel rebuild of the entire site.
Everything below follows from that choice.

---

## 2. Runtime topology

```mermaid
graph TB
    subgraph Browser["VISITOR BROWSER"]
        SPA["React SPA<br/>dist/public/index.html + JS bundle"]
        BundledJSON["Bundled fallback copy of<br/>site-content.json<br/>baked in at build time"]
        SPA -.->|"import at build"| BundledJSON
    end

    subgraph AdminBrowser["ADMIN BROWSER"]
        PanelA["/admin  to  admin/panel.html<br/>1,246 lines, rich WYSIWYG"]
        PanelB["/admin.html  to  client/public/admin.html<br/>409 lines, legacy, PUBLIC"]
        LS[("localStorage<br/>cms_token")]
        PanelA --> LS
        PanelB --> LS
    end

    subgraph Vercel["VERCEL EDGE + FUNCTIONS"]
        Static["Static assets<br/>dist/public"]
        FnContent["GET /api/content<br/>public, no auth"]
        FnLogin["POST /api/admin/login"]
        FnAdminContent["GET or PUT /api/admin/content"]
        FnImages["GET or DELETE /api/admin/images"]
        FnUpload["POST /api/admin/upload"]
        FnPanel["GET /api/admin-panel<br/>HTTP Basic auth"]
        Lib["_lib/auth.js and _lib/github.js"]
        FnContent --> Lib
        FnLogin --> Lib
        FnAdminContent --> Lib
        FnImages --> Lib
        FnUpload --> Lib
    end

    subgraph GitHub["GITHUB REPO - the actual database"]
        JSON["content/site-content.json"]
        Imgs["client/public/images"]
        Code["ALL SOURCE CODE<br/>api, client, vercel.json"]
    end

    Ext["Third parties<br/>Google Forms, Google Maps embed<br/>Unsplash, i.ibb.co, Bing<br/>Google Fonts, wa.me, Umami"]

    SPA -->|"fetch on mount"| FnContent
    SPA -->|"img/iframe/href"| Ext
    PanelA --> FnLogin & FnAdminContent & FnImages & FnUpload
    PanelB --> FnLogin & FnAdminContent & FnImages & FnUpload
    AdminBrowser --> FnPanel
    Browser --> Static
    Lib -->|"GitHub Contents API<br/>PAT with repo write"| GitHub
    GitHub -->|"push webhook"| Build["Vercel rebuild<br/>full site, every edit"]
    Build --> Static

    style GitHub fill:#fff3cd,stroke:#d4a017,stroke-width:3px
    style Build fill:#f8d7da,stroke:#dc3545,stroke-width:2px
    style PanelB fill:#f8d7da,stroke:#dc3545,stroke-width:2px
```

---

## 3. Component inventory

### 3.1 Serverless functions (`api/`, 536 LOC, plain JS — **not type-checked**)

| Endpoint | File | Auth | Purpose |
|---|---|---|---|
| `GET /api/content` | `api/content.js` | **none (public)** | Reads `site-content.json` via GitHub API, returns JSON |
| `POST /api/admin/login` | `api/admin/login.js` | password | Compares `ADMIN_PASSWORD`, mints an 8-hour HS256 JWT |
| `GET`/`PUT /api/admin/content` | `api/admin/content.js` | Bearer JWT | Read / commit `site-content.json` |
| `GET`/`DELETE /api/admin/images` | `api/admin/images.js` | Bearer JWT | List / delete images in the repo |
| `POST /api/admin/upload` | `api/admin/upload.js` | Bearer JWT | Commit a base64 image to the repo |
| `GET /api/admin-panel` | `api/admin-panel.js` | **HTTP Basic** | Serves `admin/panel.html` |
| *(shared)* | `api/_lib/auth.js` | — | Hand-rolled JWT sign/verify (no library) |
| *(shared)* | `api/_lib/github.js` | — | GitHub Contents API wrapper, holds the PAT |

### 3.2 Frontend (`client/src`)

```
main.tsx
└── App.tsx
    ├── ErrorBoundary              <- renders raw error.stack to end users
    ├── ThemeProvider              <- switchable=false, effectively light-only
    │   └── CmsProvider            <- THE data source for the whole site
    │       └── TooltipProvider
    │           ├── Header         <- nav items HARDCODED, not from CMS
    │           ├── Router         <- wouter Switch, 8 routes + catch-all
    │           ├── Footer
    │           └── WhatsAppButton
    └── Toaster (sonner)
```

| Group | Files | Used? |
|---|---|---|
| Pages | Home, About, Services, Destinations, IELTS, Japanese, SuccessStories, Contact, NotFound | yes — all 9 |
| Components | Header, Footer, WhatsAppButton, RichText, ErrorBoundary | yes |
| Components | `Map.tsx`, `ManusDialog.tsx` | **dead** |
| Contexts | CmsContext, ThemeContext | yes |
| Hooks | `useMobile`, `usePersistFn`, `useComposition` | **dead** |
| Consts | `client/src/const.ts`, `shared/const.ts` | **dead** (template OAuth residue) |
| `components/ui/` | 53 shadcn files, 6,189 LOC | **4 used** (button, card, sonner, tooltip) — 49 dead |

### 3.3 Admin panels — **there are two, and they have diverged**

| | `admin/panel.html` | `client/public/admin.html` |
|---|---|---|
| Reached at | `/admin` (rewrite to `/api/admin-panel`) | `/admin.html` (plain static file) |
| HTTP Basic gate | yes | **no — publicly reachable** |
| Size | 1,246 lines | 409 lines |
| Editor | Full WYSIWYG (`contenteditable` + `execCommand`), structured editors for stats / destinations / stories / testimonials / JLPT levels | Flat form + raw JSON textarea |
| HTML escaping | partial — `xe()` helper, not applied to filenames | none |
| Security headers | `X-Frame-Options: DENY`, `nosniff`, `noindex` | none |

Both talk to the **same** `/api/admin/*` endpoints with the **same** token in
`localStorage`, so the Basic-auth wall on `/admin` protects nothing — `/admin.html`
walks around it.

---

## 4. Data flow — public visitor (read path)

```mermaid
sequenceDiagram
    actor V as Visitor
    participant CDN as Vercel CDN
    participant SPA as React SPA
    participant Fn as /api/content
    participant GH as GitHub API

    V->>CDN: GET /ielts
    CDN-->>V: index.html with EMPTY root div
    Note over V: no SSR - crawlers and<br/>social previews see nothing
    V->>CDN: GET /assets/index-hash.js
    CDN-->>V: bundle INCLUDES a full copy of site-content.json
    SPA->>SPA: render immediately with BUNDLED content
    Note over SPA: first paint = build-time snapshot
    SPA->>Fn: fetch /api/content
    Fn->>GH: GET /repos/owner/repo/contents/content/site-content.json
    Note over Fn,GH: authenticated with the PAT -<br/>every page view burns GitHub quota,<br/>Cache-Control: no-store
    GH-->>Fn: base64 blob
    Fn-->>SPA: JSON - NOT validated against any schema
    SPA->>SPA: setContent(data) then full re-render
    Note over SPA: visible content flash;<br/>on failure it silently keeps<br/>the stale bundled copy
```

**The content exists in three places at once** and they drift independently:

```
content/site-content.json   <- the "real" one in git
        │
        ├─[build-time import]-> JS bundle   (CmsContext.tsx:2)  <- served first
        └─[runtime fetch]─────> /api/content (reads git again)   <- swapped in after
```

## 5. Data flow — admin edit (write path)

```mermaid
sequenceDiagram
    actor A as Admin
    participant P as Admin panel
    participant L as /api/admin/login
    participant C as /api/admin/content
    participant GH as GitHub PAT repo write
    participant VB as Vercel Build
    actor V as Visitors

    A->>P: open /admin (Basic auth) or /admin.html (no gate)
    A->>L: POST password
    L->>L: constant-time compare vs ADMIN_PASSWORD
    L-->>P: HS256 JWT, exp = +8h
    P->>P: localStorage.setItem cms_token - XSS-readable
    A->>P: edit text in WYSIWYG, produces raw HTML
    P->>C: PUT content, sha, message + Bearer
    Note over C: no schema validation,<br/>no size cap, no HTML sanitising
    C->>GH: PUT contents/site-content.json with sha as optimistic lock
    GH-->>C: commit sha
    C-->>P: "Website will update shortly"
    GH->>VB: push webhook
    Note over VB: full npm install + vite build<br/>~1-3 min, no tests, no typecheck
    VB-->>V: new static bundle
    Note over V: /api/content served the new<br/>copy within seconds, but the<br/>bundled fallback lags by one build
```

### Image upload path

```
file picker -> FileReader.readAsDataURL -> base64 in a JSON body
  -> POST /api/admin/upload
  -> filename sanitised to [a-zA-Z0-9._-]  (extension NOT checked against mimeType)
  -> GitHub createFile/updateFile -> client/public/images/<name>
  -> rebuild -> served at https://site/images/<name>   <- same origin as the app
```

---

## 6. Authentication model

```mermaid
graph LR
    subgraph Secrets["Vercel env vars"]
        AU[ADMIN_USERNAME]
        AP[ADMIN_PASSWORD]
        JS[JWT_SECRET]
        GT[GITHUB_TOKEN PAT repo write]
    end

    PathA["GET /admin"] -->|HTTP Basic| AU & AP
    PathA --> Panel["admin/panel.html"]
    PathB["GET /admin.html"] -->|"NO AUTH"| Panel2["public admin.html"]
    Panel & Panel2 --> Login["POST /api/admin/login"]
    Login -->|"password only<br/>ADMIN_USERNAME never checked"| AP
    Login -->|sign| JS
    JS --> JWT["Bearer JWT 8h<br/>stored in localStorage"]
    JWT --> API["/api/admin/content<br/>/api/admin/images<br/>/api/admin/upload"]
    API --> GT
    GT --> Repo["WRITE access to the ENTIRE repo<br/>including api and vercel.json"]
    Repo --> Deploy["Vercel auto-deploy<br/>= arbitrary code execution"]

    style PathB fill:#f8d7da,stroke:#dc3545,stroke-width:3px
    style Deploy fill:#f8d7da,stroke:#dc3545,stroke-width:3px
```

**Blast radius:** one password leads to a JWT, which unlocks a repo-write PAT, which can
commit to `api/**`, which triggers an automatic production deploy. There is no gap
between "CMS editor" and "run code on the production server". A single leaked password
is full remote code execution.

---

## 7. Content model map

`content/site-content.json` — 14 top-level sections, 601 nodes, depth 5, 24.8 KB.

```
global          siteName, tagline, phone1, phone2, email, address, website
                whatsapp, registrationLink, socialMedia{fb,ig,li,yt}, copyrightYear
header          logo, registerButtonText
home            hero{title,description,stats[]}, features[], cta
about           hero, mission, vision, values[], team
services        service definitions
servicesPage    page-specific copy for /services
destinations    country list (flags, descriptions, universities)
destinationsPage
successStories  student stories (name, university, image, quote)
successPage
ielts           course info, batches, fees
japanese        JLPT levels (N5-N1), course info
contact         phone/email/address (DUPLICATES global), mapEmbedUrl, mapDirectionsUrl
footer          footer copy
```

**Page to data binding** (all via the single `useCms()` context):

| Route | Component | Reads |
|---|---|---|
| `/` | `Home.tsx` | `global`, `home` |
| `/about` | `About.tsx` | `global`, `about` |
| `/services` | `Services.tsx` | `global`, `services`, `servicesPage` |
| `/destinations` | `Destinations.tsx` | `global`, `destinations`, `destinationsPage` |
| `/ielts` | `IELTS.tsx` | `global`, `ielts` |
| `/japanese` | `Japanese.tsx` | `global`, `japanese` |
| `/success-stories` | `SuccessStories.tsx` | `global`, `successStories`, `successPage` |
| `/contact` | `Contact.tsx` | `global`, `contact` |
| *(all)* | `Header`, `Footer`, `WhatsAppButton` | `global`, `header`, `footer` |

**Modelling characteristics:**

- No `id`/`slug`/`order`/`publishedAt` on most collection items — ordering is array position.
- No draft/publish split. Saving equals publishing to production immediately.
- No i18n structure; English and Bengali are mixed inside the same string fields.
- `contact.phone1`/`email`/`address` duplicate `global.*` — they can and do drift.
- Content strings contain **raw HTML** produced by the WYSIWYG, rendered through
  `RichText` into `dangerouslySetInnerHTML` with no sanitising.

---

## 8. Build and deploy pipeline

```mermaid
graph LR
    Dev["git push"] --> Hook
    Admin["Admin clicks Save"] -->|GitHub Contents API| Commit["commit on main"] --> Hook
    Hook["Vercel webhook"] --> Install["npm install --legacy-peer-deps"]
    Install --> Build["vite build to dist/public"]
    Build --> Deploy["Deploy static + functions"]

    NoTest["no tests"] -.-> Build
    NoLint["no ESLint"] -.-> Build
    NoTS["no tsc --noEmit in CI"] -.-> Build
    NoStaging["no staging env"] -.-> Deploy

    style NoTest fill:#f8d7da
    style NoLint fill:#f8d7da
    style NoTS fill:#f8d7da
    style NoStaging fill:#f8d7da
```

`vercel.json` configures only: a `/admin` to `/api/admin-panel` rewrite, `noindex` plus
`no-store` on `/admin`, and `no-store` on `/api/*`. **There is no SPA fallback rewrite**
— deep links such as `/ielts` must be verified against the live deployment
(see ASSESSMENT OPS-07).

---

## 9. Trust boundaries

```mermaid
graph TB
    subgraph TB1["UNTRUSTED - public internet"]
        Anon["Anonymous visitors"]
    end
    subgraph TB2["SEMI-TRUSTED - anyone with the password"]
        AdminU["Admin: 1 shared password, no MFA, no rate limit"]
    end
    subgraph TB3["TRUSTED - secrets"]
        Env["Vercel env vars"]
    end
    subgraph TB4["CROWN JEWELS"]
        RepoW["GitHub repo write = production code"]
    end

    Anon -->|"/api/content: no auth, no cache,<br/>burns GitHub quota"| Env
    Anon -->|"/admin.html is reachable"| AdminU
    AdminU -->|"8h bearer token in localStorage"| Env
    Env --> RepoW
    Anon -.->|"stored XSS via CMS HTML<br/>steals the admin token"| AdminU

    style TB4 fill:#f8d7da,stroke:#dc3545,stroke-width:3px
```

**Boundary violations found** (details in `ASSESSMENT.md`):

1. `/admin.html` lets an unauthenticated request reach the admin UI, bypassing Basic auth.
2. `/api/content` lets an anonymous request consume the privileged GitHub PAT quota.
3. Stored XSS in CMS content crosses from visitor-visible output back into the admin
   session, because the public site and the admin panel share one origin and the token
   sits in `localStorage`.
4. The image-delete allow-list is bypassable, letting an admin token reach arbitrary
   GitHub REST paths with the PAT.

---

## 10. External dependencies at runtime

| Service | Used for | Where | Risk |
|---|---|---|---|
| GitHub Contents API | **the database** | every page view + every edit | single point of failure; rate limit ~5,000/h |
| Vercel | hosting, functions, build | — | build minutes consumed per content edit |
| Google Forms (`forms.gle`) | **actual lead capture** | `global.registrationLink` | leads live outside the system entirely |
| Google Maps embed | office location | `contact.mapEmbedUrl` | URL is fabricated (`0x0:0x0`) — wrong pin |
| Google Fonts | Playfair Display + Inter | `index.css:1` `@import` | render-blocking |
| `wa.me` | WhatsApp CTA | `WhatsAppButton` | — |
| Unsplash | 5 "student" photos | `successStories` | stock models presented as real students |
| `i.ibb.co.com` | 1 story photo | `successStories` | third-party hotlink, can vanish |
| `bing.com/images/search` | an Australia flag | `destinations` | **not an image — a search page; renders broken** |
| Umami | analytics | `index.html:21` | env vars unset, so it requests the literal `%VITE_ANALYTICS_ENDPOINT%/umami` |

---

## 11. Where this architecture breaks

| Limit | Reached at | Symptom |
|---|---|---|
| GitHub API rate limit (~5k/h on the PAT) | ~5,000 page views/hour, or a trivial curl loop | `/api/content` 503s; admin cannot save |
| Full rebuild per edit | every single save | 1–3 min from "Save" to the bundled copy updating; Vercel build minutes consumed to change a phone number |
| GitHub Contents API 1 MB file cap | ~40x current content size | `JSON.parse` of an empty body throws, so the CMS becomes unreadable **and unrepairable through the UI** |
| Single JSON blob, last-write-wins by `sha` | 2 concurrent editors | one editor's save is rejected with an opaque 500 |
| No query layer | first blog/news feature | cannot filter, paginate, or sort without loading all content |
| No relational model | lead capture, enquiry tracking | nowhere to put per-user data at all |

**Conclusion:** the git-as-database design is adequate for ~8 static marketing pages
edited by one person. It cannot support lead capture, enquiry tracking, a blog,
multi-user editing, or multi-language content — all of which are on the roadmap.
See `REMEDIATION-PLAN.md` for migration options.
