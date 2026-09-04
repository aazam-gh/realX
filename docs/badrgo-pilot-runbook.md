# Badrgo pilot campaign runbook

This campaign allocates 80 codes on a first-come, first-served basis and keeps
20 codes in a protected reserved pool. A claim is permanent: do not recycle an
assigned code from the realX admin or Firebase console, even if the rider says
they did not use it.

## Safety model

- Only an authenticated realX account with a student profile can claim.
- A Firestore transaction assigns exactly one code to a UID and canonical
  student email, so simultaneous taps cannot over-allocate inventory.
- Coupon documents are not readable by normal Firestore clients. The mobile app
  receives only its authenticated user's assigned code through a callable.
- The first 80 workbook rows are public inventory. Rows 81-100 are reserved.
- Saving the inventory creates a draft. Activation is blocked until the partner
  UI approval checkbox is confirmed.
- A successful new assignment creates one push-delivery record. The notification
  contains no coupon code and directs the user back to the protected in-app view.

## Pre-launch checklist

1. Obtain written approval for the Badrgo logo placement, campaign copy, and
   `Claim my ride code` CTA.
2. Deploy the Firestore rules and campaign functions to the intended Firebase
   project. Deploy the mobile and admin clients only after their normal release
   checks pass.
3. Open **Admin > Pilot Campaign** in the matching environment.
4. Paste all 100 values from the workbook's Codes column. Confirm the page shows
   `100 / 100`, no duplicates, and no invalid values.
5. Confirm the destination URL, English and Arabic copy, and start/end times.
   Times entered in the browser are converted to ISO timestamps.
6. Select **Save protected draft**. The pasted codes are cleared from the page
   after the backend accepts them.
7. Verify the admin summary shows 0/80 public, 0/20 reserved, and 100/100 total.
8. Select the partner-approval checkbox, then **Activate campaign**. A future
   start time keeps the campaign scheduled until that time.

## Live operations

- Watch the public and reserved counters on the admin page. The public campaign
  automatically presents as sold out when 80 public claims are assigned.
- Use **Pause** to stop new public claims without invalidating already assigned
  codes. Use **End** only when the campaign should not resume.
- Assign a reserved code with a verified email or Firebase UID. The recipient
  receives the same protected claim view and one-time notification.
- Never paste or export coupon values into tickets, chat, analytics, or logs.
  Operational reconciliation should use user UID, pool, status, and timestamps.

## Recovery and support

- Repeated claim calls by the same user return that user's existing assignment;
  they do not consume another code.
- The assigned code remains available from the Badrgo screen and redemption
  history, so support should direct the user there instead of exposing a code.
- If inventory or a code document is inconsistent, allocation fails closed and
  does not skip forward. Pause the campaign, inspect the affected sequence, and
  repair it before resuming.
- A failed push does not undo the coupon assignment. The user can still recover
  the code in-app; the delivery record contains the failure status for diagnosis.

## Post-pilot reconciliation

Ask Badrgo for a redemption report keyed by coupon code. Reconcile it in a
restricted operational process against protected assignments, then report only
aggregate totals (assigned, redeemed, unredeemed, public, and reserved). Do not
add raw coupon codes to the general admin dashboard.
