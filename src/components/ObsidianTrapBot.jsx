import React, { useEffect, useState } from 'react';
import { Hexagon, Clock, ShieldAlert, Crosshair, Lock } from 'lucide-react';
import { fetchKlines, analyzeObsidianTrap } from '../utils/obsidianTrapLogic';

const ObsidianTrapBot = ({ currentSymbol }) => {
    const [analysis, setAnalysis] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const runAnalysis = async () => {
            if (!currentSymbol) return;
            const candles = await fetchKlines(currentSymbol);
            if (candles.length > 0) {
                // Use close price of last candle as current price proxy or pass real-time if available
                const currentPrice = candles[candles.length - 1].close;
                const result = analyzeObsidianTrap(candles, currentPrice);
                setAnalysis(result);
            }
        };

        const interval = setInterval(runAnalysis, 5000);
        runAnalysis();

        return () => clearInterval(interval);
    }, [currentSymbol]);

    if (!analysis) return <div className="bg-black/80 h-64 rounded-xl animate-pulse border border-slate-800"></div>;

    const isKillzone = analysis.killzone === 'ACTIVE';
    const isSignal = analysis.signal.includes('EXECUTE');

    return (
        <div className={`bg-black border rounded-xl p-6 relative overflow-hidden transition-all duration-500 ${isSignal ? 'border-cyan-500 shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)]' : 'border-slate-800'}`}>

            {/* Obsidian Texture/Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900 opacity-80"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100`}>
                        <Hexagon size={24} className={isSignal ? "animate-spin-slow text-cyan-400" : ""} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-100 tracking-wider">OBSIDIAN TRAP</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Institutional Order Flow</p>
                    </div>
                </div>

                {/* Killzone Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded border text-xs font-bold tracking-wider ${isKillzone
                        ? 'bg-cyan-950/30 text-cyan-400 border-cyan-500/50 animate-pulse'
                        : 'bg-slate-900 text-slate-600 border-slate-800'
                    }`}>
                    <Clock size={12} />
                    {isKillzone ? 'KILLZONE ACTIVE' : 'DORMANT'}
                </div>
            </div>

            {/* Status Display */}
            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-md">
                    <span className="text-xs text-slate-500 block mb-1">Status Protocol</span>
                    <div className={`text-xl font-bold flex items-center gap-2 ${analysis.color}`}>
                        {analysis.signal === 'SLEEP' ? <Lock size={18} /> : <ShieldAlert size={18} />}
                        {analysis.signal}
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-md">
                    <span className="text-xs text-slate-500 block mb-1">Target Liquidity</span>
                    <div className="text-xl font-bold text-slate-200 font-mono">
                        ${analysis.setup.tp ? analysis.setup.tp.toLocaleString() : '---'}
                    </div>
                </div>
            </div>

            {/* Trap Setup (Only visible if Signal) */}
            {analysis.setup.type && (
                <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900 to-transparent mb-4"></div>

                    <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <Crosshair size={14} />
                        Institutional Trap Detected
                    </h4>

                    <div className="grid grid-cols-3 gap-2 bg-cyan-950/10 border border-cyan-900/30 p-4 rounded-lg">
                        <div>
                            <span className="text-[10px] text-cyan-700 uppercase">Entry</span>
                            <div className="text-sm font-mono text-cyan-100">${analysis.setup.entry.toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="text-[10px] text-cyan-700 uppercase">Stop Loss</span>
                            <div className="text-sm font-mono text-cyan-100">${analysis.setup.sl.toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="text-[10px] text-cyan-700 uppercase">Target</span>
                            <div className="text-sm font-mono text-cyan-100">${analysis.setup.tp.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* UTC Time Display (Helper for Killzone) */}
            <div className="absolute bottom-2 right-4 z-10 text-[10px] text-slate-700 font-mono">
                UTC: {currentTime.toISOString().slice(11, 19)}
            </div>
        </div>
    );
};

export default ObsidianTrapBot;
