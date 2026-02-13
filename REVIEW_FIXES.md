# REVIEW_FIXES — portle 1

Date: 2026-02-13

## What was fixed

### 1) Lint failures resolved
- Fixed `Dashboard` effect/state pattern by deriving `chartData` with `useMemo`.
- Fixed `ErrorBoundary` unused argument warning.
- Removed unused `user` variable in `Market`.
- Removed unused variables and adjusted trigger helper in `TradingContext`.
- Eliminated `react-refresh/only-export-components` issue by splitting context core/hook:
  - `src/context/TradingContextCore.js`
  - `src/context/useTrading.js`

### 2) Route protection added
- Added `ProtectedRoute` component.
- Protected `/`, `/market`, `/profile`.
- Public routes kept for `/login` and `/signup`.

### 3) Bundle/performance improvement
- Added route-level code splitting (`React.lazy` + `Suspense`) in `App.jsx`.
- This removed prior large-chunk warning by splitting pages into separate bundles.

### 4) Trading safety improvements
- Added strict validation for order amount, leverage range, and price readiness.
- Improved close-position error handling to check DB operation errors explicitly.
- Standardized close timestamp to ISO string.

## Validation run
- `npm run lint` ✅ passes
- `npm run build` ✅ passes

## Remaining important recommendation (not fully solved in frontend)
- For true accounting consistency, move open/close trade operations into a **single Supabase RPC transaction** (DB-level atomicity). Current code is safer than before but still app-driven.
