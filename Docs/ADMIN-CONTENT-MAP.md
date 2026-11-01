# Admin ↔ Website content map

**What this is.** A complete map of the public website to the content that drives
it, and from there to the admin panel that will edit it. It is the audit the admin
panel is built from: every section in the admin exists because a part of the site
needs editing, and every part of the site that an editor *cannot* yet reach is
listed here as a gap.

**Who it is for.** Whoever decides what the admin should control, and whoever wires
the editing. Read §1 to understand how content reaches a page, §2 for the admin
structure, §3 for the field-by-field map, and §4 for what is still hardcoded.

**Status.** Frontend phase. The admin navigation and section pages are being shaped
to this map now; the save-to-site wiring (the "function connection") is the next
phase and is called out where it applies.

---

## 1. How content reaches the website

```
content/site-content.json         the datastore (one JSON file, 15 top-level keys)
        │
        │  committed to the repo; every save rebuilds the site
        ▼
GET /api/content                  serves the live JSON (serverless function)
        │
        ▼
CmsContext (useCms)               fetches at runtime, falls back to the bundled
        │                         copy of the JSON if the fetch fails
        ▼
content.<key> in each page        e.g. content.home.hero.title
```

- The file is the single source of truth. There is no database.
- `client/src/contexts/CmsContext.tsx` imports the JSON at build time **and** fetches
  `/api/content` at runtime, so a freshly saved change shows without a redeploy once
  the rebuild finishes.
- **Not everything on the site comes through this pipe.** A large amount of visible
  content is written directly into the page code or into helper files under
  `client/src/lib/`. Those parts cannot be changed from the admin until they are
  moved into the JSON. They are listed in §4.

---

## 2. The admin panel structure (target map)

The admin has two jobs, and the sidebar reflects both: **run the student operations**
(the portal side) and **edit the marketing website** (the CMS side). The sidebar is now
shaped to this map; each item opens a section page that states what it will manage. The
editor forms themselves are built section by section under direction.

**Overview**

| Section | Route | Data it edits | Where it shows |
|---|---|---|---|
| **Dashboard** | `/` | — (overview only) | — |

**Students (operations)** — see §6. Not CMS; these need a real private backend.

| Section | Route | Data it edits | Where it shows |
|---|---|---|---|
| **Students** | `/students` | the student records | student portal |
| **Applications & visa** | `/students/applications` | each student's `stages[]` | `/student` |
| **Documents** | `/students/documents` | each student's `documents[]` + feedback | `/student/documents` |
| **Messages** | `/students/messages` | each student's `messages[]` | `/student/messages` |
| **Announcements** | `/students/announcements` | each student's `notifications[]` | `/student/notifications` |
| **Bookings** | `/students/bookings` | consultation requests (not captured yet) | the consultation form |

**Website content (CMS)** — driven by `content/site-content.json`.

| Section | Route | CMS key(s) it edits | Public page(s) |
|---|---|---|---|
| **Home page** | `/pages/home` | `home` | `/` |
| **About page** | `/pages/about` | `about` | `/about` |
| **Services** | `/pages/services` | `servicesPage`, `services` | `/services` |
| **Destinations** | `/pages/destinations` | `destinationsPage`, `destinations` | `/destinations`, `/destinations/:slug` |
| **Success stories** | `/pages/success` | `successPage`, `successStories` | `/success-stories` |
| **IELTS course** | `/pages/ielts` | `ielts` | `/ielts` |
| **Contact page** | `/pages/contact` | `contact` | `/contact` |

**Site**

| Section | Route | Data it edits | Public page(s) |
|---|---|---|---|
| **Media library** | `/media` | image files | all |
| **Legal & compliance** | `/legal` | `legal` | `/privacy`, `/terms`, `/refunds`, `/complaints`, `/cookies`, `/data-processing` |
| **Settings** | `/settings` | `global`, `header`, `footer` | all (header, footer, contact buttons) |

The dashboard is left exactly as the TailAdmin template built it, by instruction.

---

## 3. Field reference — the 15 CMS keys

Each key below lists what it controls and where it appears. Shapes are from
`content/site-content.json` as it stands.

