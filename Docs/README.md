# StudyHub BD — Documentation

Generated **2026-10-31** from a full review of the codebase. No application code was
changed; this is analysis only.

## Start here

| Document | Read it when |
|---|---|
| **[MEMORY.md](./MEMORY.md)** | **Start of every session.** Dense orientation: what the project is, how it works, the traps, the plan, and the open questions. |
| [ASSESSMENT.md](./ASSESSMENT.md) | You want the full findings list — 49 issues with file/line, severity, impact and fixes. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | You need to understand how the system fits together — diagrams for topology, read/write data flow, auth, trust boundaries. |
| [REMEDIATION-PLAN.md](./REMEDIATION-PLAN.md) | You are about to do work — phased plan P0→P3, target architecture options, data model, feature roadmap. |

## The 60-second version

StudyHub BD is a React/Vite marketing SPA for a Bangladeshi study-abroad consultancy,
hosted on Vercel, with **a GitHub repo as its database** and a hand-written CMS panel.

Two things need attention before anything else:

1. **Security.** One shared admin password unlocks a GitHub token with write access to the
   whole repo — and a repo write auto-deploys. That makes the password a production
   code-execution credential. Three paths to reach it were found; one was reproduced with
   a working proof-of-concept.

2. **The contact form does not work.** No submit handler, no endpoint. It reloads the page
   and discards the enquiry. Every lead submitted through the website has been lost. And
   the Contact page's phone number cannot be changed through the CMS at all — the admin
   panel writes a different copy of it than that page reads.

| Severity | Count |
|---|---:|
| 🔴 Critical | 6 |
| 🟠 High | 20 |
| 🟡 Medium | 27 |
| 🔵 Low | 14 |
| **Total** | **67** |

## Do these first

Same-day, in this order:

1. Rotate `GITHUB_TOKEN` (to a fine-grained, single-repo, `Contents: write` token),
   `ADMIN_PASSWORD` and `JWT_SECRET`.
2. `rm client/public/admin.html` — it is a publicly reachable admin panel.
3. Fix the path check in `api/admin/images.js:67` and URL-encode paths in `api/_lib/github.js`.
4. Open `https://<site>/ielts` directly and confirm it does not 404.
5. Fix or remove the contact form on `/contact`.
6. Point `Contact.tsx` at `content.global.*` so the office phone/email/address become editable.
7. Add CDN caching to `api/content.js`.

Details for each are in [REMEDIATION-PLAN.md § P0](./REMEDIATION-PLAN.md).
