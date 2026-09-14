# Meera Smriti Sishu Ankan Siksha Kendra

Static site + a small Express server for a license-gated deploy and a
JWT-protected admin panel. No database — nothing is persisted server-side.

**New here? Read [`RUNNING.md`](./RUNNING.md) first** — it covers the
most common mistake (opening `index.html` directly instead of running
the server) before you touch anything else.

**Deploying for real? See [`DEPLOY_RENDER.md`](./DEPLOY_RENDER.md)**
for a full step-by-step GitHub → Render walkthrough.

## Project structure

```
server.js              Express app: license gate, admin auth, static hosting
package.json
scripts/
  generate-license-hash.js   makes a LICENSE_KEY / LICENSE_KEY_HASH pair
  generate-admin-hash.js     makes an ADMIN_PASSWORD_HASH from a plain password
public/
  index.html            the public website
  admin/
    login.html           admin login form
    dashboard.html        protected admin page (requires a valid session)
```

## 1. Install dependencies

```
npm install
```

## 2. Generate your secrets (do this once, locally)

**License key pair** — required or the whole site returns 503:

```
node scripts/generate-license-hash.js
```

This prints a `LICENSE_KEY` and a `LICENSE_KEY_HASH`. Keep the key secret;
you'll set both as environment variables on Render.

**Admin password hash:**

```
node scripts/generate-admin-hash.js "Your$trongPassword123!"
```

Use a long, random password (12+ characters, mixed case, numbers, symbols).
This prints `ADMIN_PASSWORD_HASH` — the plain password itself is never
stored anywhere in the repo or on the server.

**JWT secret:**

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Set environment variables

Copy `.env.example` to `.env` for local testing (never commit `.env`):

```
LICENSE_KEY=...
LICENSE_KEY_HASH=...
ADMIN_USERNAME=youradminname
ADMIN_PASSWORD_HASH=...
JWT_SECRET=...
PORT=3000
NODE_ENV=production
```

## 4. Run locally

```
npm start
```

Visit `http://localhost:3000` for the site and `http://localhost:3000/admin/login` for the admin panel.

## 5. Deploy on Render (no MongoDB / no database)

