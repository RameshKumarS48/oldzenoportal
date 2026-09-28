# Dome — flow catalogue

Every workflow dome supports, per tab.

**Interactive version:** <https://claude.ai/code/artifact/e87e8fda-a6b1-41b0-ba6c-186572e1f8be>
— searchable, filterable by role, with each area deep-linking into the live portal.
This file is the in-repo copy of the same content.

**Scope.** Dome is the old Zeno portal plus Swap and Wallet Transactions — five
tabs. The ~24 other routes under `src/app/(app)/` came across when this project
was seeded from `zeno-dashboard` (zeno1.rameshkumar.space) and are not part of
dome; see [Appendix](#appendix--inherited-routes).

**Conventions.** Each flow has an ID, the roles that can run it, the trigger, the
expected result, and its edge cases. `RO` variants describe what a read-only role
sees. Roles are the five in `src/lib/access.ts`:

| # | Role | Vehicle | Scanner | Swap Info | Wallet Info | User Mgmt |
|---|---|---|---|---|---|---|
| 1 | Super Admin | RW | RW | RW | RW | RW |
| 2 | Internal User | RW | RW | RW | RW | — |
| 3 | Internal Viewer | RO | RO | RO | RO | — |
| 4 | External Admin | RW | RW | — | — | — |
| 5 | External Viewer | RO | RO | — | — | — |

`_ro` and `_rw` are separate grants; a read-write role holds both.

---

## F-NAV — Navigation & chrome

| ID | Flow | Roles | Result / edge cases |
|---|---|---|---|
| F-NAV-01 | Sign out from sidebar | all | Session cleared, redirected to `/login` |
| F-NAV-02 | Sign out from topbar | all | Same |
| F-NAV-03 | Collapse / expand sidebar | all | Labels hide, icons remain, titles become tooltips |
| F-NAV-04 | Nav reflects role | all | 5 tabs for Super Admin · 4 for Internal User/Viewer · 2 for External Admin/Viewer |
| F-NAV-05 | Forbidden route by URL | all | `AccessGuard` refuses, naming the module and the role |
| F-NAV-06 | Unauthenticated request | — | `middleware.ts` redirects to `/login`; `/login`, `/invite/*`, `/verify-email/*` stay public |
| F-NAV-07 | Sync live data | all | `GET /api/sheets` pulls weekly bikes-sold actuals; button shows "Syncing…", tooltip shows last sync |
| F-NAV-08 | Sync fails | all | Error stored, button re-enabled, previous data retained |
| F-NAV-09 | Toggle dark mode | all | `.dark` applied to `<html>`, persisted in `zeno-theme` |
| F-NAV-10 | Open Settings | 1, 2 | `AdminGuard` refuses Internal Viewer and both external roles |
| F-NAV-11 | Session expires (24h) | all | Cookie gone → next navigation redirects to `/login` |

---

## F-AU — Sign in (email + OTP)

No passwords exist. Every sign-in is a one-time code. There's no mail service, so
the code is shown in a prototype banner — everything else (randomness, expiry,
attempt counting, lockout) is real.

| ID | Flow | Result / edge cases |
|---|---|---|
| F-AU-01 | Request a code | Random 6 digits, valid 5 minutes, 30s resend cooldown |
| F-AU-02 | Unknown email | "No account found with that email address." |
| F-AU-03 | Inactive account | "Your account is inactive. Contact an administrator." — try `alastair@zeno.earth` |
| F-AU-04 | Verify correct code | Auto-submits on the sixth digit; session set; lands on `/asset-tracking` |
| F-AU-05 | Wrong code | "Incorrect code. N attempts remaining." — counts 4 → 0 |
| F-AU-06 | Five wrong codes | Locked 60s; inputs and Verify disabled; message counts down |
| F-AU-07 | Expired code | "That code has expired. Request a new one."; Verify disabled |
| F-AU-08 | Resend | Disabled for 30s; a new code resets the attempt count and clears any lockout |
| F-AU-09 | Change email | Returns to step 1 and discards the challenge |
| F-AU-10 | Visit `/login` while signed in | Redirected straight to `/asset-tracking` |
| F-AU-11 | Paste a code | Fills all six boxes and submits |
| F-AU-12 | Accept an invite | `/invite/<token>` → confirm name → account created, no password → sign in by code |
| F-AU-13 | Invalid or expired invite | "Invalid invite link" |

---

## F-AT — Asset Tracking

50 seeded vehicles. `vehicle` module.

| ID | Flow | Roles | Result / edge cases |
|---|---|---|---|
| F-AT-01 | Browse and paginate | all | 20 / 50 / 100 per page |
| F-AT-02 | Search | all | VIN, customer, phone, plate, IMEI |
| F-AT-03 | Filter — Immobilization | all | 7 states including the request/ack pairs |
| F-AT-04 | Filter — Date of Sale | all | "Pick Date" reveals a date input |
| F-AT-05 | Filter — Connectivity | all | Online / Offline / GpsOffline / CloudOffline |
| F-AT-06 | Filter — Odo range | all | Modal with From/To; trigger shows `from → to`; blanks mean unbounded |
| F-AT-07 | Filter — Store Code | all | 10 codes |
| F-AT-08 | Filter — VCU / ZeConnect / EVCC | all | Options derived from the data |
| F-AT-09 | Filter — Status / Tenant | all | Tenant includes "None" for unassigned |
| F-AT-10 | Combine filters to nothing | all | "No vehicles match the current filters." |
| F-AT-11 | Sort | all | Any of 16 columns, asc/desc |
| F-AT-12 | Export | all | XLSX of the *filtered* set, branded header row |
| F-AT-13 | Switch List / Map | all | **Map is a placeholder** — see [Known gaps](#known-gaps) |
| F-AT-14 | Open vehicle detail | all | Row click → `/asset-tracking/<vin>` |
| F-AT-15 | Immobilise / Mobilise | 1, 2, 4 | Confirmation modal; badge and detail flip on confirm |
| F-AT-16 | High Refresh Rate · Timeline | all | **Decorative** — label changes only |
| F-AT-17 | Show on Google Map | all | Opens `maps.google.com/?q=lat,long` in a new tab |
| F-AT-18 | Unknown VIN | all | "Vehicle not found." |
| F-AT-RO | Read-only | 3, 5 | Immobilise hidden; browsing, filtering, sorting and export remain |

---

## F-SP — Scanner Provisioning Flow

An event log of scanner-app actions that writes through to Asset Tracking by VIN.
`scanner` module.

| ID | Flow | Roles | Result / edge cases |
|---|---|---|---|
| F-SP-01 | Browse, sort, paginate | all | Newest first by default |
| F-SP-02 | Search | all | VIN, name, phone, RFID, staff, chassis, IMEI, ICCID, EVCC, motor, registration, licence |
| F-SP-03 | Filters | all | Action type, store code, tenant, credential, bike state, source, sync status, from/to date |
| F-SP-04 | Reset filters | all | Returns to unbounded defaults |
| F-SP-05 | Export | all | XLSX, 25 columns |
| F-SP-06 | Add — Bike Bring Up | 1, 2, 4 | 5-component scan → **creates** the vehicle in Asset Tracking with status `new` |
| F-SP-07 | Add — Tenant Assign | 1, 2, 4 | Sets tenant on the vehicle |
| F-SP-08 | Add — Dispatch | 1, 2, 4 | Sets store code |
| F-SP-09 | Add — Customer Onboarding | 1, 2, 4 | Phone required, VIN optional (customer-only row) |
| F-SP-10 | Add — Bike Assignment | 1, 2, 4 | Requires name + phone + OTP → vehicle becomes `active` with customer and date of sale |
| F-SP-11 | Add — RFID Assignment | 1, 2, 4 | Writes the tag onto the vehicle |
| F-SP-12 | Add — Handover | 1, 2, 4 | Captures signature; no vehicle state change |
| F-SP-13 | Add — Deactivate | 1, 2, 4 | Vehicle → `used`, RFID cleared, customer blanked |
| F-SP-14 | Validation | 1, 2, 4 | VIN required unless customer-only · phone required for onboarding · assignment needs name + phone + OTP · Performed By always required |
| F-SP-15 | One RFID per VIN | 1, 2, 4 | A second active tag is blocked, naming the existing one |
| F-SP-16 | RFID override | 1, 2, 4 | The word `override` in Notes permits the reassignment |
| F-SP-17 | Retry a pending RFID | 1, 2, 4 | Pending → Assigned, and the tag syncs to the vehicle |
| F-SP-18 | Edit an entry | 1, 2, 4 | Re-runs validation and write-through |
| F-SP-19 | Delete an entry | 1, 2, 4 | Warns that vehicle state already written is **not** reversed |
| F-SP-20 | Auto-link phone ↔ VIN | 1, 2, 4 | A later row sharing a phone back-fills `linkedVin`; a link icon appears in Source |
| F-SP-RO | Read-only | 3, 5 | Add Entry, row Edit/Delete and RFID Retry hidden; the Actions column disappears |

---

## F-SW — Swap Transactions

Two views behind one dropdown; Tampering Alerts is the default. `swap_info` module.

| ID | Flow | Roles | Result / edge cases |
|---|---|---|---|
| F-SW-01 | Switch view | 1, 2, 3 | Tampering Alerts ↔ All Swap Transactions |
| F-SW-02 | Alert summary | 1, 2, 3 | Pending · approved this week · KES debited · RFID currently disabled |
| F-SW-03 | Escalation policy reference | 1, 2, 3 | Expandable 1st/2nd/3rd/4th+ table |
| F-SW-04 | Filter alerts | 1, 2, 3 | Search, status, violation type, offence number, date |
| F-SW-05 | Expand an alert | 1, 2, 3 | Audit trail: detection → review → penalty → notification → RFID events |
| F-SW-06 | Approve | 1, 2 | Penalty prefilled — KES 280, or 560 on twin-station double-bill — and **posts a penalty transaction**; a 3rd+ offence auto-disables the RFID |
| F-SW-07 | Reject | 1, 2 | Requires a reason |
| F-SW-08 | Mark investigating | 1, 2 | Requires notes |
| F-SW-09 | Notify customer | 1, 2 | Approved alerts only; stamps the trail |
| F-SW-10 | Disable RFID | 1, 2 | Approved alerts at offence ≥ 3 |
| F-SW-11 | Re-enable RFID | 1, 2 | Available whenever a tag is currently disabled |
| F-SW-12 | Reopen | 1, 2 | Rejected / investigating → pending, clearing the review |
| F-SW-13 | Swap-record summary | 1, 2, 3 | Swaps · energy · flagged · cross-station · skipped |
| F-SW-14 | Filter records | 1, 2, 3 | Search, station, RFID mismatch, status, date |
| F-SW-15 | Expand a record | 1, 2, 3 | Per-battery bins, billed kWh, slots, Ah, RFID UIDs, recovery evidence |
| F-SW-16 | Derived status | 1, 2, 3 | Precedence: flagged › cross-station › RFID mismatch › skipped › recovered › OK |
| F-SW-17 | Export records | 1, 2, 3 | CSV |
| F-SW-RO | Read-only | 3 | Every review action hidden; stats, filters and the audit trail remain |

---

## F-WA — Wallet Transactions

Two views; the debit/credit ledger is the default. `wallet_info` module.

| ID | Flow | Roles | Result / edge cases |
|---|---|---|---|
| F-WA-01 | Switch view | 1, 2, 3 | Ledger ↔ M-Pesa Recharge Requests |
| F-WA-02 | Ledger summary | 1, 2, 3 | Credited · debited · net · entry count, over completed rows only |
| F-WA-03 | Filter ledger | 1, 2, 3 | Search (incl. VIN and IMEI), direction, 8 categories, date |
| F-WA-04 | Expand a ledger row | 1, 2, 3 | Detail with VIN, IMEI, balance after, and any linked recharge |
| F-WA-05 | Export ledger | 1, 2, 3 | CSV |
| F-WA-06 | Recharge summary | 1, 2, 3 | Requests · total recharged · success rate · failed and pending |
| F-WA-07 | Filter recharges | 1, 2, 3 | Search, status, date |
| F-WA-08 | Expand a recharge | 1, 2, 3 | Full daraja callback payload |
| F-WA-09 | Re-initiate STK push | 1, 2 | Status → pending, try count increments, customer message updated; disabled once successful |
| F-WA-10 | Export recharges | 1, 2, 3 | CSV, mirroring the daraja columns |
| F-WA-RO | Read-only | 3 | Re-initiate disabled everywhere |

---

## F-UM — User Management

`user_management` module — **Super Admin only**.

| ID | Flow | Result / edge cases |
|---|---|---|
| F-UM-01 | Browse roster and pending invites | Invites render below the roster, amber-tinted |
| F-UM-02 | Search | Name or email |
| F-UM-03 | Filter by partner | Zeno plus the six partners |
| F-UM-04 | Filter by role | The five roles |
| F-UM-05 | Clear filters | Resets all three and returns to page 1 |
| F-UM-06 | Invite, step 1 | Full name, email, role, tenant; validates name, email format and tenant |
| F-UM-07 | Invite, step 2 | Read-only summary of exactly what the role grants; the User Management row appears only for Super Admin |
| F-UM-08 | Back from step 2 | Returns to step 1 with the draft intact |
| F-UM-09 | Send invite | Generates a 7-day link with copy and mailto; no email is sent |
| F-UM-10 | Duplicate email | "A user with this email already exists." and returns to step 1 |
| F-UM-11 | Manage a pending invite | Re-show the link, or revoke it |
| F-UM-12 | Edit a user | Name, role, tenant, status; **email is locked** — it's the sign-in identity |
| F-UM-13 | Delete a user | Permanent-delete confirm naming person and email; deleting yourself is blocked |
| F-UM-14 | Access | Any other role is refused, in the nav and by URL |

---

## Known gaps

Documented rather than hidden. Each is a deliberate open item, not a bug to trip over.

1. **Map View is a placeholder.** Asset Tracking's Map tab renders "coming soon",
   although a working MapLibre `FleetMap` exists at `src/components/map/FleetMap.tsx`
   and is used by the inherited `/data/map` route. Wiring it up is small.
2. **High Refresh Rate and Timeline** on the vehicle detail page change their own
   labels and nothing else.
3. **`middleware.ts` only checks that the session cookie exists**, never verifying
   its HMAC — `verifySessionToken` in `src/lib/auth-utils.ts` is unused. Fine for a
   mock-data prototype; not fine for real data.
4. **`SESSION_SECRET` is unset in production**, so the signing key is the hardcoded
   development default.
5. **Next 16.3 deprecates the `middleware` convention** in favour of `proxy`
   (`npx @next/codemod@canary middleware-to-proxy .`).
6. **All data is mock and per-browser.** Stores persist to `localStorage`, so two
   people see independent worlds and a cleared browser resets everything. The one
   exception is `/api/sheets`, which reads a live Google Sheet.

---

## Appendix — inherited routes

These render but aren't dome. They came from `zeno-dashboard` when this project was
seeded from it, and nothing in dome's navigation links to them:

`/dashboard/*` (six preset KPI dashboards, master billing) · `/reports` ·
`/partners`, `/partners/onboard` · `/customers` · `/onboarding` · `/referrals` ·
`/forms`, `/forms/[id]` · `/fleet` · `/data/{vehicles,batteries,swap-stations,fast-chargers,transactions,map}` ·
`/provisioning/{vehicles,batteries,swap-stations,fast-chargers}` · `/settings` ·
`/admin/roles`, `/admin/audit-logs` · `/support/tampering-alerts` ·
`/verify-email/[token]`

They still use the older 14-module permission model in `src/store/roles.ts` and
`src/lib/permissions.ts`, which dome no longer consults. Decide per route whether to
delete, keep as reference, or promote into dome.
