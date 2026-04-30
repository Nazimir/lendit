# LendIt

A peer-to-peer item lending app. Like eBay but for borrowing — no money, just neighbours sharing.

## What you're getting

A working web app (also installs as a phone app via "Add to Home Screen") with:

- Email/password signup, profile with photo + suburb
- List items you own with photos, category, max loan period
- Browse and search items near you
- Send borrow requests with a message
- Lender accepts/declines; expires after 48 hours
- In-app messaging tied to each request and loan
- Loan lifecycle: handover photo → active → return → return photo → complete
- Star ratings + reviews after each loan
- Mobile-friendly, installable, soft sage green styling

Phase 2 (later): phone verification, scheduled reminder notifications, extension requests, disputes, push notifications, geo-distance ranking, social account trust boost.

---

## How to get this online (one-time setup, ~25 minutes)

You'll create three free accounts: GitHub, Supabase, Vercel. No coding required — just clicking and copy-pasting keys.

### Step 1 — Put the code on GitHub (5 min)

GitHub is just where the code lives so Vercel can pull it.

1. Go to **github.com** and sign up (free). Verify your email.
2. Click the **+** in the top right → **New repository**.
3. Repository name: `lendit`. Keep it Public. Click **Create repository**.
4. On the next screen, click **uploading an existing file**.
5. Drag the entire `lendit` folder contents (everything inside, not the folder itself) into the upload box.
6. Click **Commit changes**.

Done — your code is on GitHub.

### Step 2 — Set up Supabase (10 min)

Supabase is the database + login system + photo storage. Free.

1. Go to **supabase.com** → **Start your project** → sign up with GitHub.
2. Click **New project**.
   - Name: `lendit`
   - Database password: click **Generate a password**, then copy it somewhere safe.
   - Region: pick the one closest to you.
   - Click **Create new project**. Wait ~2 minutes while it provisions.
3. Once ready, go to the left sidebar → **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` from this codebase, copy the entire contents, paste into the SQL editor, click **Run**. You should see "Success." This creates everything: data types, security rules, *and* the three photo storage buckets.
5. Go to **Project Settings** (gear icon, bottom left) → **API**.
   - Copy the **Project URL** — you'll paste it into Vercel in a moment.
   - Copy the **anon / public** key.
   - Keep this tab open.

### Step 3 — Deploy on Vercel (5 min)

Vercel turns the GitHub code into a live website.

1. Go to **vercel.com** → **Sign Up** → use GitHub.
2. Click **Add New** → **Project**.
3. Find your `lendit` repository → click **Import**.
4. Expand **Environment Variables** and add two:
   - `NEXT_PUBLIC_SUPABASE_URL` = (paste the Project URL from Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (paste the anon key from Supabase)
5. Click **Deploy**. Wait ~2 minutes.
6. You'll get a URL like `lendit-xyz.vercel.app`. That's your live app.

### Step 4 — Tell Supabase about your live URL (2 min)

So login emails point to the right place.

1. Back in Supabase → **Authentication** → **URL Configuration**.
2. Site URL: paste your Vercel URL (e.g. `https://lendit-xyz.vercel.app`).
3. Redirect URLs: add `https://lendit-xyz.vercel.app/**`.
4. Save.

That's it. Open your Vercel URL on your phone, sign up, list an item, and it's working.

---

## Installing it as a phone app

On iPhone: open the URL in Safari → tap Share → **Add to Home Screen**.
On Android: open in Chrome → menu → **Install app**.

It now opens full-screen with its own icon. No App Store needed.

---

## Changing the accent colour later

Open `tailwind.config.ts`, find the `accent` colour values, swap the hex codes. Redeploy by pushing to GitHub — Vercel auto-redeploys.

---

## File map (so you know what's what)

```
supabase/schema.sql        ← all data types, tables, security rules
src/app/                   ← every page in the app
src/components/            ← reusable bits (cards, nav, buttons)
src/lib/                   ← shared code (database connection, helpers)
tailwind.config.ts         ← colours and styling
package.json               ← list of dependencies
```

You shouldn't need to touch any of this unless you want to tweak something. Ask me when that day comes.
