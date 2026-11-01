# StudyHub backend plan (Laravel + MySQL)

The ten-item roadmap is one thing: a real backend. This is the plan for it, with
the stack you chose and the order it gets built.

## Stack (decided)

- **Frontend:** the existing React app, unchanged. It calls the API over HTTP.
- **API:** **Laravel (PHP 8.4)**. XAMPP's bundled PHP is 8.1 (too old for current
  Laravel), so in local dev the API runs with PHP 8.4 via `php artisan serve` on
  `http://localhost:8000`. XAMPP still provides the database.
- **Database:** **MySQL / MariaDB** from XAMPP (`127.0.0.1:3306`).
- **Auth:** self-built in Laravel (Sanctum token sessions). Two roles: `student`
  and `staff`/`admin`. Students sign in on the website; staff use the admin.
- **File storage:** Laravel's private disk (`storage/app/private`), never the web
  root and never the git repo. Files are streamed through an authorized controller,
  so a passport scan is only ever served to the student who owns it or to staff.
  On the VPS this moves to a private S3-compatible bucket with the same interface.
- **Email:** SMTP via Laravel Mail (Mailtrap in dev, real SMTP on the VPS).
- **Video booking:** self-built. Times are stored in UTC with the booker's IANA
  timezone, and converted for display on both sides. A meeting link is attached
  (manual or a provider later).
- **Payments:** deferred, by your call. Slot left at the end.

**Deployment:** XAMPP + `artisan serve` locally now; a VPS (PHP-FPM + Nginx/Apache
+ MySQL) later. Nothing here ties to Vercel; the old `api/` serverless functions
are retired as Laravel replaces them.

## Local topology

```
React (Vite dev :5173, or the built site)  ──HTTP──▶  Laravel API (php artisan serve :8000)
                                                            │
                                                            ▼
                                                     MySQL (XAMPP :3306)  +  storage/app/private (files)
```

The React app gets a `VITE_API_URL` pointing at the API. CORS is opened for the
dev origins in Laravel.

## Database (core tables)

- **users** — `id, name, email, password, role, phone`, plus student profile
  columns (`student_code, counsellor, country, university, course, intake`).
- **enquiries** — contact-form and consultation leads: `name, email, phone,
  destination, need, message, source, status (new|contacted|booked|closed)`.
- **application_stages** — per student: `user_id, name, state (todo|now|done),
  happened_on, note, position`.
- **case_notes** — per student, the admin's titled notes: `user_id, title, body,
  status, dated_on`.
- **documents** — `user_id, name, group (application|visa), status, path, size,
  note, uploaded_by`.
- **messages** — `user_id, sender (student|agency), author, body` (+ attachments).
- **announcements** — `user_id (null = everyone), kind, title, body, read_at`.
- **bookings** — `name, email, phone, destination, need, scheduled_at_utc,
  timezone, online, meeting_link, status, user_id (nullable)`.
- **payments** — later.

## API surface (first pass)

- `POST /api/enquiries` (public) — contact form submit.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me` — auth.
- `GET/POST/PATCH/DELETE /api/students` (staff) — student files + password reset.
- `GET /api/students/{id}/application`, `PATCH .../stages/{i}` — the tracker.
- `GET/POST/PATCH/DELETE .../case-notes`.
- `POST .../documents`, `GET .../documents`, `PATCH .../documents/{id}`,
  `GET .../documents/{id}/download` (authorized stream).
- `GET/POST .../messages`.
- `GET/POST .../announcements`.
- `GET/POST/PATCH /api/bookings`.
- Student-facing: `GET /api/my/application`, `/api/my/documents`,
  `/api/my/messages`, `/api/my/announcements`.

## Build order (phases)

1. **Foundation + contact form** (items 1, 2, start of 10): Laravel scaffold,
   MySQL wired, `enquiries` table, `POST /api/enquiries`, the React contact form
   submitting to it, and the admin Bookings/Enquiries list reading real rows.
2. **Auth + students + tracker** (3, 5, 8 part): login, student accounts, the
   application stages and case notes, the student portal and the admin student
   screens on real data.
3. **Secure documents** (4): authorized upload, list, status, feedback, download.
4. **Messages + announcements + emails** (7, part of 6): threads, the "All"
   announcement, and automated email at each step (enquiry received, account
   created, document reviewed, booking confirmed).
5. **Video booking + timezones** (6): bookings with UTC + timezone conversion and
   a meeting link.
6. **CRM polish** (8): staff views over every lead and its status.
7. **Payments** (9): the gateway, once chosen.
8. **Retire the Google Form** (10): once the contact form and booking flow cover it.

Each phase is a working vertical slice (DB + API + the React screen wired to it),
not a layer in isolation.
