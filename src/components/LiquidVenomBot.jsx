import React, { useEffect, useState } from 'react';
import { Skull, Zap, Droplets, Activity, Crosshair } from 'lucide-react';
import { fetchKlines, liquidVenomAlpha } from '../utils/liquidVenomLogic';

const LiquidVenomBot = ({ currentSymbol, onExecute }) => {
    const [analysis, setAnalysis] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    useEffect(() => {
        const runAnalysis = async () => {
            if (!currentSymbol) return;
            const candles = await fetchKlines(currentSymbol);
            if (candles.length > 0) {
                const currentPrice = candles[candles.length - 1].close;
                const result = liquidVenomAlpha(candles, currentPrice);
                setAnalysis(result);
                setLastUpdate(Date.now());
            }
        };

        const interval = setInterval(runAnalysis, 3000); // Fast scan (3s)
        runAnalysis();

        return () => clearInterval(interval);
    }, [currentSymbol]);

    if (!analysis) return <div className="bg-slate-900 h-64 rounded-xl animate-pulse"></div>;

    const isLeathal = analysis.lethalityIndex === 'HIGH';

    return (
        <div className={`bg-slate-900 border rounded-xl p-6 relative overflow-hidden group transition-all duration-300 ${isLeathal ? 'border-fuchsia-500 shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)]' : 'border-slate-800'}`}>

            {/* Background Effects */}
            <div className={`absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-opacity duration-500 ${isLeathal ? 'opacity-100' : 'opacity-20'}`}></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isLeathal ? 'bg-fuchsia-500/20 text-fuchsia-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                        <Skull size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-100 tracking-wider">LIQUID VENOM</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Liquidity Hunter</span>
                            {isLeathal && <span className="flex h-2 w-2 rounded-full bg-fuchsia-500 animate-ping"></span>}
                        </div>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded border text-xs font-bold tracking-wider ${isLeathal
                    ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                    {analysis.lethalityIndex}
                </div>
                <button
                    onClick={() => onExecute && analysis.setup?.type && onExecute({
                        side: analysis.signal === 'BUY' ? 'LONG' : 'SHORT',
                        entry: analysis.setup.entry,
                        tp: analysis.setup.tp,
                        sl: analysis.setup.sl,
                        leverage: 10, // Venom usually high leverage
                        trailingEnabled: false
                    })}
                    disabled={!analysis.setup?.type}
                    className="ml-3 flex items-center gap-2 px-3 py-1 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded text-xs font-bold hover:bg-fuchsia-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ⚡ EXECUTE
                </button>
            </div>

            {/* Main Signal Display */}
            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                    <span className="text-xs text-slate-500 block mb-1">Detection</span>
                    <div className={`text-xl font-bold flex items-center gap-2 ${analysis.color}`}>
                        {analysis.signal === 'WAIT' ? <Activity size={20} /> : <Zap size={20} />}
                        {analysis.signal}
                        {analysis.setup.side && <span className="text-sm opacity-70">({analysis.setup.side})</span>}
                    </div>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                    <span className="text-xs text-slate-500 block mb-1">Liquidity Pool</span>
                    <div className="text-xl font-bold text-slate-200 flex items-center gap-2">
                        <Droplets size={20} className="text-cyan-400" />
                        {analysis.metrics ? (
                            <span>${analysis.signal === 'BUY' ? analysis.metrics.swingLow.toFixed(2) : analysis.metrics.swingHigh.toFixed(2)}</span>
                        ) : '---'}
                    </div>
                </div>
            </div>

            {/* Trade Logic Visualizer */}
            {analysis.setup.type && (
                <div className="space-y-3 relative z-10">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Crosshair size={14} />
                        Venom Strike Setup
                    </h4>
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${analysis.signal === 'BUY'
                        ? 'bg-cyan-950/30 border-cyan-500/30'
                        : 'bg-fuchsia-950/30 border-fuchsia-500/30'
                        }`}>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div>
                                <span className="text-[10px] text-cyan-200/50 uppercase">Injection Entry</span>
                                <div className="text-sm font-mono text-cyan-100">${analysis.setup.entry.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-fuchsia-200/50 uppercase">Stop Loss</span>
                                <div className="text-sm font-mono text-fuchsia-200">${analysis.setup.sl.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-emerald-200/50 uppercase">Take Profit</span>
                                <div className="text-sm font-mono text-emerald-200">${analysis.setup.tp.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-emerald-200/50 uppercase">Take Profit</span>
                                <div className="text-sm font-mono text-emerald-200">${analysis.setup.tp.toFixed(2)}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase">FVG Zone</span>
                                <div className="text-[10px] font-mono text-slate-300">{analysis.setup.fvgZone || '---'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dormant State Visual */}
            {!analysis.setup.type && (
                <div className="h-24 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-600 gap-2">
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-xs font-mono">SCANNING FOR LIQUIDITY POOLS...</span>
                </div>
            )}
        </div>
    );
};

export default LiquidVenomBot;
