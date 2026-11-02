# Security: the 13-item list, assessed and actioned

Written 2026-11-02, against the current Laravel + React application.

Your list was written against the **old** stack: Vercel serverless functions, a
hand-rolled JWT, and a GitHub token used as the content database. Much of that
stack no longer exists, so each item is assessed against what is actually
running before anything was changed. Two findings were already closed, one was
already correct, and three turned out to be bigger than the line suggests.

Everything marked DONE was verified in a real browser or against the running
API, not just written.

---

## The list

| # | Item | State |
|---|------|-------|
| 1 | Delete `client/public/admin.html` | **Already done** before this pass |
| 2 | Replace the `startsWith` path check | **Done** — deleted with the dead layer it lived in |
| 3 | Sanitise CMS HTML with DOMPurify | **Done** |
| 4 | Rotate admin password, JWT secret, GitHub token | **Needs you** — see below |
| 5 | Rate limiting and account lockout on login | **Done** |
| 6 | Two-factor authentication for admin | **Not built** |
| 7 | Replace the hand-rolled JWT | **Done** — Sanctum already replaced it; the old code is now deleted |
| 8 | CSP, HSTS, X-Frame-Options, X-Content-Type-Options | **Done** |
| 9 | Cache `/api/content`, restrict its CORS origin | **Mostly moot** — see below |
| 10 | Reject SVG uploads, verify contents not MIME | **Was already correct**, one real gap fixed |
| 11 | Move content off the GitHub PAT onto a database | **Half done** — the PAT code is gone, the content is not yet in MySQL |
| 12 | Encrypt stored documents, log every access | **Logging done**, encryption not |
| 13 | Automated daily backups with a tested restore | **Done** |

---

## Notes on the items that are not a simple yes

**4. Rotating the secrets is yours to do, and still worth doing.**
The code that used them is deleted: the hand-rolled JWT signer, the GitHub
token client, and the old admin login all went with `api/`. But deleting code
does not revoke a token. If a GitHub PAT was ever issued for this project,
revoke it at GitHub; if a Vercel project still exists, delete it, because an
already-deployed function keeps running regardless of what the repository says.

**9. There is no `/api/content` function any more.**
On Cloudflare Pages the site is static, so that path falls through to
`index.html` and the app uses its bundled copy of the content. There is nothing
left to cache or to put a CORS rule on. The Laravel API's CORS is a strict
explicit allowlist already (`backend/config/cors.php`), with no wildcard.

**10. The declared MIME type was never trusted.**
Laravel's `mimes:` rule matches on the *sniffed* content, not the client's
header, and SVG was already excluded. One real gap did exist: the stored
filename took its extension from the uploaded name, so a genuine PDF called
`report.html` was stored as `.html`. The extension is now derived from the
content too.

**11. The content is out of the PAT, not yet into the database.**
The token-based commit path is deleted. Marketing copy still lives in
`content/site-content.json`, and the admin's website-content pages still save
locally. Moving it into MySQL is a feature, not a patch.

**12. Access logging is the half that was buyable now.**
Every open, upload and delete of a student document is written to
`storage/logs/document-access.log` (own channel, daily, 365 days), recording
who, which row, whether it was their own file, and from where. Never file
contents. Encryption at rest is not done, and is worth being clear-eyed about:
on a single VPS the key sits on the same disk as the files, so it protects
against a stolen backup or a decommissioned drive, not against someone who gets
onto the box.

---

## What else the audits found, that was not on the list

These were not in your 13 but were worth more than some that were.

**Students could read the office's private case notes about themselves.**
`GET /api/my/application` used the same serialiser as the staff view, so it
returned `caseNotes` — the internal notes on a refusal history or a judgement
about someone's finances. Fixed: the student shape no longer loads them at all,
rather than merely hiding them, so a future edit cannot leak them by accident.

**Staff could take over the admin account.** Every `/students/{student}` route
bound to any row in the users table, so a staff token could `PATCH
/api/students/1/password` and own the admin, or `DELETE` it and lock everyone
out. The binding is now scoped to students, and those ids return 404.

**A 366 KB third-party script was in every page.** A preview runtime was
injected inline into both built HTML files, taking them from 2 KB to 369 KB. It
listens for `window.message` events and acts on them after checking only a type
field, with **no `event.origin` check**, and replies with a `"*"` target origin.
On `/admin` the page it bridges holds student records. It is now
development-only, which is also what made a real CSP possible.

**A `javascript:` URL in the map embed would have run as the page.**
`contact.mapEmbedUrl` went straight into an `<iframe src>` with no check. In an
iframe that executes in the embedding page's own origin, on render, with no
click needed. It is now matched against the Google Maps embed prefix.

**The private disk was on a public URL.** `filesystems.serve` was `true`,
registering `GET` and `PUT /storage/{path}` with **no middleware at all** —
signature-gated on `APP_KEY` only, no auth, no ownership check, no log. Turned
off; every file already goes through an authorised controller route.

**A second admin shipped in the public bundle.** `client/src/admin/` treated the
presence of a localStorage key as proof of sign-in, with no server check. It
rendered an empty shell because the API refused it, but it is exactly the shape
of problem that deleting `admin.html` was meant to end. Deleted.

**Rate limits would have inverted behind the tunnel.** `trustProxies` was never
configured, so `$request->ip()` returns the proxy. Behind Cloudflare that turns
"10 sign-ins per minute per visitor" into 10 for the entire world. Configured
via `TRUSTED_PROXIES`; set it to `127.0.0.1,::1` when cloudflared runs on the
same host, and never to `*` on a directly reachable machine.

**New students' passwords would have been written to the log.** The account
email contains the password, and `MAIL_MAILER=log` writes the whole rendered
body to `laravel.log`. `Notify` now refuses to send a credential-carrying email
through the log mailer.

Also fixed: password reset and change now revoke other sessions; Sanctum tokens
expire after 7 days; students can change their own password (the welcome email
told them to, and there was no endpoint); deleting a student now deletes their
files instead of orphaning passport scans on disk; `.env.example` no longer
ships `APP_DEBUG=true`; announcement links must be site-relative; the admin no
longer calls the API before the sign-in check runs.

---

## Running it

```bash
# back up now, and prove the backup restores
cd backend
php artisan backup:run
php artisan backup:restore --file=storage/backups/db_<stamp>.sql --check
```

The `--check` run loads the dump into a scratch database, counts the rows and
drops it again, without touching live data. That is the part worth doing
regularly: a dump that has been silently empty for months looks exactly like a
working backup until the day you need it.

Daily backup and a weekly restore drill are scheduled in
`backend/routes/console.php`, but **nothing runs the scheduler yet**. On a VPS:

```
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

## Two things to know before this goes live

1. **`DEV_OPEN_LOGIN=true`** is set in `backend/.env`. Sign-in accepts any email
   and any password. It is ignored when `APP_ENV=production` and the file is
   git-ignored, but set it to `false` before anything real.
2. **Deploying to Apache: use `cp -r dist/public/. <target>`**, not
   `dist/public/*`. The `*` form skips dotfiles, which means `.htaccess` — and
   therefore every security header — silently never arrives.
