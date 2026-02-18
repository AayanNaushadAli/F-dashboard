export const analyzeMarket = (data, balance = 0, currentPrice = 0, currentSymbol = 'BTCUSDT') => {
    const { fearAndGreed, newsSentiment, ticker24h } = data;

    let score = 0;
    let reasons = [];
    let signal = 'NEUTRAL';
    let color = 'text-slate-400';
    let leverage = 5;
    let setup = {
        entry: currentPrice,
        tp: 0,
        sl: 0,
        positionSize: 0,
        trailingEnabled: false,
        trailingPercent: 0,
        rrr: '1:2'
    };

    // 0. Asset Restriction (Surgeon Rule)
    const allowedAssets = ['BTC', 'ETH', 'SOL'];
    const baseAsset = currentSymbol.replace('USDT', '');
    if (!allowedAssets.includes(baseAsset)) {
        return {
            signal: 'NO TRADE',
            score: 0,
            leverage: 0,
            riskLevel: 'Restricted',
            reasons: [`Surgeon Strategy restricts trading to BTC, ETH, and SOL only. Current: ${baseAsset}.`],
            color: 'text-slate-500',
            setup
        };
    }

    // 1. Fear & Greed Analysis (0-100)
    const fgVal = parseInt(fearAndGreed?.value || 50);
    if (fgVal > 75) {
        score -= 0.2; // Contrarian: Too greedy, caution
        reasons.push(`Market is extremely greedy (${fgVal}). Caution advised.`);
    } else if (fgVal < 25) {
        score += 0.2; // Contrarian: Too fearful, look for bounces
        reasons.push(`Market is extremely fearful (${fgVal}). Looking for value.`);
    } else if (fgVal > 60) {
        score += 0.2; // Momentum
    } else if (fgVal < 40) {
        score -= 0.2; // Momentum
    }

    // 2. News Sentiment (-1 to 1)
    const newsScore = parseFloat(newsSentiment?.score || 0);
    if (newsScore > 0.3) {
        score += 0.3;
        reasons.push('Strong positive news sentiment.');
    } else if (newsScore < -0.3) {
        score -= 0.3;
        reasons.push('Negative news sentiment detected.');
    }

    // 3. Price Momentum (24h Change)
    const change = parseFloat(ticker24h?.change || 0);
    if (change > 5) {
        score += 0.4;
        reasons.push(`Strong bullish momentum (+${change}%).`);
    } else if (change < -5) {
        score -= 0.4;
        reasons.push(`Significant bearish pressure (${change}%).`);
    } else if (change > 1) {
        score += 0.2;
    } else if (change < -1) {
        score -= 0.2;
    }

    // 4. Volatility Check (Surgeon Rule: 5-10x Leverage)
    const volatility = Math.abs(change);
    let riskLevel = 'Medium';

    if (volatility > 6) {
        leverage = 3; // Safety first on high vol
        riskLevel = 'High (Reduced Lev)';
        reasons.push('High volatility detected. Reducing leverage to safety levels.');
    } else if (volatility < 2) {
        leverage = 10; // Max leverage for Surgeon
        riskLevel = 'Low';
        reasons.push('Low volatility allows for max authorized leverage (10x).');
    } else {
        leverage = 5;
        riskLevel = 'Medium';
    }

    // 5. Signal Generation
    if (score >= 0.5) {
        signal = 'STRONG BUY';
        color = 'text-emerald-400';
    } else if (score > 0.2) {
        signal = 'BUY';
        color = 'text-emerald-500';
    } else if (score <= -0.5) {
        signal = 'STRONG SELL';
        color = 'text-red-500';
    } else if (score < -0.2) {
        signal = 'SELL';
        color = 'text-red-400';
    } else {
        signal = 'WAIT';
        reasons.push('No clear edge identified. Patience is key.');
    }

    // 6. Trade Setup (Surgeon Rules)
    const direction = score > 0 ? 1 : -1;

    // Position Sizing: Strict 5% Max Risk
    // "Never risk more than 5% of the account on a single trade."
    // We interpret this as Input Margin = 5% of Balance.
    const maxMargin = balance * 0.05;

    // Scale down if confidence is low (score is low)
    const confidence = Math.abs(score);
    const actualMargin = maxMargin * Math.min(confidence, 1);

    setup.positionSize = Math.floor(actualMargin * leverage); // Total Position Size (Not Margin)

    // Stop Loss & Take Profit
    // Surgeon Rule: "Always use stop losses."
    // 1:2 Risk Reward Ratio preferred
    const atrProxy = Math.max(volatility / 2, 1.5); // Estimate minimal move based on change
    const slPercent = atrProxy / 100;
    const tpPercent = slPercent * 2;

    if (direction === 1) { // LONG
        setup.tp = currentPrice * (1 + tpPercent);
        setup.sl = currentPrice * (1 - slPercent);
    } else { // SHORT
        setup.tp = currentPrice * (1 - tpPercent);
        setup.sl = currentPrice * (1 + slPercent);
    }

    // Trailing Stop (Surgeon: "Use trailing stop parameters for strong trends")
    if (confidence > 0.6 && volatility > 3) {
        setup.trailingEnabled = true;
        setup.trailingPercent = (slPercent * 100).toFixed(2);
    }

    if (signal === 'WAIT' || signal === 'NO TRADE') {
        setup.positionSize = 0;
        setup.tp = 0;
        setup.sl = 0;
    }

    return {
        signal,
        score,
        leverage,
        riskLevel,
        reasons,
        color,
        side: signal.includes('BUY') ? 'LONG' : signal.includes('SELL') ? 'SHORT' : '-',
        setup
    };
};
