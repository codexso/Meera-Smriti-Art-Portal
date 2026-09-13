# Deploying to Render via GitHub

## Step 1: Push this folder to GitHub

1. Go to [github.com/new](https://github.com/new) and create a new
   repository (e.g. `meera-smriti-website`). Leave it empty — no
   README, no .gitignore (this project already has one).
2. On your computer, open a terminal inside this project folder and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   git push -u origin main
   ```
   Replace the URL with the one GitHub shows you after creating the repo.
3. Refresh the GitHub page — you should see all the project files
   there (`server.js`, `package.json`, `public/`, etc.), but **not**
   `.env` or `node_modules` (the `.gitignore` keeps those out, which
   is correct and intentional — secrets should never be committed).

## Step 2: Generate your real secrets (do this once, locally)

Before deploying for real, generate your own credentials so the app
doesn't fall back to auto-generated ones:

```
node scripts/generate-license-hash.js
node scripts/generate-admin-hash.js "YourStrongPassword123!"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy down the `LICENSE_KEY`, `LICENSE_KEY_HASH`, `ADMIN_PASSWORD_HASH`,
and the random hex string (for `JWT_SECRET`) — you'll paste these into
Render in Step 4.

## Step 3: Create the Render Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com) and log in
   (or sign up — you can sign up with your GitHub account directly).
2. Click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository**, then connect
   your GitHub account if you haven't already, and select the
   repository you pushed in Step 1.
4. Fill in:
   - **Name**: anything, e.g. `meera-smriti-website`
   - **Region**: closest to your users (e.g. Singapore for India)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free is fine to start

## Step 4: Add environment variables

Still on the same setup screen (or under the service's **Environment**
tab after creating it), add these key/value pairs:

| Key | Value |
|---|---|
| `LICENSE_KEY` | (from Step 2) |
| `LICENSE_KEY_HASH` | (from Step 2) |
| `ADMIN_USERNAME` | whatever you want to log in with |
| `ADMIN_PASSWORD_HASH` | (from Step 2) |
| `JWT_SECRET` | (the random hex string from Step 2) |
| `NODE_ENV` | `production` |

Don't add `PORT` — Render sets that automatically.

Optional (only if you want email notifications on new enquiries):

| Key | Value |
|---|---|
| `SMTP_HOST` | your email provider's SMTP host |
| `SMTP_PORT` | usually `587` |
| `SMTP_USER` | your SMTP username |
| `SMTP_PASS` | your SMTP password |
| `NOTIFY_EMAIL` | where you want notifications sent |

## Step 5: Deploy

Click **Create Web Service**. Render will install dependencies, run
`npm start`, and give you a live URL like
`https://meera-smriti-website.onrender.com`.

Watch the **Logs** tab while it boots — you should see:
```
[SOHAM.LICENSE] License verified. Starting server normally.
Server running on port ...
Admission window is currently: OPEN or CLOSED
```

If you instead see a "License check FAILED" message, double-check
that `LICENSE_KEY` and `LICENSE_KEY_HASH` were pasted correctly (no
extra spaces, and they must be the pair generated together in Step 2).

## Step 6: Fix the placeholder domain

Once you have your real Render URL, open `public/index.html` and
`public/sitemap.xml` and replace every occurrence of
`your-domain-here.onrender.com` with your actual domain (search and
replace). Commit and push — Render redeploys automatically on every
push to `main`.

## Making future changes

Any time you edit files and want the live site updated:
```
git add .
git commit -m "Describe what changed"
git push
```
Render automatically redeploys on every push to `main`. No need to
touch the Render dashboard again unless you're changing environment
variables.

## A note on data persistence

Enquiries, parent accounts, and uploaded photos are stored as files on
Render's disk (see `README.md`). On the **free tier**, that disk can
be wiped when the service restarts or redeploys. For a real, live
admissions site where you don't want to risk losing enquiries, attach
a [Render persistent disk](https://render.com/docs/disks) mounted at
`/data` (small monthly cost) once you're ready to go live for real.
