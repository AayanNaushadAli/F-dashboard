
// Simplified logic based on "Dynamic Liquidity HeatMap Profile"
// Identifies high volume nodes and local pivots to draw liquidity zones.

export const generateMockCandleData = (days = 100) => {
    let price = 42000;
    const data = [];
    for (let i = 0; i < days; i++) {
        const vol = Math.random() * 1000 + 500;
        const move = (Math.random() - 0.5) * 1000;
        const open = price;
        const close = price + move;
        const high = Math.max(open, close) + Math.random() * 200;
        const low = Math.min(open, close) - Math.random() * 200;
        price = close;

        data.push({
            index: i,
            day: i,
            open,
            high,
            low,
            close,
            volume: vol,
        });
    }
    return data;
};

export const calculateLiquidityZones = (data) => {
    const zones = [];
    const lookback = 20; // Simplified lookback

    // Pivot Logic: Find local highs/lows with high volume
    for (let i = lookback; i < data.length - 1; i++) {
        const current = data[i];
        const prev = data.slice(i - lookback, i);

        // Check if it's a local high
        const isHigh = prev.every(d => d.high <= current.high);
        // Check if it's a local low
        const isLow = prev.every(d => d.low >= current.low);

        const isHighVolume = current.volume > 1000; // Threshold

        if ((isHigh || isLow) && isHighVolume) {
            zones.push({
                y1: isHigh ? current.high * 1.01 : current.low * 0.99,
                y2: isHigh ? current.high : current.low,
                x1: current.index,
                x2: data.length - 1, // Extend to end
                type: isHigh ? 'SELL' : 'BUY',
                intensity: Math.min(1, current.volume / 1500) // Opacity based on volume
            });
        }
    }

    // Limit zones to avoid clutter
    return zones.slice(-10);
};
