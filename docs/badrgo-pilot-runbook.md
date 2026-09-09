# Badrgo ride voucher operations

The Badrgo integration is an ongoing voucher program. Inventory can be
replenished at any time while claims are active. A verified user may receive
one new code in a Qatar calendar week only after their current code is reported
as redeemed by Badrgo.

## Security and cost model

- Voucher values are stored only in the server-only
  `voucherPrograms/badrgo-rides/voucherCodes` collection.
- Firestore rules deny all mobile and browser access, including admin browser
  sessions. Operational access is through authenticated admin callables.
- Code document IDs are SHA-256 fingerprints, preventing duplicate inventory
  across replenishment batches without exposing codes in paths.
- Claim allocation, weekly identity locking, code assignment, and counters are
  committed in one Firestore transaction.
- App Check is required for mobile read and claim callables.
- Imports are capped at 5,000 codes per request to bound execution cost and can
  be repeated without limiting total program inventory.
- The dashboard polls once per minute and returns only the latest 20 batches
  and 20 claims. Raw codes never appear in summaries or logs.

## Adding inventory

1. Open **Admin > Badrgo Vouchers**.
2. Paste one code per line in **Add voucher inventory**.
3. Resolve any local duplicate or format warnings.
4. Select **Add protected inventory**.
5. Confirm the accepted, duplicate, and failed counts in the toast and batch
   history. Retrying the same request ID is idempotent.
6. Activate claims only after available inventory is greater than zero.

Inventory imports do not pause an active program. A code already present in any
older batch is rejected without changing its state.

## Redemption reconciliation

Badrgo must provide used-code data through a trusted report. Until a signed
webhook or API is available, paste the report into **Import Badrgo
redemptions**. Matching assigned codes transition to `redeemed`; repeated
imports are idempotent. Unmatched codes require partner reconciliation and
must not be marked manually without evidence.

An assigned but unredeemed code blocks another claim. Once redeemed, the user
can claim again in a later Qatar week. The week boundary is Monday 00:00
Asia/Qatar.

## Live operations

- **Pause claims** stops new assignments but preserves existing codes and
  allows inventory and redemption imports.
- **End permanently** is irreversible.
- Investigate any partial inventory batch before activating or adding its
  failed values in a new batch.
- Watch available inventory and replenish before it reaches zero.
- Never paste raw codes into tickets, analytics, logs, or chat.

## Incident handling

- Duplicate claim taps return the deterministic claim for the same user/week.
- If allocation reports no inventory while the dashboard shows availability,
  pause claims and compare code-state counts with the program counter.
- A push failure never rolls back an assignment. The user can recover the code
  from the protected Badrgo screen.
- Account switching clears UID-scoped voucher cache entries so one user's code
  cannot remain in another user's mobile session.
