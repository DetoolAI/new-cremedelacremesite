## Plan — 8 fixes & features

I'll group these into quick wins (do now) and larger feature work (needs your sign-off on UX details).

---

### 1. Owner emails for ALL appointments (#1, #8)
The email queue/cron was re-provisioned last turn. I'll **verify** the queue is draining and that every booking flow (deposit, member, contact form) enqueues an admin email to `angie@cremedelacremenails.com`. If any flow is missing it, I'll add it.

### 2. Remove "cancel / reschedule / 48 hours" language (#2)
Strip the "1 change with 48 hours notice" line from:
- `booking-confirmation.tsx` (the policy block)
- Any other template that mentions reschedule/cancel
- The `/book-now` page footer text if present
Replace with: "To make changes, please call or text us at (347) 880-8282."

### 3. Calendar sync (#3)
Already wired in `book-with-deposit.ts` via `pushBookingToSquare`. Symptom is intermittent. I'll:
- Pull the last 20 bookings from the DB and check `square_sync_error` / `square_booking_id` to see *which* sync failures happened and why
- Surface the actual Square error so we can fix the root cause (likely staff-name → team-member mapping or missing service catalog entry)

### 4. Technician service restrictions (#4)
Add a skills-rule layer: for each staff member, a list of forbidden keywords. When the customer picks a service, the staff dropdown only shows techs whose forbidden list does NOT match.

Rules:
- **Johana** — all services
- **Mary** — no "wax", no "ingrown"
- **Ana, Zuly** — no "acrylic", "nail art", "hard gel", "poly gel"
- **Angie** — no "hard gel", "poly gel", "nail art", "pedicure"

Implementation: a small `STAFF_RESTRICTIONS` map in `src/lib/staff-skills.ts`, used by `BookingModal` to filter the staff list and by the booking API to reject mismatches server-side.

### 5. Auto-confirm after payment (#5) — ✅ already done
`book-with-deposit.ts` already inserts with `status: "confirmed"` after a successful Square charge. I'll verify by reading the latest paid bookings.

### 6. Deposit shown as deduction (#6) — ✅ already done in email
The booking confirmation already shows: Service price → Deposit paid → **Balance due at salon = service – deposit**. I'll verify and tighten the wording so it's labeled as a "credit/deduction" rather than just a balance.

For the **Square POS receipt**, the order line items are: full service price + $2 fee. The $20 deposit payment is recorded against the order with a clear note. To make Square's POS show it as a discount automatically requires switching to Square's Orders/Tenders flow with a partial-payment tender, which is a bigger refactor. I'll **add the deposit as a Square ORDER discount line** so it shows up natively as `-$20.00 deposit credit` on the printed/emailed Square receipt. ← this is the cleanest fix.

### 7. Multi-service in one reservation (#7) — needs your input
Today the booking modal allows ONE service. To support "1 combo OR 1–3 individual services, same tech, one reservation," I need to:
- Convert the modal to a small cart (add/remove service rows)
- Validate: if any selected item is from the "Combos" category, only 1 item allowed total; otherwise 1–3 items
- Sum durations to find a single contiguous slot with the same tech
- Sum prices, charge ONE $20 deposit (not per service), apply discount once
- Emails + Square calendar event lists all services in the notes

This is the largest piece. I'll build it after items 1–6 land, in a separate turn so you can test the simpler fixes first.

### 8. Order of operations
This turn:
- Fix #2 (cancel/reschedule wording)
- Fix #4 (tech restrictions)
- Fix #6 (deposit as Square order discount line)
- Verify #1, #5 (read DB + email log)
- Diagnose #3 (read square_sync_error from recent bookings)

Next turn (after you confirm #1–#6 work):
- Build #7 (multi-service cart)

---

### Question before I start
For **#4 (tech restrictions)**, should "Pedicure" exclude **all** pedicures for Angie (regular, builder, gel, etc.) — yes? And for "Acrylic" on Ana/Zuly, that includes "Acrylic Full Set", "Acrylic Fill", "Acrylic Removal" — yes?