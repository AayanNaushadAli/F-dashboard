# Project Review — portle 1

Date: 2026-02-13
Scope: Full project scan (`src`, SQL schema, build/lint checks)

## Executive Summary

Status: **Needs fixes before production**

- Build: ✅ passes (`vite build`)
- Lint: ❌ fails (6 errors)
- Key risk: **trade execution is not transactional** (can cause inconsistent balances/positions)

---

## 1) Build & Lint Findings

### Build
- `npm run build` succeeds.
- Warning: bundle chunk is large (`~772KB` JS), needs code-splitting for performance.

### Lint (blocking)
`npm run lint` reports 6 errors:

1. `src/components/Dashboard.jsx`
   - `react-hooks/set-state-in-effect` at `setChartData(data)`
2. `src/components/ErrorBoundary.jsx`
   - `error` argument unused in `getDerivedStateFromError`
3. `src/components/Market.jsx`
   - `user` is assigned but unused
4. `src/context/TradingContext.jsx`
   - `react-refresh/only-export-components` (mixed exports in context file)
5. `src/context/TradingContext.jsx`
   - `price` argument in `checkTriggers(price)` unused
6. `src/context/TradingContext.jsx`
   - `sideMulti` unused

---

## 2) Functional / Logic Issues

### A. Non-atomic order flow (High)
File: `src/context/TradingContext.jsx` (`placeOrder`, `closePosition`)

- `placeOrder` does:
  1) update profile balance
  2) insert position
- If step 2 fails, rollback is attempted manually.

Why this is risky:
- Race conditions and partial failures can still leave inconsistent state.
- Two fast orders can read same balance and overspend (no DB transaction/locking).

Recommendation:
- Move trade open/close logic to Supabase RPC (Postgres function) with a single transaction.
- Enforce balance constraints in DB layer.

### B. Missing error handling in close flow (High)
File: `src/context/TradingContext.jsx` (`closePosition`)

- `trade_history` insert result is not checked.
- Balance update executes even if history insert fails.

Impact:
- P&L accounting can become inconsistent (balance changes without history row).

Recommendation:
- Validate errors for every DB step.
- Prefer a single transactional RPC for close operation.

### C. Input validation gaps (Medium)
File: `src/components/Market.jsx`, `src/context/TradingContext.jsx`

- User can type leverage/amount freely.
- No strict guards against zero/negative/NaN values before calculations.
- Liquidation formula divides by leverage; invalid values can produce bad outputs.

Recommendation:
- Clamp leverage range (e.g., 1..50).
- Require amount > 0 and finite.
- Reject invalid payloads in both UI and server-side RPC.

### D. Route protection missing (Medium)
Files: `src/App.jsx` and pages

- Routes like `/market` and `/profile` are not protected with auth guards.
- Components may render partially before user context resolves.

Recommendation:
- Add protected route wrapper for authenticated pages.

---

## 3) Data / Security Observations

### A. `.env` present with anon key (Low/Info)
- `VITE_SUPABASE_ANON_KEY` is exposed in frontend by design (anon/public key).
- Still, avoid committing `.env` in public repos unless intended.

### B. SQL schema robustness (Medium)
File: `supabase_schema.sql`

- No explicit check constraints for values (e.g., positive leverage, margin > 0).
- Trading integrity is mostly enforced in app code, not DB.

Recommendation:
- Add DB constraints + RPC transaction logic.

---

## 4) Performance / UX Issues

1. Large JS bundle warning from Vite (~772KB) → slower first load.
2. `Dashboard` computes chart in an effect and sets local state; can be simplified via `useMemo`.
3. Some computed UI indicators appear placeholder (e.g., Total Balance `+0.0% all time`).

---

## 5) Suggested Fix Priority

### Immediate (P0)
1. Fix transactional integrity for open/close trades (RPC + DB transaction).
2. Add strict error handling in `closePosition`.
3. Resolve lint errors so CI can enforce quality.

### Next (P1)
4. Add input validation and auth route guards.
5. Add DB constraints for key numeric fields.

### Later (P2)
6. Bundle splitting and performance tuning.
7. Clean minor UX placeholders.

---

## Verdict

The project is a strong prototype, but **has real consistency risks in trade/accounting flows**. It should not be considered production-safe until transactionality and validation are fixed.
