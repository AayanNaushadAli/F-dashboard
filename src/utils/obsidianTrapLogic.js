export const fetchKlines = async (symbol) => {
    try {
        // Fetch 100 candles to ensure enough history for 50-candle lookback
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`);
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
        console.error('Obsidian Trap: Error fetching klines', error);
        return [];
    }
};

/**
 * THE OBSIDIAN TRAP
 * A multi-stage institutional trading strategy.
 * * Logic:
 * 1. Identify Liquidity (Swing High/Low)
 * 2. Wait for Sweep (Wick above/below)
 * 3. Confirm Rejection (Close back inside)
 * 4. Enter on FVG (Displacement)
 */
export const analyzeObsidianTrap = (candles, currentPrice) => {
    if (!candles || candles.length < 60) return { signal: 'WAIT', reason: 'Initializing data...', killzone: 'WAIT' };

    // 1. Session Filter (The Killzone)
    const now = new Date();
    const hour = now.getUTCHours();

    // London Killzone: 7:00 - 10:00 UTC (Approx 2-5 AM EST)
    // New York Killzone: 13:00 - 16:00 UTC (Approx 8-11 AM EST)
    const isKillzone = (hour >= 7 && hour <= 10) || (hour >= 13 && hour <= 16);

    // For visualization, we might want to return the state even if not in killzone, 
    // but the strategy dictates "DORMANT" outside these hours.
    // We will return data but mark signal as SLEEP if strictly following rules.
    const killzoneStatus = isKillzone ? "ACTIVE" : "DORMANT";

    const lookback = 50;
    // Get candles excluding the current live one
    // We need strict indexing
    const closedCandles = candles.slice(0, -1); // All completed candles

    // Current completed candle is the last one in closedCandles
    const currentCandle = closedCandles[closedCandles.length - 1]; // "Confirmation" candle
    const prevCandle = closedCandles[closedCandles.length - 2];     // "Displacement" candle
    const sweepCandle = closedCandles[closedCandles.length - 3];    // "Sweep" candle

    // Identify Major Swings (Liquidity Pools)
    // We look for the highest high of the last 50 candles EXCLUDING the last 3 checks
    const priorCandles = closedCandles.slice(-lookback - 3, -3);
    const swingHigh = Math.max(...priorCandles.map(c => c.high));
    const swingLow = Math.min(...priorCandles.map(c => c.low));

    let signal = 'WAIT';
    let setup = { type: '', entry: 0, sl: 0, tp: 0 };
    let reasons = [];
    let color = 'text-slate-400';

    if (!isKillzone) {
        signal = 'SLEEP';
        reasons.push('Outside Institutional Killzones (London/NY).');
    } else {
        // --- BEARISH SCENARIO (Shorting the Buy-Side Liquidity Raid) ---
        // 1. Did we sweep the high recently? (Sweep Candle wick > Swing High)
        const bearSweep = sweepCandle.high > swingHigh && sweepCandle.close < swingHigh;

        // 2. Was there displacement? (Previous candle was a strong red drop)
        const bearDisplacement = prevCandle.close < prevCandle.open &&
            (prevCandle.open - prevCandle.close) > (sweepCandle.high - swingHigh) * 2;

        // 3. Is there an FVG? (Gap between Sweep Low and Current High)
        // Current candle is testing the gap left by the drop
        const bearishFVG = currentCandle.high > prevCandle.close && currentCandle.high < sweepCandle.low;

        if (bearSweep && bearDisplacement) {
            signal = 'EXECUTE SHORT';
            color = 'text-cyan-400'; // Neon Blue look
            setup = {
                type: 'SHORT',
                side: 'SHORT',
                entry: currentPrice,
                sl: sweepCandle.high, // Stop Loss strictly above the sweep wick
                tp: swingLow, // Target the internal liquidity (opposing low)
                rrr: '1:3'
            };
            reasons.push('Buy-side liquidity swept. Institutional displacement confirmed.');
        }

        // --- BULLISH SCENARIO (Longing the Sell-Side Liquidity Raid) ---
        // 1. Did we sweep the low recently?
        const bullSweep = sweepCandle.low < swingLow && sweepCandle.close > swingLow;

        // 2. Displacement (Strong Green Candle)
        const bullDisplacement = prevCandle.close > prevCandle.open &&
            (prevCandle.close - prevCandle.open) > (swingLow - sweepCandle.low) * 2;

        if (bullSweep && bullDisplacement) {
            signal = 'EXECUTE LONG';
            color = 'text-cyan-400';
            setup = {
                type: 'LONG',
                side: 'LONG',
                entry: currentPrice,
                sl: sweepCandle.low, // Stop Loss strictly below the sweep wick
                tp: swingHigh, // Target opposing high
                rrr: '1:3'
            };
            reasons.push('Sell-side liquidity swept. Institutional displacement confirmed.');
        }
    }

    return {
        botName: "THE OBSIDIAN TRAP",
        signal,
        color,
        setup,
        reasons,
        killzone: killzoneStatus,
        metrics: {
            swingHigh,
            swingLow
        }
    };
};
