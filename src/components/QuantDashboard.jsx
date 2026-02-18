import React, { useState, useEffect } from 'react';
import { Cpu, TrendingUp, TrendingDown, Activity, RefreshCw, BarChart2, Shield, AlertCircle, PlayCircle } from 'lucide-react';
import { fetchQuantData, analyzeQuantSignal } from '../utils/quantLogic';

import Layout from './Layout';

const QuantDashboard = () => {
    // ... state ...
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [lastScan, setLastScan] = useState(null);

    const runScan = async () => {
        setLoading(true);
        try {
            const { candles4h, candles15m } = await fetchQuantData(symbol);
            if (candles4h.length && candles15m.length) {
                const results = analyzeQuantSignal(candles15m, candles4h);
                setData(results);
                setLastScan(new Date());
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        runScan();
    }, [symbol]);

    return (
        <Layout>
            <div className="min-h-screen text-slate-200 p-6 md:p-10 font-sans">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
                                <Cpu size={32} className="text-indigo-500" />
                                QUANT <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">TERMINAL</span>
                            </h1>
                            <p className="text-slate-500 font-medium">Algorithmic Trend & Momentum System</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                value={symbol} onChange={(e) => setSymbol(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500"
                            >
                                <option value="BTCUSDT">BTC/USDT</option>
                                <option value="ETHUSDT">ETH/USDT</option>
                                <option value="SOLUSDT">SOL/USDT</option>
                            </select>
                            <button
                                onClick={runScan} disabled={loading}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                                {loading ? 'Crunching Data...' : 'Run Scan'}
                            </button>
                        </div>
                    </div>

                    {data ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* 1. Macro Bias */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity size={16} /> Phase 1: Macro Bias (4H)
                                </h3>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-4xl font-black tracking-tight">{data.macro.bias}</span>
                                    {data.macro.bias === 'BULLISH' && <TrendingUp size={40} className="text-emerald-500" />}
                                    {data.macro.bias === 'BEARISH' && <TrendingDown size={40} className="text-red-500" />}
                                    {data.macro.bias === 'NEUTRAL' && <Activity size={40} className="text-slate-500" />}
                                </div>
                                <div className="space-y-2 text-sm text-slate-400 border-t border-slate-800 pt-4">
                                    <div className="flex justify-between">
                                        <span>EMA 9</span>
                                        <span className="font-mono text-slate-200">{data.macro.emas.e9?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>EMA 21</span>
                                        <span className="font-mono text-slate-200">{data.macro.emas.e21?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>EMA 45</span>
                                        <span className="font-mono text-slate-200">{data.macro.emas.e45?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Backtest Results */}
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <BarChart2 size={16} /> Strategy Validation (Last 1000 M15)
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 bg-black/20 rounded-xl">
                                        <div className="text-xs text-slate-500 mb-1">Win Rate</div>
                                        <div className="text-2xl font-bold text-slate-100">{data.backtest.winRate.toFixed(1)}%</div>
                                    </div>
                                    <div className="p-4 bg-black/20 rounded-xl">
                                        <div className="text-xs text-slate-500 mb-1">Profit Factor</div>
                                        <div className="text-2xl font-bold text-slate-100">{data.backtest.profitFactor.toFixed(2)}</div>
                                    </div>
                                    <div className="p-4 bg-black/20 rounded-xl">
                                        <div className="text-xs text-slate-500 mb-1">Total Signals</div>
                                        <div className="text-2xl font-bold text-slate-100">{data.backtest.totalTrades}</div>
                                    </div>
                                    <div className="p-4 bg-black/20 rounded-xl">
                                        <div className="text-xs text-slate-500 mb-1">Est. PnL</div>
                                        <div className={`text-2xl font-bold ${data.backtest.totalPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {data.backtest.totalPnL.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Live Signal Output */}
                            <div className={`border rounded-2xl p-6 backdrop-blur relative overflow-hidden ${data.signal === 'LONG' ? 'bg-emerald-950/20 border-emerald-500/50' :
                                data.signal === 'SHORT' ? 'bg-red-950/20 border-red-500/50' :
                                    'bg-slate-900/50 border-slate-800'
                                }`}>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <PlayCircle size={16} /> Live Entry Trigger (M15)
                                </h3>

                                {data.signal !== 'WAIT' ? (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className={`text-4xl font-black ${data.signal === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {data.signal}
                                            </div>
                                            <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs font-bold border border-indigo-500/30">
                                                {data.confidence}% Confidence
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                                <span className="text-sm font-bold text-slate-400">ENTRY</span>
                                                <span className="font-mono text-lg font-bold">${data.setup.entry?.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                                <span className="text-sm font-bold text-slate-400">TARGET (2R)</span>
                                                <span className="font-mono text-lg font-bold text-emerald-400">${data.setup.tp?.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                                <span className="text-sm font-bold text-slate-400">STOP LOSS</span>
                                                <span className="font-mono text-lg font-bold text-red-400">${data.setup.sl?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 text-xs text-slate-500 flex items-center gap-2 bg-black/30 p-2 rounded">
                                            <AlertCircle size={12} />
                                            <span>Confirm logic: Pullback to EMA21 + RSI Cross.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-slate-600">
                                        <Shield size={48} className="mb-2 opacity-20" />
                                        <span className="font-bold">NO SIGNAL</span>
                                        <span className="text-xs">Market conditions do not meet entry criteria.</span>
                                        <div className="mt-4 text-xs font-mono">
                                            RSI: {data.currentRSI?.toFixed(1)} | ATR: {data.currentATR?.toFixed(1)}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                            {loading ? 'Initializing Quantum Threads...' : 'System Ready. Initiate Scan.'}
                        </div>
                    )}

                    <div className="mt-12 text-center text-xs text-slate-600 font-mono">
                        DISCLAIMER: EDUCATIONAL PURPOSES ONLY. PAST PERFORMANCE != FUTURE RESULTS.
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default QuantDashboard;