### `global` → Settings
Site-wide identity and contact details. Read by Header, Footer, the utility bar, the
WhatsApp button, the consultation dialog, and the Home/About/Contact pages.
`siteName, tagline, phone1, phone2, email, address, website, whatsapp,
registrationLink, socialMedia {facebook, instagram, linkedin, youtube}, copyrightYear`

### `header` → Settings
`logo`, `registerButtonText`. (The nav links themselves are **hardcoded** — see §4D.)

### `home` → Home page
`hero {badge, title, titleHighlight, description, ctaButton, learnMoreButton, stats[]}`,
`servicesSection`, `destinationsSection`, `successSection`, `ctaSection`.
The three hero `stats` ("500+ / 50+ / 10+") are reused on the About and Success pages.

### `about` → About page
`hero, mission, vision, values[] (4), whyChooseTitle, whyChooseHighlight,
whyChooseUs[] (4), ctaTitle, ctaButton`. Also read on the Home page (mission/vision/
values/why-choose all re-appear there).

### `servicesPage` → Services page
Page copy: `heroTitle, heroHighlight, heroSubtitle, categoriesTitle,
categoriesHighlight, categories[] (4, each {title, items[]}), ctaTitle, ctaSubtitle,
ctaButton`.

### `services` → Services page (and About)
The flat list of **12** services, each `{id, title, description}`. Rendered as the
"full list" on Services and as the "everything the office does" list on About.

### `destinations` → Home grid + consultation dropdown **only**
Array of **10**, each `{id, name, flag, shortDescription, fullDescription, image,
universities, students, highlights}`. **Important:** despite the rich shape, the site
only uses `id/name/flag` (Home country grid) and `id/name` (the dropdown in the
consultation dialog). None of the detail is shown anywhere. The destination pages a
visitor actually reads come from a different, hardcoded file — see §4A.

### `successStories` → Success stories page + Home
Array of **6**, each `{id, name, university, country, program, year, image, quote}`.

### `successPage` → Success stories page
`heroTitle/Highlight/Subtitle, sectionTitle/Highlight, testimonialTitle/Highlight,
testimonials[] (4, {quote, author}), ctaTitle/Subtitle/Button`.

### `ielts` → IELTS page
`hero, courseStats {classes, perWeek, mockTests, support}, courseFeatures[] (4),
programTitle, programDescription, curriculum[] (4), whyChooseUs[] (6),
ctaTitle/Subtitle/Button`.

### `japanese` → **nothing** (orphaned)
Full course content (`hero, courseStats, levels[], curriculum[], whyChooseUs[]`, …)
that **no page renders**. There is no `/japanese` route and no component reads
`content.japanese`. Decision needed: build the page, or drop the key. See §4F.

### `destinationsPage` → Destinations index (page copy only)
`heroTitle/Highlight/Subtitle, whyTitle/Highlight, whyCards[] (3), ctaTitle/Subtitle`.
The country cards on this page come from `lib/countries.ts`, not from here — see §4A.

### `contact` → Contact page
`hero, address, phone1, phone2, email, website, mapEmbedUrl, mapDirectionsUrl,
ctaTitle/Subtitle/Button`. (The contact **form** is hardcoded and non-functional —
§4E.)

### `footer` → Footer
`about` (blurb), `copyrightText`. (The footer link columns are **hardcoded** — §4D.)

### `legal` → Legal & compliance
`lastUpdated, tradeLicence, binNumber, dataContact {name, role, email, phone},
documents {privacy, terms, refunds, complaints, dataProcessing, cookies}`. Each
document is `{title, summary, sections[] {id, heading, body[], list?, table?}}`.
`Legal.tsx` is a generic renderer fully driven by this key — the richest, cleanest
CMS integration on the site.

---

## 4. Gaps — visible on the site, NOT editable from the CMS

This is the part that matters most for planning. Everything below is content a
visitor sees but an editor currently cannot change without a developer editing code.

