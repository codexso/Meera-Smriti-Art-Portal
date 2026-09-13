# Meera Smriti Sishu Ankan Siksha Kendra

Static site + a small Express server for a license-gated deploy and a
JWT-protected admin panel. No database — nothing is persisted server-side.

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
  `httpOnly`, `sameSite=strict` cookie holding a signed JWT (2 hour
  expiry). Rate-limited to 10 attempts / 15 minutes per IP.
- `GET /admin/dashboard` is only served if that cookie is present and
  verifies — otherwise it redirects to `/admin/login`.
- Logout: `POST /api/admin/logout` clears the cookie.
- There is no database, so nothing about admins or enquiries is
  persisted between deploys beyond what's in your environment variables.
