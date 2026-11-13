# RFC-001 — Project setup and shared helpers

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Low | — | 002 | §6 cost, time zone, maintainability; §7 stack |

## Summary
Scaffold the Next.js 16 app, install the only dependencies the project will use, and create the shared modules every later RFC builds on: booking-rule constants, Manila time helpers, formatters, the Supabase client helpers, and the `npm test` self-check.

## Technical approach
- Scaffold with `create-next-app` (TypeScript, Tailwind, ESLint, App Router, no `src/`, alias `@/*`, npm).
  - If it refuses because the folder isn't empty, move every existing file (`CLAUDE.md`, `DECISIONS.md`, `DESIGN.md`, `PRD.md`, `RFCS.md`, `README.md`, `.gitignore`, `RFCs/`, `design/`) out temporarily, scaffold, then move them back. **Don't overwrite `CLAUDE.md`.**
  - **Merge the `.gitignore` files:** keep the owner's existing entries (the `# documentation` block) and add the scaffold's entries plus `!.env.example`.
- **Turn off Cache Components:** delete `cacheComponents` and `partialPrefetching` from `next.config.ts`, and keep the Tailwind turbopack rule the scaffold added. Every page in this app shows live booking data, so it should render on each request. With Cache Components on, every data read would need extra Suspense wrapping for no benefit.
- Runtime deps: `@supabase/supabase-js`, `@supabase/ssr`, `nodemailer`. Dev deps: `@types/nodemailer`. **No other packages.**
- Tests run as plain Node TypeScript (`node file.ts`; Node ≥ 23.6 strips types). This needs `"allowImportingTsExtensions": true` in `tsconfig.json` so the test file can import `./rules.ts`.

## Files
```
next.config.ts          cacheComponents/partialPrefetching removed
tsconfig.json           + allowImportingTsExtensions
package.json            + "test" script
.gitignore              + "!.env.example"
.env.example            every env var, with comments on where to find each
lib/rules.ts            constants + time/format helpers + groupByToken
lib/rules.test.ts       assert-based self-check
lib/supabase.ts         db(), authClient(), types Room/Booking (requireAdmin added in RFC-007)
app/layout.tsx          site header "CCF Room Booking", <main> container (max-w 1120px, gutters 16/24/32px per DESIGN.md §4), metadata, font via next/font per DESIGN.md §3 (Inter, provisional)
app/globals.css         Tailwind import + one @theme block with every DESIGN.md §2 color token (and radius tokens §5); light only, no dark mode
app/page.tsx            placeholder "Coming soon" (replaced in RFC-003)
public/                 starter SVGs deleted
```

## Interfaces
```ts
// lib/rules.ts
export const TZ = "Asia/Manila";
export const OPEN_HOUR = 7;         // first slot 7:00–8:00 AM
export const CLOSE_HOUR = 22;       // last slot 9:00–10:00 PM
export const MAX_DAYS_AHEAD = 30;
export const HOURS: number[];       // [7, 8, …, 21] (15 slots)
export function manilaNow(now?: Date): { date: string /*YYYY-MM-DD*/; hour: number /*0–23*/ };
export function addDays(date: string, n: number): string;           // UTC-safe date math on YYYY-MM-DD
export function formatHour(h: number): string;                      // 7 → "7:00 AM", 12 → "12:00 PM", 22 → "10:00 PM"
export function formatRange(hours: number[]): string;               // [19,20] → "7:00 PM – 9:00 PM" (any order)
export function formatDate(date: string): string;                   // "2026-11-14" → "Sat, Nov 14" (DESIGN.md §3)
export function groupByToken<T extends { cancel_token: string; hour: number }>(rows: T[]): (T & { hours: number[] })[];

// lib/supabase.ts
export type Room = { id; name; floor; size_sqm; pax; description; photo_url; amenities: string[] };
export type Booking = { id; room_id; date; hour; kind: "booking"|"block"; name; email; contact; dgroup_leader; cancel_token; status: "booked"|"cancelled" };
export function db(): SupabaseClient;             // service-role key, persistSession: false. Server only.
export async function authClient(): SupabaseClient; // @supabase/ssr createServerClient over next/headers cookies(); setAll wrapped in try/catch
```
`manilaNow` uses `Intl.DateTimeFormat("en-CA", { timeZone: TZ, hourCycle: "h23", … }).formatToParts`.

### Env vars (`.env.example`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAILS` (comma-separated), `SITE_URL`.

## Edge cases
- `formatHour(12)` is "12:00 PM", `formatHour(0)` is "12:00 AM", `formatHour(22)` is "10:00 PM".
- `manilaNow` must give the Manila date even when the UTC date is still the day before (16:00Z and later is already the next day in Manila).
- `db()` and `authClient()` must be **functions**, not clients created when the module loads, so `next build` works without env vars set.

## Acceptance criteria
- **AC-1.1** `npm run dev` serves the placeholder home page with the "CCF Room Booking" header.
- **AC-1.2** `next.config.ts` has no `cacheComponents` or `partialPrefetching`. `public/` has no starter SVGs.
- **AC-1.3** `package.json` dependencies are exactly next, react, react-dom, @supabase/supabase-js, @supabase/ssr and nodemailer. Dev deps are the scaffold's plus @types/nodemailer.
- **AC-1.4** `lib/rules.ts` exports everything in Interfaces, with `OPEN_HOUR=7`, `CLOSE_HOUR=22`, `MAX_DAYS_AHEAD=30` and `HOURS.length === 15`.
- **AC-1.5** `lib/supabase.ts` exports `db`, `authClient`, `Room` and `Booking`. Nothing creates a client at import time.
- **AC-1.6** `.env.example` lists all 7 env vars with comments. `.gitignore` ignores `.env*` but not `.env.example`, and still has the owner's original `# documentation` entries.
- **AC-1.7** `npm test` runs `lib/rules.test.ts` and prints a pass message (no Node type warning shown).
- **AC-1.8** `npm run lint` and `npm run build` pass with no `.env.local` present.
- **AC-1.9** `app/globals.css` defines all DESIGN.md §2 color tokens in `@theme`. The layout uses `bg-bg`/`text-ink`, the 1120px max width and the DESIGN.md gutters.

## Test plan
**Automated (`npm test`, `lib/rules.test.ts`):**
- `manilaNow(new Date("2026-11-13T02:30:00Z"))` returns `{date:"2026-11-13", hour:10}`.
- `manilaNow(new Date("2026-11-13T16:30:00Z"))` returns `{date:"2026-11-14", hour:0}` (crossing the date line).
- `addDays("2026-12-31", 1)` is `"2027-01-01"`. `addDays("2026-11-13", 30)` is `"2026-12-13"`.
- `formatHour` for 7, 12, 21 and 22. `formatRange([20,19])` is `"7:00 PM – 9:00 PM"`. `formatRange([11])` is `"11:00 AM – 12:00 PM"`.
- `formatDate("2026-11-14")` is `"Sat, Nov 14"`.
- `HOURS[0]===7`, `HOURS.at(-1)===21`, length 15.
- `groupByToken` with tokens a,a,b gives hours `[[9,10],[9]]`.

**Manual:** run AC-1.1, then `npm run lint` and `npm run build`.

## Not applicable
Database (RFC-002), auth (RFC-007), caching (turned off on purpose), state management.
