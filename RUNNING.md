# RUNNING THIS PROJECT (read this first)

## The #1 mistake: don't double-click index.html

This is a real web app with a backend (login, admin, file uploads).
Opening `public/index.html` directly in your browser (double-click, or
`file:///C:/.../index.html` in the address bar) will NOT work — links
like `/login.html` will try to go to `C:/login.html` on your hard
drive and fail. There is no way around this; it's how browsers treat
absolute paths on the `file://` protocol. The server has to be running
and you have to visit it through `http://`.

## Running it locally (Windows / Mac / Linux)

1. Install [Node.js](https://nodejs.org) 18 or newer, if you don't have it.
2. Open a terminal / command prompt **inside this folder**
   (the one with `package.json` in it) — e.g. right-click the folder
   and choose "Open in Terminal", or `cd path\to\soham-site`.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Watch the terminal. You should see:
   ```
   Server running on port 3000
   ```
   and, if you haven't set your own admin credentials yet, a printed
   auto-generated username/password.
6. Open your browser and go to:
   ```
   http://localhost:3000
   ```
   **Not** a file path. Now every link (`/login.html`, `/register.html`,
   `/admin/login`, etc.) works, because an actual server is answering
   those requests.
7. To stop the server, go back to the terminal and press `Ctrl + C`.

## Setting real credentials (recommended before going live)

Auto-generated credentials change every restart and get logged in
plain text — fine for a quick look, not for a real site. Set your own:

```
node scripts/generate-license-hash.js
node scripts/generate-admin-hash.js "YourStrongPassword123!"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the printed values into a `.env` file (copy `.env.example` to
`.env` and fill it in) for local runs, or into your hosting provider's
environment variable settings for a real deployment. Full details are
in `README.md`.

## Deploying so it's live on the internet

See `DEPLOY_RENDER.md` for a step-by-step walkthrough of pushing this
to GitHub and deploying it on Render.