1. Push this project to a GitHub repo.
2. On Render: **New +** → **Web Service** → connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Under **Environment**, add every variable from step 3 above
   (`LICENSE_KEY`, `LICENSE_KEY_HASH`, `ADMIN_USERNAME`,
   `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `NODE_ENV=production`). Render
   sets `PORT` automatically — you don't need to add it.
6. Deploy. If `LICENSE_KEY` / `LICENSE_KEY_HASH` are missing or don't
   match, every route will return a 503 "license invalid" page instead
   of crashing the service — check the Render logs for the exact reason.

## Notes on the admin system

- Login: `POST /api/admin/login` with `{ username, password }` → sets an
  `httpOnly`, `sameSite=strict` cookie holding a signed JWT (4 hour
  expiry). Rate-limited to 10 attempts / 15 minutes per IP.
- Same login endpoint serves **two roles**: admin and instructor (see
  below). It checks admin credentials first, then instructor.
- `GET /admin/dashboard` is admin-only — an instructor session gets
  redirected to `/admin/login`.
- The dashboard lists every enquiry submitted from the homepage form,
  live, with a status dropdown (new / contacted / enrolled / closed),
  search, filtering, pagination, and CSV export — plus gallery and
  announcements management (see below).
- Logout: `POST /api/admin/logout` clears the cookie.

## Instructor accounts (second role, optional)

Set `INSTRUCTOR_USERNAME` and `INSTRUCTOR_PASSWORD_HASH` (generated
the same way as the admin password, via
`node scripts/generate-admin-hash.js`) to enable a lighter staff role.
Leave both blank and the instructor role simply doesn't exist.

Instructors log in at the same `/admin/login` page and get redirected
to `/instructor/dashboard`, where they can:
- View enquiries (read-only — no status changes, no export, no delete)
- Add gallery photos (they cannot delete photos or post announcements)

Only admins can change enquiry status, export CSV, delete gallery
photos, or post/delete announcements.

## Gallery (public page + staff management)

- `public/gallery.html` — public page with a lightbox, pulling from
  `GET /api/gallery`.
- Both admin and instructor accounts can add photos
  (`POST /api/staff/gallery`, multipart, 5MB image limit, same rules
  as enquiry photo uploads).
- Only admin can delete (`DELETE /api/staff/gallery/:id`).
- Uploaded gallery photos live in `/data/uploads` alongside enquiry
  proof photos — same ephemeral-storage caveat applies (see below).

## Announcements (public page + admin management)

- `public/announcements.html` — public news feed, pulling from
  `GET /api/announcements`.
- Only admin can post (`POST /api/staff/announcements`) or delete
  (`DELETE /api/staff/announcements/:id`) announcements, from a small
  form built into the admin dashboard.

## Contact page

- `public/contact.html` — real address, an embedded Google Map (no
  API key needed), WhatsApp link, and the same enquiry form as the
  homepage modal, wired to the same `/api/enquiry` endpoint and
  admission-window rules.

## Newsletter subscribers

The announcements page (`/announcements.html`) has a "get notified"
email signup, backed by `POST /api/subscribe` and stored in
`data/subscribers.json`. Admin can view and delete subscribers, and
export them as CSV, from a panel in the admin dashboard.

## Redirect utility page

`public/redirect.html` is a reusable branded interstitial for outbound
links: `/redirect.html?to=<url-encoded destination>&label=<text>`
shows a short "Redirecting you to X..." screen, then forwards
automatically after 2 seconds (with a manual "Continue Now" button).
It only accepts `http(s)://` destinations — anything else shows a
"no destination specified" message instead of redirecting, so it can't
be abused as an open redirect to unsafe URLs. Currently used for the
Facebook and YouTube links in the header/footer/contact page.

## Dark mode

The homepage (`index.html`) has a moon/sun toggle in the header that
switches to a dark palette, saved in the browser's `localStorage` so
it persists across visits. It's implemented as CSS overrides on the
existing utility classes rather than a full Tailwind dark-mode
rebuild, so it covers the homepage well but hasn't been extended to
every other page (gallery/contact/announcements/login/etc. still use
the light theme only) — ask if you'd like it rolled out everywhere.

## License branding

The license system now identifies itself as `SOHAM.LICENSE v5.4` in
server logs, the license-invalid error page, the site footer, and a
public `GET /api/license-info` endpoint (returns name/version/valid
status only — never the actual key).

## Parent accounts (separate from admin)

- `POST /api/auth/register` and `POST /api/auth/login` create/verify a
  parent account and set a `soham_user_token` cookie (30-day JWT).
- `/account` is a protected page that only renders for a logged-in
  parent; otherwise it redirects to `/login.html`.
- Parent and admin sessions are independent — logging in as one does
  not affect the other.

## Where data is stored (no database)

Enquiries and parent accounts are stored as JSON files under `/data`
(`data/enquiries.json`, `data/users.json`, `data/gallery.json`,
`data/announcements.json`), created automatically on
first use. Uploaded admission-proof photos go in `/data/uploads` and
are served back at `/uploads/<filename>`. There is no MongoDB or other
database.

**Important:** Render's free-tier filesystem is ephemeral — anything in
`/data` can be wiped on redeploy or when the service restarts/sleeps.
This is fine to get a real, working admin panel today. If you need
enquiries, accounts and uploaded photos to survive redeploys
long-term, either:
- attach a [Render persistent disk](https://render.com/docs/disks)
  mounted at `/data`, or
- move `store.js` to a real database later (Postgres, MongoDB, etc.)
  without changing any of the route logic.

## Auto-generated fallback credentials (read this before going live)

If you deploy **without** setting `LICENSE_KEY` / `LICENSE_KEY_HASH`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, or `JWT_SECRET`, the server
will still boot: it auto-generates working values and prints the
admin username/password to the server logs once on startup so you can
still log in. This is convenient for a first test deploy, but it is
**not secure for a real, live admissions site**, because:
- the generated password changes every time the service restarts
  (Render can restart it any time), so you can get locked out or
  confused about which password is current;
- anyone with access to your Render logs can read the password;
- the license key isn't a real access-control secret in this mode —
  it's just generated in-memory and thrown away on restart.

Before going live, set your own values (steps 2–3 above) so the
fallback never triggers.

## Admission proof photos

The enquiry form on the homepage has an optional photo attachment
(e.g. a prior artwork sample or ID as proof). It's capped at 5MB,
image files only (jpg/png/webp/heic), and shows up as a thumbnail next
to each enquiry in the admin dashboard — click it to view full size.

## Email notifications (optional)

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
`NOTIFY_EMAIL` to get an email every time someone submits the enquiry
form. If any of these are missing, notifications are silently skipped
— enquiries still land in the admin dashboard regardless. The admin
dashboard header shows whether email notifications are currently
configured.

## Admin dashboard: search, filter, export

- Search box filters by parent name, child name, phone, or message.
- Status dropdown filters by `new` / `contacted` / `enrolled` / `closed`.
- Results are paginated (25 per page).
- **Export CSV** downloads all enquiries (ignoring the current filter)
  as a spreadsheet-ready CSV file.

## SEO / production basics

- `public/404.html` — a custom not-found page instead of a raw error.
- `public/robots.txt` and `public/sitemap.xml` — replace
  `your-domain-here.onrender.com` in both `sitemap.xml` and the
  `<link rel="canonical">` / Open Graph tags in `public/index.html`
  with your real deployed domain once you have one.

## Admission window

Admissions are only accepted in June, July, and August (server time).
Outside that window, `POST /api/enquiry` returns a 403 with an
explanatory message, and the homepage banner reflects the same status
via `GET /api/admission-status`. To change the months, edit
`isAdmissionOpen()` in `server.js`.

## Social links

Instagram, Facebook and YouTube links in the header/footer currently
point to placeholder handles (`instagram.com/meerasmriti`, etc.) —
swap in your real handles in `public/index.html` before going live.

## WhatsApp number

All WhatsApp links use `+91 79474 16674` (`wa.me/917947416674`). If
this isn't the right number or country code, search-and-replace
`917947416674` across `public/index.html` and `public/account.html`.
