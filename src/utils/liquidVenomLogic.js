export const fetchKlines = async (symbol) => {
    try {
        // Fetch 50 candles (enough for lookback of 20-30)
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=50`);
        const data = await response.json();
        // Map to { high, low, close, open, volume }
        return data.map(k => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));
    } catch (error) {
        console.error('Liquid Venom: Error fetching klines', error);
        return [];
    }
};

/**
 * Project: LIQUID VENOM (V2.0 - Displacement Edition)
 * Strategy: Liquidity Sweep + Fair Value Gap (FVG) Confluence
 */
export const liquidVenomAlpha = (candles, currentPrice) => {
    // Need at least 30 candles for context + pattern
    if (!candles || candles.length < 30) return { signal: 'WAIT', reason: 'Scanning...', lethalityIndex: 'LOW', setup: {} };

    const lookback = 20;
    // We analyze the last 3 *completed* candles
    // c1: Sweep Candle
    // c2: Displacement Candle
    // c3: Confirmation Candle
    const history = candles.slice(-lookback - 3, -3); // Context for Swing High/Low
    const c1 = candles[candles.length - 3];
    const c2 = candles[candles.length - 2];
    const c3 = candles[candles.length - 1];

    const swingHigh = Math.max(...history.map(c => c.high));
    const swingLow = Math.min(...history.map(c => c.low));

    let signal = 'WAIT';
    let reasons = [];
    let setup = { type: '', entry: currentPrice, sl: 0, tp: 0 };
    let metrics = { swingHigh, swingLow };

    /**
     * BULLISH SETUP: Sweep Low + Bullish FVG
     * 1. c1 Sweeps Liquidity (Low < Swing Low)
     * 2. c3 Low > c1 High (Bullish FVG Gap)
     * 3. c2 is Green (Displacement)
     */
    const sweptLow = c1.low < swingLow;
    const bullishFVG = c3.low > c1.high;

    if (sweptLow && bullishFVG && c2.close > c2.open) {
        signal = 'STRONG BUY';
        reasons.push("Liquidity Swept. Institutional Displacement (FVG) detected.");
        setup = {
            type: 'LONG',
            side: 'LONG',
            entry: currentPrice,
            sl: Math.min(c1.low, c2.low),
            tp: currentPrice + (currentPrice - c1.low) * 2,
            fvgZone: `${c1.high.toFixed(2)} - ${c3.low.toFixed(2)}`,
            rrr: '1:2'
        };
    }

    /**
     * BEARISH SETUP: Sweep High + Bearish FVG
     * 1. c1 Sweeps Liquidity (High > Swing High)
     * 2. c3 High < c1 Low (Bearish FVG Gap)
     * 3. c2 is Red (Displacement)
     */
    const sweptHigh = c1.high > swingHigh;
    const bearishFVG = c3.high < c1.low;

    if (sweptHigh && bearishFVG && c2.close < c2.open) {
        signal = 'STRONG SELL';
        reasons.push("Liquidity Hunted. Bearish Imbalance (FVG) confirmed.");
        setup = {
            type: 'SHORT',
            side: 'SHORT',
            entry: currentPrice,
            sl: Math.max(c1.high, c2.high),
            tp: currentPrice - (c1.high - currentPrice) * 2,
            fvgZone: `${c3.high.toFixed(2)} - ${c1.low.toFixed(2)}`,
            rrr: '1:2'
        };
    }

    return {
        botName: "LIQUID VENOM V2",
        signal,
        lethalityIndex: signal.includes('STRONG') ? 'CRITICAL' : 'DORMANT',
        color: signal.includes('BUY') ? 'text-cyan-400' : 'text-fuchsia-500',
        reasons,
        setup,
        metrics
    };
};
