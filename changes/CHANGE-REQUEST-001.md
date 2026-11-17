# CHANGE-REQUEST-001 — Admin approval instead of instant booking

| | |
|---|---|
| **Date** | 2026-11-16 |
| **Requested by** | Owner |
| **Decision** | Accepted: **D-056** (supersedes D-004) |
| **Spec** | `RFCs/RFC-010-Admin-Approval.md` |

## Request (owner's words)
"Instead of an auto confirmation, I want the admin to be able to confirm if a booking can go through or not. After a user books, the 'confirmed screen' becomes an 'approval pending' screen. The admin screen has to change too: add a section that allows the admin to approve or decline bookings. A success and fail email must be sent after the admin has made his decision."

## Summary assessment
Accept now, as one new RFC (RFC-010) built after RFC-008 and **before** RFC-009 (deploy and launch checks), so launch tests the real flow. It reverses D-004 and PRD §3's non-goal, which the owner has explicitly approved. Ripple is kept small by keeping `booked` as "approved" and adding only `pending` and `declined`, so blocks, `cancelByToken`, RFC-006 and the admin cancel stay as they are.

## 1. Classification
| Change | Type | Size | Priority |
|---|---|---|---|
| Pending status, slot hold, migration | Technical change | Medium | Must |
| "Approval pending" screen replaces "Room reserved!" | Feature modification (FR-11) | Small | Must |
| No email at submission; approved and declined emails | Feature modification (FR-12, FR-13) + new feature (FR-23) | Medium | Must |
| Pending requests section with Approve and Decline | New feature (FR-22) | Medium | Must |
| Day grid and list distinguish pending | Feature modification (FR-16, FR-19) | Small | Must |
| Landing copy and demo card | Feature modification (D-053 mirror) | Small | Should |

## 2. Impact analysis
### Conflict check
- **D-004** (instant confirmation, no approval): reversed. Original rationale was simplicity for a 2-week MVP. The owner now wants control over who gets rooms; marked `Superseded by D-056`.
- **PRD §3 non-goal** "Admin approval workflow (bookings confirm instantly)": removed. PRD §1, §3, FR-5, 9, 11–14, 16, 19, §7, J1, J3, §9 updated; FR-22, FR-23 and J6 added.
- **D-010** (cancel via the link in the confirmation email): still holds; the link now arrives in the approved email.
- **D-050 / D-051** (confirmed screen look): layout kept; wording, icon and the email-failed branch change.
- **D-053** (landing demos mirror the booking screen): kept by changing the demo's end card and step 3 copy.
- **D-019 vs owner rule**: D-019 allows SQL comments, but the owner asked for no comments in new code, so the migration has none.
- **RULES.md**: no rule is violated. R-16 (index), R-17 (cancel only via `cancelByToken`), R-21 (`requireAdmin()` first), R-22 (privacy), R-23 (plain-text email) are all kept. R-15 gained a sentence on statuses. R-02 (number order) has a documented exception: 010 before 009.
- **Product differentiator** "self-service booking" (PRD §1): weakened slightly, since members wait for a decision. Mitigated by holding the slot immediately.

### Affected work
| Area | Impact |
|---|---|
| RFC-005 (`book`, email, success screen) | Insert `pending`, drop submission email, new screen |
| RFC-006 (cancel page) | None in code; link source changes |
| RFC-008 (admin grid, list, block form) | Pending section, labels, queries, overlap message |
| RFC-009 (launch) | Must run after 010; email check now goes through approval |
| Database | Migration on the live DB (check constraint + index) |
| Landing page | Step 3 copy, demo card |

## 3. Implementation strategy
Implement immediately as RFC-010 (High complexity, ~1–2 days), then RFC-009. Testing: two new pure helpers in `lib/rules.ts` (`hasStarted`, `formatSubmitted`) with asserts; 11 manual steps in RFC-010 cover hold, approve, decline, double-decide, email failure and auth.

### Alternatives rejected
| Option | Why rejected |
|---|---|
| Rename `booked` → `approved` | Touches blocks, `cancelByToken`, RFC-006, every query and existing rows for no user-visible gain |
| Pending requests don't hold the slot | Two people could request the same hour; admins would have to arbitrate conflicts |
| Email at submission ("we got your request") | Owner asked for emails after the decision only; one more email to maintain |
| Show expired requests as "expired" | Extra UI state; excluding them is simpler and they block nothing |
| Client-side `useActionState` for decision feedback | Redirect with query params (like D-035) works without JavaScript and needs no new client file |
| Auto-expire unreviewed requests with a cron | Not requested; noted as a possible follow-up |

## 4. Documentation updates (all applied together)
- `DECISIONS.md`: D-056 added; D-004 marked superseded.
- `PRD.md`: §1, §3, FR-5, FR-9, FR-11 – FR-14, FR-16, FR-19 changed; FR-22, FR-23, J6 added; §7 data model, J1, J3, §9 metric, §10 timeline updated.
- `FEATURES.md`: F-09, F-10, F-11, F-18 amended; F-21 added; "Admin approval workflow" removed from the not-in-MVP table; totals updated. IDs not renumbered.
- `RULES.md`: R-15 extended.
- `RFCS.md`: RFC-010 row, graph, critical path, exception note, timeline, coverage.
- `RFCs/RFC-005`, `RFC-008`, `RFC-009`: "Amended by RFC-010" notes; RFC-008 successor and RFC-009 predecessor updated.
- `RFCs/RFC-010-Admin-Approval.md`: new.
- Code and `supabase/` changes: listed in RFC-010 (not done in this change request).

## 5. Stakeholders
- **Owner:** must run the migration (click-by-click steps in RFC-010) before deploying.
- **Church admins:** new daily task of reviewing requests; tell them before launch.
- **Members:** bookings are no longer instant; landing copy explains it.

## 6. Risks
| Risk | Mitigation |
|---|---|
| Admins are slow, so requests hold rooms that stay unused | Oldest-first list; follow-up auto-expiry if it happens |
| New code deployed before the migration → every booking fails | RFC-010 user steps say run the migration first |
| Double decision sends two emails | Single conditional update on `status='pending'` |
| Decision email fails and the booker never hears | Warning notice shows name, email and contact to the admin |
| Wrong email typed at submission isn't caught early | Admin sees the email on the card |
| **Not doing it:** owner loses control over who uses rooms | — |

## Recommendation
Proceed with RFC-010 now, before RFC-009.
