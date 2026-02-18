export const fetchOrderBook = async (symbol) => {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=50`);
        return await response.json();
    } catch (error) {
        console.error('Atlas: Error fetching depth', error);
        return null;
    }
};

export const fetchKlines = async (symbol) => {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=21`);
        const data = await response.json();
        // [time, open, high, low, close, volume, ...]
        return data.map(k => parseFloat(k[4])); // Return closing prices
    } catch (error) {
        console.error('Atlas: Error fetching klines', error);
        return [];
    }
};

export const calculateOBI = (orderBook) => {
    if (!orderBook || !orderBook.bids || !orderBook.asks) return 0.5;

    // Sum top 50 levels
    let bidsVol = 0;
    let asksVol = 0;

    for (let i = 0; i < Math.min(orderBook.bids.length, 50); i++) {
        bidsVol += parseFloat(orderBook.bids[i][1]);
    }
    for (let i = 0; i < Math.min(orderBook.asks.length, 50); i++) {
        asksVol += parseFloat(orderBook.asks[i][1]);
    }

    const totalVol = bidsVol + asksVol;
    if (totalVol === 0) return 0.5;

    return parseFloat((bidsVol / totalVol).toFixed(4)); // 0 to 1 (0.5 = Balanced, >0.5 = Buy Pressure)
};

export const calculateBollingerBands = (prices, period = 20, multiplier = 2) => {
    if (prices.length < period) return null;

    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((a, b) => a + b, 0);
    const mean = sum / period;

    const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
        upper: mean + (multiplier * stdDev),
        lower: mean - (multiplier * stdDev),
        middle: mean
    };
};

export const analyzeAtlas = async (symbol) => {
    const depth = await fetchOrderBook(symbol);
    const prices = await fetchKlines(symbol);

    if (!depth || prices.length === 0) {
        return { signal: 'WAIT', log: 'Fetching data failed...' };
    }

    const currentPrice = prices[prices.length - 1];
    const obi = calculateOBI(depth);
    const bb = calculateBollingerBands(prices);

    // Default Log
    let log = `OBI: ${obi.toFixed(2)} | Price: ${currentPrice}`;
    let signal = 'WAIT';
    let type = 'neutral';

    // Default Setup
    let setup = {
        entry: currentPrice,
        tp: 0,
        sl: 0,
        size: 0,
        leverage: 10,
        risk: 2 // Fixed $2 Risk
    };

    // Fixed Stats
    const slPercent = 0.005; // 0.5%
    const tpPercent = 0.01;  // 1.0%
    const positionSize = setup.risk / slPercent; // $2 / 0.005 = $400 Size
    setup.size = positionSize;

    if (bb) {
        log += ` | BB: ${bb.lower.toFixed(2)} - ${bb.upper.toFixed(2)}`;

        // Strategy Rules
        // Long: OBI > 0.65 AND Price <= Lower BB
        if (obi > 0.65 && currentPrice <= bb.lower) {
            signal = 'LONG';
            type = 'bullish';
            log = `🚀 TRIGGER LONG | OBI (${obi.toFixed(4)}) > 0.65 + Price <= Low BB`;

            setup.entry = currentPrice;
            setup.tp = currentPrice * (1 + tpPercent);
            setup.sl = currentPrice * (1 - slPercent);
        }
        // Short: OBI < 0.35 AND Price >= Upper BB
        else if (obi < 0.35 && currentPrice >= bb.upper) {
            signal = 'SHORT';
            type = 'bearish';
            log = `🔻 TRIGGER SHORT | OBI (${obi.toFixed(4)}) < 0.35 + Price >= High BB`;

            setup.entry = currentPrice;
            setup.tp = currentPrice * (1 - tpPercent);
            setup.sl = currentPrice * (1 + slPercent);
        }
        // Debugging / Near Misses
        else if (obi < 0.40 && currentPrice >= bb.upper * 0.999) {
            const dist = ((bb.upper - currentPrice) / currentPrice * 100).toFixed(3);
            log = `👀 WATCHING SHORT | OBI: ${obi.toFixed(4)} | Dist to BB: ${dist}%`;
        }
    }

    return {
        signal,
        obi,
        currentPrice,
        bb,
        log,
        type,
        setup
    };
};