### 4A. Destinations and country pages — the biggest gap
All destination detail lives in **`client/src/lib/countries.ts`** (~525 lines, 10
countries), not in the CMS.
- `Destinations.tsx` builds its country card grid from `COUNTRIES` (lib), not
  `content.destinations`.
- `Country.tsx` (`/destinations/:slug`) **never calls `useCms()`**. Every field — the
  summary, culture, education system, universities, costs, and the whole **"What a
  degree there opens up"** section (`c.economy`, `c.opportunities`, `c.benefits`) —
  comes from `getCountry(slug)` in lib.
- `About.tsx`'s "Where our students go" grid and its country counts also read
  `COUNTRIES` (lib).

So the `content.destinations` CMS array is almost dead, and the real destination
content is uneditable. **This is the key decision for the next phase:** promote
`lib/countries.ts` into the CMS (a `countries` collection) and point the three
consumers at it, or accept that destinations stay developer-edited.

### 4B. Per-page editorial copy baked into page files
Written as `const` arrays/objects in the page, not in the CMS:
| File | Const | What it is on the page |
|---|---|---|
| `Home.tsx` | `STAGES` | the whole "How we work" 3-stage model + 12 bullets |
| `Home.tsx` | `INTAKES`, `COUNTRY_PHOTO` | intake months + photo under each country card |
| `About.tsx` | `STORY` | 3 narrative paragraphs ("You do not have to go to Dhaka…") |
| `About.tsx` | `TANGAIL` | 4 district photos + captions |
| `About.tsx` | `REASONS` | 4 "why choose us" cards |
| `Services.tsx` | `STAGES` | the "one office, the whole journey" 3-stage model |
| `Services.tsx` | (inline) | "A look at the work" 3-image strip |
| `SuccessStories.tsx` | `TINTS` + helpers | monogram avatar colours (cosmetic, fine to leave) |
| `IELTS.tsx` | (inline) | section headings + stat labels |

Plus many inline section headings and link labels across all pages (e.g. "Why us",
"How we work", "Every country in detail →"). These are low priority unless the client
wants to rewrite headings themselves.

### 4C. Home sections that are switched off
`Home.tsx` defines four **empty** arrays that gate whole sections — they render
nothing today: `VISA_SUCCESS` (visa success rate), `RECOGNITIONS` (authorisation and
certificates), `EVENTS` (events and university visits), `PARTNERS` (universities we
represent). If the client wants any of these live, they become CMS collections.

### 4D. Navigation is hardcoded
- `Header.tsx` `NAV` — the 6 main menu items (About, Services, IELTS, Destinations,
  Success Stories, Contact).
- `Footer.tsx` `PAGES`, `LEGAL`, `PROGRAMMES` — the three footer link columns.
Changing the menu means editing code. Usually acceptable; noted for completeness.

### 4E. Hardcoded, non-CMS, and partly non-functional
- **`Contact.tsx` form** — fully static: no state, no submit handler. It looks like a
  contact form but does nothing. Its Subject options are hardcoded. Needs a decision:
  wire it to an inbox/endpoint, or replace with the consultation dialog.
- `NotFound.tsx` — all copy hardcoded (fine).
- `Legal.tsx` `ConsentControls` + `lib/consent.ts` — cookie-consent copy and category
  list (fine to leave as code).
- `Footer.tsx` image credits from `lib/imageCredits.ts` — the photo-credit list (fine
  as code, but worth knowing it is not in the CMS).

### 4F. Orphaned data
`content.japanese` — a complete course content block that nothing renders. Either
build `/japanese` (the data is ready) or remove the key to stop it misleading editors
into thinking a Japanese page exists.

---

## 5. The student portal (operations side) — assessment

The admin is not only a website editor. The site has a **student portal**
(`/student`, `/student/documents`, `/student/messages`, `/student/notifications`,
`/student/login`) where a student tracks their application. The agency side of that —
creating files, moving stages, checking documents, replying, posting notices — had no
home in the admin. It does now, as the **Students** group (§2).

