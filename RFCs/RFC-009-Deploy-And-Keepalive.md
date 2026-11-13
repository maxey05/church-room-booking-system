# RFC-009 — Deploy, keep-alive cron, launch checks

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Low | 008 | — | FR-21; §6 cost; §9 metrics; §10 Day 12–14 |

## Summary
Put the app on Vercel Hobby (free), add a daily cron that pings the DB so Supabase Free doesn't pause after 7 idle days, swap in the real room data, and run the full end-to-end pass with real users before launch.

## Files
```
app/api/keepalive/route.ts   GET → db().from("rooms").select("id").limit(1) → 200 {ok:true} | 500 {ok:false}
vercel.json                  {"crons":[{"path":"/api/keepalive","schedule":"0 0 * * *"}]}   (daily, 8 AM Manila)
README.md                    + "Deploy" section and a "Launch checklist" section
supabase/seed.sql            replaced with REAL Floor 1–2 rooms (PRD Q1) or a separate real-rooms SQL
```
The keep-alive route is public and read-only (it returns no data), so it doesn't need a secret.

## Deploy steps (go in README)
1. Push the repo to GitHub (private repo is fine). Confirm `.env.local` is **not** committed.
2. Vercel → New Project → import the repo → Framework: Next.js.
3. Add all 7 env vars from `.env.example`, with `SITE_URL=https://<project>.vercel.app`.
4. Deploy. Check that the Cron Jobs tab lists `/api/keepalive`.
5. Supabase → Authentication → URL Configuration: Site URL = the Vercel URL.

## Launch checklist (go in README)
- [ ] Real rooms loaded (names, pax, size, amenities, photos); placeholders deactivated or deleted.
- [ ] Sign-ups off; admin users created; `ADMIN_EMAILS` set.
- [ ] Church Gmail App Password set, and a test email received on a phone.
- [ ] Full run on production: J1 book → J3 cancel → J4 admin block → J5 admin cancel.
- [ ] 3–5 dgroup members each book on their phones without help, under 2 minutes (PRD §9).
- [ ] Announce the link to dgroups.

## Acceptance criteria
- **AC-9.1** `app/api/keepalive/route.ts` returns 200 `{ok:true}` when the DB is reachable and 500 `{ok:false}` otherwise, with no room data in the body.
- **AC-9.2** `vercel.json` defines the daily cron, and it shows in the Vercel dashboard.
- **AC-9.3** The production site is live on Vercel with all env vars set, and the confirmation email's cancel link points at the production domain.
- **AC-9.4** The real Floor 1–2 rooms are in production and no placeholder rooms are visible.
- **AC-9.5** `README.md` has the "Deploy" and "Launch checklist" sections above.
- **AC-9.6** Every launch checklist item is ticked.
- **AC-9.7** `npm test`, `npm run lint` and `npm run build` pass. The Vercel build is green.

## Test plan
**Automated:** `npm test`.
**Manual:**
1. Local `curl -i localhost:3000/api/keepalive` gives 200. Set a wrong `SUPABASE_SERVICE_ROLE_KEY` and get 500, then restore it (AC-9.1).
2. Vercel → Cron Jobs → "Run" now gives a 200 in the logs (AC-9.2).
3. On production: book with your own email, open the link from the email on your phone, cancel (AC-9.3).
4. Admin flow on production: log in, block, remove the block, log out.
5. User acceptance: watch 3–5 members book without help, note anything that confuses them, and fix any blocking issues before announcing (AC-9.6).
6. After 8 days, check that the Supabase project is still active (not paused).

## Not applicable
New UI, auth changes, caching.
