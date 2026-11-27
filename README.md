
## Deploy

The site runs on Vercel Hobby (free). A daily Vercel Schedule calls `/api/keepalive` so the free Supabase database does not pause after 7 idle days. The schedule is set in `vercel.json` and is named `keepalive`. It runs every day at 8:00 AM Manila time, and Vercel's free plan may start it up to about 15 minutes late. Vercel Schedules is currently in beta and replaces the older Cron Jobs feature.

Follow the steps in order. Each step says what to click and why.

### 1. Set up the production database

Why: the live site needs its tables and room list in the same Supabase project it will use.

1. Go to https://supabase.com/dashboard and click your project.
2. In the left sidebar click **Table Editor**. Check which tables exist: `rooms`, `bookings`, `settings`, `email_log` and `rate_limits`.
3. If there are no tables, do this:
   1. In the left sidebar click **SQL Editor**, then **New query**.
   2. On your computer open `supabase/schema.sql` in Notepad, press Ctrl+A, then Ctrl+C.
   3. Back in Supabase click inside the editor, press Ctrl+V, then click **Run**. Wait for "Success".
4. If `rooms` and `bookings` exist but `settings`, `email_log` or `rate_limits` is missing, the database was created before admin approval. Run these files from `supabase/migrations/` in this order, using the same copy, paste and Run steps as step 3: `010_approval.sql`, `011_booking_limit.sql`, `012_email_log.sql`, `013_expired_and_cancellation.sql`, `014_rate_limits.sql`. Each file is safe to run again.
5. If `rooms` is empty, run `supabase/seed.sql` with the same steps. Warning: this file deletes every booking, so only run it on a database with no real bookings.
6. Click `rooms` in Table Editor. You should see 15 rows: G4, G5, Singles Lounge, G7, and Room 1 to Room 11.

### 2. Create the Gmail App Password

Why: booking emails are sent from the church Gmail account, and Google requires a separate app password for that.

1. Sign in to the church Gmail at https://myaccount.google.com.
2. Click **Security** in the left panel.
3. Under "How you sign in to Google", click **2-Step Verification** and turn it on if it is off. App passwords require it.
4. Go back to **Security** and click **App passwords**. If you cannot find it, use the search box at the top of the page and type `app passwords`.
5. In the name box type `CCF Room Booking` and click **Create**.
6. Copy the 16-letter password Google shows. It is shown only once, so keep it open until step 4 is done.

### 3. Put the code on GitHub

Why: Vercel builds the site from a GitHub repository. The project already has a GitHub address set up in Git, which you can see with `git remote -v`.

1. Open a terminal in the project folder: in File Explorer click the address bar, type `cmd` and press Enter.
2. Run `git remote -v`. If it shows a `https://github.com/...` address for `origin`, the repository already exists, so skip to step 3. Copy that address from the `(fetch)` line.
3. If `git remote -v` shows nothing, go to https://github.com/new and sign in if asked. Set the repository name, choose **Private**, leave the other boxes unticked, click **Create repository**, copy the address GitHub shows (ending in `.git`), then run `git remote add origin <that address>` in the terminal.
4. Run `git push -u origin <your branch name>`. Your branch name is printed by `git branch --show-current`. The first push may open a GitHub sign-in window; sign in there.
5. Open the repository page on GitHub and refresh it. Confirm that `.env.local` is not in the list of files. It must never be uploaded.

### 4. Create the Vercel project

Why: Vercel hosts the site and runs the daily job.

1. Go to https://vercel.com and click **Sign in with GitHub**.
2. Click **Add New…**, then **Project**.
3. Find `ccf-dgroup-booking-system` in the list and click **Import**.
4. Under **Project Name** type a short name, for example `ccf-room-booking`. Your address will then be `https://ccf-room-booking.vercel.app`. If Vercel adds extra characters because the name is taken, note the exact address it shows after deploying and use that in step 6.
5. Leave **Framework Preset** on **Next.js**.
6. Open **Environment Variables**. For each variable, type its name in **Key**, paste its value in **Value**, then click **Add**. Open `.env.local` in Notepad to copy the values:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`: copy from `.env.local`. They are the same keys as in Supabase under **Project Settings** (gear icon), then **API**.
   - `GMAIL_USER`: the church Gmail address.
   - `GMAIL_APP_PASSWORD`: the 16 letters from step 2. Spaces do not matter.
   - `ADMIN_EMAILS`: the admin emails separated by commas, for example `pastor@example.com,secretary@example.com`.
   - `SITE_URL`: `https://<your project name>.vercel.app` with no slash at the end. Cancel links in emails are built from this value.
7. Click **Deploy** and wait 1 to 3 minutes. Then click **Continue to Dashboard**. If the build fails, open the failed deployment, read the red error line and ask for help with that line.

If you later change any variable, open **Deployments**, click the three dots `⋯` on the newest deployment, choose **Redeploy**. Variables do nothing until you redeploy.

### 5. Check the daily schedule

Why: this proves the database stays awake, which is what the schedule is for.

1. In the Vercel project click **Schedules** in the top menu. You should see a schedule named `keepalive`. If you cannot find it, check the Environment filter at the top is set to Production.
2. If `keepalive` is missing, the `vercel.json` file did not reach GitHub or the deployment did not finish. Go back to step 3 and check the latest deployment under **Deployments** is marked Ready.
3. Click `keepalive`, then click **Run Schedule**. Wait a few seconds and refresh. The execution history on that page should show a successful run.
4. In a new browser tab open `https://<your project name>.vercel.app/api/keepalive`. You should see `{"ok":true}`.
5. If you see `{"ok":false}`, check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel's **Environment Variables** match Supabase exactly, then redeploy.

### 6. Tell Supabase the site address

Why: Supabase uses this address as the default link destination for its own login links.

1. In Supabase click **Authentication** in the left sidebar, then **URL Configuration**.
2. In **Site URL** type `https://<your project name>.vercel.app` with no slash at the end, then click **Save**.

## Launch checklist

Work through these on the live site (`https://<your project name>.vercel.app`) before you announce it.

- [ ] **Rooms.** Supabase → Table Editor → `rooms` has 15 rows and none are marked inactive. Optional details: `pax` and `size_sqm` (numbers), `description` (text), `amenities` typed like `{Projector,Aircon}`, and `photo_url` (a public `https://` link to a JPG or PNG). Empty fields stay hidden on the site.
- [ ] **Admins.** Each admin email exists as a user in Supabase (see Admin setup above), and `ADMIN_EMAILS` on Vercel lists the same emails. Redeploy after any change.
- [ ] **Full run with your own email.** (a) Book a room. The page should say the request is pending. (b) Go to `/admin/login`, log in, open **Pending Requests** and click **Approve**. (c) On your phone open the approval email, check that its cancel link starts with your Vercel address, and cancel the booking from that link. (d) Book again, then cancel it from the admin pages. (e) Use the block form on the admin Calendar page to block a slot, then remove the block. (f) Click **Logout**.
- [ ] **Gmail.** The approval email arrives on your phone, not in spam.
- [ ] **Real users.** 3 to 5 dgroup members each book on their own phone without help, in under 2 minutes (PRD §9). Note anything that confuses them and fix it before you announce.
- [ ] **Announce** the link to the dgroups.
- [ ] **Eight days after launch.** Open Supabase → your project. It should show as active, not paused.
