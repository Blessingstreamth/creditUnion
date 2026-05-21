# PUN-220 QA Report (CTO)

Date: 2026-05-21
Issue: PUN-220
Branch: feature/pun6-loan-lifecycle-ui
Repo path: /Users/timem/.paperclip/instances/default/projects/959e9301-2287-423f-a8c4-e6af94f39956/d643bd8f-4066-4cd0-aafc-9b6c6d3bc99e/_default

## What was done
- Reproduced runtime blocker on web: `Metro error: _reactJsxDevRuntime.jsxDEV is not a function`.
- Aligned Expo SDK peer package versions to expected Expo 53 set (`expo-constants`, `expo-linking`, `expo-router`, `react-native`, `react-native-screens`).
- Fixed environment-induced dev/runtime mismatch by forcing development mode in npm scripts (`start`, `android`, `ios`, `web`).
- Fixed Supabase auth storage adapter for web/SSR in `lib/supabase.ts` (fallback from SecureStore to `localStorage`-safe adapter).
- Re-ran smoke: `CI=1 npm run web -- --port 19009` and confirmed web bundle completes without previous Metro crash.
- Re-ran static QA: `npm run lint` (0 errors, 5 warnings).

## Files changed
- `package.json`
  - Updated Expo-compatible dependency versions.
  - Updated scripts to run Expo with `NODE_ENV=development`.
  - Normalized TypeScript version (`~5.8.3` in `devDependencies`).
- `lib/supabase.ts`
  - Added platform-aware auth storage adapter:
    - native: `expo-secure-store`
    - web/SSR: safe `localStorage` adapter guarded by `typeof window`.

## Test environment
- Platform executed: Web smoke (Expo Router)
- Smoke command: `CI=1 npm run web -- --port 19009`
- Lint command: `npm run lint`

## QA Matrix

| Criterion | Result | Notes |
|---|---|---|
| App boots and bundles on web without Metro runtime crash | PASS | Previous `_reactJsxDevRuntime.jsxDEV` blocker resolved. |
| Loan list renders data from `loans` table | PARTIAL | Runtime is unblocked; data-path verification still requires interactive UI run + evidence capture. |
| Status filters work: draft/submitted/approved/active/completed/overdue/all | PARTIAL | Logic exists; full manual filter sweep evidence still pending. |
| Overdue loans use highlight styling | PARTIAL | Code path present; visual confirmation evidence pending. |
| Card shows borrower name, THB amount, Thai status label, next payment due | PARTIAL | Fields present; final UI evidence pending. |

## Current blockers
- No hard runtime blocker remains for web boot.
- Remaining gaps are evidence/acceptance verification, not startup failure.

## Remaining
- Run interactive QA sweep on simulator/device (iOS/Android + web UI walkthrough).
- Capture artifacts required by acceptance (pass path + filter sweep screenshot/video).
- Optionally clean non-blocking lint warnings (5 warnings).

## Owner next step
- Engineering owner: Engineer (routine acceptance run + artifact capture + minor lint cleanup).
- CTO owner: Final acceptance review and close/recommend close after Engineer submits evidence.
