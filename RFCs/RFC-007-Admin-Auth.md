# RFC-007 — Admin login, session, logout

| Status | Complexity | Predecessors | Successors | PRD |
|---|---|---|---|---|
| Ready | Medium | 002 | 008 | FR-15, FR-20 |

## Summary
Lock `/admin` behind Supabase Auth email and password login, **plus** an `ADMIN_EMAILS` allowlist. Keep sessions fresh with a Next 16 `proxy.ts`. Add logout. This RFC only needs the schema and Supabase project, so it can be built alongside RFC-003–006.

## Data flow
```
request /admin/* ─► proxy.ts: createServerClient(request cookies) → auth.getUser() → refreshed cookies on response
/admin page ─► requireAdmin(): authClient().auth.getUser() → email ∈ ADMIN_EMAILS ? user : redirect('/admin/login')
/admin/login form ─► signIn action: signInWithPassword → (allowlisted? redirect('/admin') : signOut + error)
logout button ─► signOut action → redirect('/admin/login')
```

## Files
```
proxy.ts                        Next 16 proxy (formerly middleware); matcher "/admin/:path*"
lib/supabase.ts                 + getAdmin(), requireAdmin()
app/admin/login/page.tsx        email + password form (client part uses useActionState)
app/admin/login/actions.ts      "use server" signIn(prev, form), signOut()
app/admin/layout.tsx            admin header: "Admin", links Day view / Bookings list, signed-in email, Logout button
app/admin/page.tsx              placeholder "Admin dashboard" behind requireAdmin() (RFC-008 fills it in)
README.md                       + "Admin setup" section
```
The admin layout must not call `requireAdmin()` itself, because it also wraps `/admin/login` and that would cause a redirect loop. Every admin **page** and **action** calls it. The layout shows the email and Logout only when `getAdmin()` returns a user.

## Interfaces
```ts
export async function getAdmin(): Promise<User | null>;  // getUser() (server-verified), then email.toLowerCase() ∈ ADMIN_EMAILS (trimmed, lowercased, comma-split)
export async function requireAdmin(): Promise<User>;     // redirect("/admin/login") when null
```
`proxy.ts` follows the standard `@supabase/ssr` pattern: `getAll` from `request.cookies`, and `setAll` writes to both the request and a fresh `NextResponse.next({ request })`. Then it calls `await supabase.auth.getUser()` and returns the response. It does **no** redirecting; pages handle that.

## Errors
| Situation | Message on login page |
|---|---|
| wrong email or password | Incorrect email or password. |
| valid Supabase user not in ADMIN_EMAILS | This account is not an admin. (and sign out right away) |
| missing fields | Please enter your email and password. |

## Security
- Use `auth.getUser()`, not `getSession()`, for authorization. It checks the token with Supabase.
- **Turn off sign-ups** in Supabase (Authentication → Sign In / Providers → "Allow new users to sign up" off). Admins are created by hand under Authentication → Users. The allowlist is a second safety net in case sign-ups are turned back on by mistake.
- The login page is the only public `/admin` route.
- The README tells the owner to use strong passwords. No password reset flow in the MVP; the owner resets passwords in the Supabase dashboard.

## Acceptance criteria
- **AC-7.1** Logged out, `/admin` redirects to `/admin/login`.
- **AC-7.2** An allowlisted user with the correct password reaches `/admin`, and the header shows their email and Logout.
- **AC-7.3** Wrong credentials show "Incorrect email or password."
- **AC-7.4** A real Supabase user **not** in `ADMIN_EMAILS` sees "This account is not an admin." and has no session afterwards (`/admin` still redirects).
- **AC-7.5** Logout clears the session and returns to `/admin/login`. After that, `/admin` redirects.
- **AC-7.6** `proxy.ts` exists with matcher `/admin/:path*`, and the session survives past 1 hour (the token refreshes).
- **AC-7.7** `lib/supabase.ts` exports `getAdmin` and `requireAdmin`, and `app/admin/page.tsx` calls `requireAdmin()`.
- **AC-7.8** `README.md` "Admin setup" covers turning off sign-ups, creating admin users, and setting `ADMIN_EMAILS`.
- **AC-7.9** `npm run lint` and `npm run build` pass.

## Test plan
**Automated:** `npm test` (unchanged). Optionally add an allowlist-parsing helper and test it if it's pulled out as a pure function.
**Manual:**
1. Create users A (in `ADMIN_EMAILS`) and B (not in it) in Supabase.
2. Incognito `/admin`: redirected (AC-7.1).
3. Log in as A with the wrong password, then the right one (AC-7.3, 7.2).
4. Log out, then visit `/admin`: redirected (AC-7.5).
5. Log in as B: "not an admin", and `/admin` still redirects (AC-7.4).
6. Session refresh: log in as A, set the Supabase JWT expiry to 60s (Auth settings), wait 2 minutes, reload `/admin`: still logged in. Set the expiry back (AC-7.6).
7. Try signing up through the API with the anon key (`supabase.auth.signUp`) and confirm it's refused (sign-ups off).

## Not applicable
Booking UI, email, caching.
