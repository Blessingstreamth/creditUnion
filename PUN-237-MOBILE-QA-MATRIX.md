# PUN-237 Mobile QA Matrix (Loan List)

Date: 2026-05-21
Issue: PUN-237
Scope: Execute mobile QA matrix for loan list (iOS + Android)
Repo path: /Users/timem/.paperclip/instances/default/projects/959e9301-2287-423f-a8c4-e6af94f39956/d643bd8f-4066-4cd0-aafc-9b6c6d3bc99e/_default

## What was done
- Executed mobile smoke boot commands for both platforms:
  - `CI=1 npx expo start --android --port 19011`
  - `CI=1 npx expo start --ios --port 19012`
- Re-validated code-level loan list acceptance paths in:
  - `app/(app)/loans.tsx`
  - `hooks/useLoans.ts`
- Re-ran static quality check:
  - `npm run lint` (0 errors, 5 warnings)

## Execution output summary
- Android boot failed due to missing local Android SDK/ADB:
  - `Failed to resolve the Android SDK path`
  - `Error: spawn adb ENOENT`
- iOS boot failed due to unavailable simulator runtime on this machine:
  - `Unable to boot device because we cannot determine the runtime bundle`

## QA Matrix

| Criterion | Android | iOS | Result | Evidence |
|---|---|---|---|---|
| Metro starts without previous runtime crash | PASS (Metro starts, device attach fails later) | PASS (Metro starts, simulator boot fails later) | PARTIAL | Expo logs from smoke commands |
| Loan list fetches from `loans` table | CODE-PASS | CODE-PASS | PARTIAL | `hooks/useLoans.ts` uses `supabase.from('loans').select(...)` |
| Status filters work (`all`, `draft`, `pending_approval`, `approved`, `active`, `paid_off`, `defaulted`, `rejected`, `cancelled`) | CODE-PASS | CODE-PASS | PARTIAL | `FILTER_KEYS` + `filtered` logic in `app/(app)/loans.tsx` |
| Overdue highlight shown for overdue active loans | CODE-PASS | CODE-PASS | PARTIAL | `isLoanOverdue` + `cardOverdue` + overdue badge in `loans.tsx` |
| Card shows borrower, amount, status label, due date | CODE-PASS | CODE-PASS | PARTIAL | `LoanCard` renders `member_name`, THB formatting, translated status, `maturity_date` |
| End-to-end interactive verification on simulator/device | BLOCKED | BLOCKED | BLOCKED | Environment missing Android SDK and valid iOS simulator runtime |

Legend:
- PASS = runtime/proof executed on target
- CODE-PASS = static code path verified, runtime interaction still pending
- PARTIAL = partially verified, acceptance evidence incomplete
- BLOCKED = cannot execute in current environment

## What changed
- Added this report file: `PUN-237-MOBILE-QA-MATRIX.md`
- No source code changes were made for this issue in this heartbeat.

## What remains
- Run interactive QA on real simulator/device for both platforms:
  - Open loan list screen
  - Sweep all status filters
  - Validate overdue visual state
  - Capture screenshot/video artifacts for acceptance

## Owner next step
- Engineer owner:
  - Prepare Android SDK + ADB and valid iOS Simulator runtime on QA machine
  - Execute interactive matrix and attach artifacts
- CTO owner:
  - Review artifacts, confirm acceptance, and close `PUN-237`

## Proposed issue disposition
- Status: `blocked`
- Blocker owner: Engineer (QA environment readiness)
- Unblock action: install/configure Android SDK + iOS simulator runtime, then rerun interactive matrix