**The data model** is `StudentRecord` in `client/src/lib/studentData.ts`:
`name, email, studentId, counsellor, country, university, course, intake`, plus four
lists — `stages[]` (the six-stage done/now/todo progression), `documents[]` (each with
a status and a feedback note, split into the university file and the visa file),
`messages[]` (the two-way thread), and `notifications[]` (document/stage/message/
announcement notices). Each admin section maps to one of these.

**The hard truth about this side (not git-as-database).** The marketing CMS is one JSON
file committed to a public repo, and that model is fine for marketing copy. It is
**wrong** for student data:
- The portal has **no backend** today. It runs on one hardcoded `SAMPLE_STUDENT`, with
  browser-only "auth" that protects nothing.
- Student **documents are passport scans, bank statements, NIDs**. They must live in
  **private, access-controlled storage**, never in the public content repo — committing
  one publishes it to the world.
- So the Students sections cannot save through the content API the website uses. They
  need a real database and file store with per-student access control. **This is the
  biggest build on the roadmap, and it is a backend, not a frontend, job.**

**Bookings is a gap, not a feature yet.** The website's "Book a consultation" dialog
(`ConsultationDialog.tsx`) sends straight to WhatsApp or email and **stores nothing** —
there is a `submitToEndpoint` stub waiting for "the day there is a service." So the
Bookings section has nothing to list until the form posts to a store first. It is in the
sidebar so the gap is visible and planned, not forgotten.

---

## 6. Plan

**Done so far:**
- This audit, mapping every public page and component to the CMS (§3–§4) and the student
  portal (§5).
- The TailAdmin panel stands up under `/admin`, with the sidebar shaped to the full §2
  map: Overview, Students, Website content, Site. (The template's demo menu and its
  "Get Pro" promo are removed.)
- **Every section now has a built editor UI** in the TailAdmin design (frontend phase):
  - Website content + Site (Home, About, Services, Destinations, Success, IELTS, Contact,
    Media, Legal, Settings) — forms over the live content, populated from `/api/content`
    with the bundled JSON as fallback, each carrying a notice on its §4 gaps.
  - Students (Students, Applications & visa, Documents, Messages, Announcements, Bookings)
    — tables, a stage tracker, a document review list, a message thread and a bookings
    inbox, populated from sample fixtures (`content/students.ts`) since there is no
    backend.
  - Shared foundation: `content/store.tsx` (website content), `content/fields.tsx` (form
    toolkit), `content/ui.tsx` (app-screen primitives), `content/students.ts` (fixtures).

**Student screens are now interactive (in-memory):** create / delete a student and change
their password; collapse each applications card and add titled case-note feedback; set a
document's status, write feedback, and upload a document for a student; post an
announcement to one student or to everyone ("All"); reply in Messages; create a booking
and change a booking's status. The top-bar search is global and filters whichever list is
open. All of this is held in a client-side store seeded from fixtures, so **it works and
shows immediately but resets on reload** — there is no backend.

**Still to wire (not built yet):**
- **Saving the website content.** The CMS forms hold edits in local state; Save is a stub.
- **The student backend.** A real database and private, access-controlled file store, with
  server-side auth, so students, documents (actual files), messages, announcements and
  bookings persist and are secure (§5). The store methods are the shape it will implement.
- **Website → bookings capture.** The consultation form must post to that store (and copy
  to WhatsApp) so website bookings land in the Bookings inbox automatically.

**Function connection (the phase after):**
1. **Website content:** wire the editors to `GET /api/content` + save (the working save
   logic in `client/src/admin/` can be ported; it already commits with the sha guard).
2. **Student backend (the big one):** stand up a real database and private file store
   with per-student access control and server-side auth, so student files, documents,
   messages and announcements can be managed for real. This is not git-as-database and
   not a frontend job (§5).
3. **Bookings:** make the consultation form post to a store before the Bookings section
   can list anything (§5).
4. Decide §4A: promote `lib/countries.ts` to a CMS `countries` collection, or leave
   destinations developer-edited.
5. Decide §4E: make the contact form work, or drop it for the dialog.
6. Decide §4F: build `/japanese`, or delete the key.

---

*Generated from an audit of 10 public pages and 5 public components on 2026-11-01.
File/line references above are from that audit and may drift as pages change.*
