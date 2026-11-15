# CCF Room Booking

Room booking website for CCF dgroups. See `CLAUDE.md` for the project overview and commands.

## Admin setup

Admins log in at `/admin/login` with an email and password. Two things must both be true for someone to get in: they have a user in Supabase, and their email is listed in `ADMIN_EMAILS`.

### 1. Turn off public sign-ups

This stops strangers from creating their own accounts.

1. Go to https://supabase.com/dashboard and open your project.
2. In the left sidebar click **Authentication**.
3. Under **Configuration** click **Sign In / Providers** (older dashboards call this **Providers**).
4. Click **Email** to expand it. Make sure **Enable Email provider** is on.
5. Turn **off** "Allow new users to sign up" (older dashboards call it "Enable sign ups").
6. Click **Save**.

### 2. Create the admin users

1. In the left sidebar click **Authentication**, then **Users**.
2. Click **Add user**, then **Create new user**.
3. Type the admin's email and a strong password (at least 12 characters, not used anywhere else; a password manager is best).
4. Tick **Auto Confirm User**. Without this the admin cannot log in.
5. Click **Create user**. Repeat for each admin.

### 3. Set `ADMIN_EMAILS`

1. In `.env.local`, set `ADMIN_EMAILS` to the same emails you just created, separated by commas, for example `ADMIN_EMAILS=pastor@example.com,secretary@example.com`. Capital letters do not matter.
2. Restart `npm run dev` after saving.
3. On Vercel: open your project, then **Settings**, then **Environment Variables**. Add `ADMIN_EMAILS` (and the other variables from `.env.example`), then redeploy.

A Supabase user who is not in `ADMIN_EMAILS` sees "This account is not an admin." and is signed out straight away.

### Forgot a password?

There is no reset page. In Supabase go to **Authentication**, **Users**, click the three dots next to the person, choose **Delete user**, then create the user again with a new password (step 2).

### Check that it works

1. Open `http://localhost:3000/admin` in a private window. You should land on the login page.
2. Log in with an admin email. You should see the admin header with your email and a **Logout** button.
3. Click **Logout**. Opening `/admin` again should send you back to the login page.
