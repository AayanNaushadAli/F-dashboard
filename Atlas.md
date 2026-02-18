# 📈 Atlas Strategy: Order Flow Mean Reversion

**Agent:** Atlas  
**Focus:** Binance Testnet (Scalping)  
**Risk Profile:** Strict (2% per trade)

---

## 1. Core Indicators
* **OBI (Order Book Imbalance):** Ratio of buy vs. sell orders in the top 50 levels.
* **Spread Monitoring:** Tracking the gap between best bid/ask to avoid illiquid zones.
* **Volume Delta:** Difference between aggressive market buys and sells in the last few seconds.

---

## 2. Entry Logic (The "Trigger")
* **Long Entry:** OBI > 0.65 AND Price <= Lower Bollinger Band (1m Chart).
* **Short Entry:** OBI < 0.35 AND Price >= Upper Bollinger Band (1m Chart).

---

## 3. Risk Management (SOUL.md Rules)
* **Account Balance:** $100.
* **Position Sizing:** 2% ($2) risk per trade.
* **Stop Loss:** 0.5% from entry.
* **Take Profit:** 1.0% (1:2 Risk/Reward).

---

## 🖥️ Dashboard Implementation Tasks
1.  **Depth Visualizer:** Vertical color-shifting bar (Red < 0.5 < Green).
2.  **Atlas "Thought" Log:** Terminal-style window for AI status updates.
3.  **Backtest Overlay:** Button to trigger 24h simulation via OpenClaw.

---

## 🚦 Optimization (15 RPM Limit)
* **Frontend Math:** Calculate OBI locally to save API requests.
* **AI Trigger:** Only call the Surgeon API for execution approval when OBI hits 0.65 or 0.35.