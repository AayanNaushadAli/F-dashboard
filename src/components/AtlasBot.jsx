import React, { useEffect, useState, useRef } from 'react';
import { Activity, Terminal, Crosshair, BarChart2 } from 'lucide-react';
import { analyzeAtlas, fetchOrderBook, fetchKlines, calculateOBI, calculateBollingerBands } from '../utils/atlasLogic';

const AtlasBot = ({ currentSymbol }) => {
    const [logs, setLogs] = useState([]);
    const [obi, setObi] = useState(0.5);
    const [price, setPrice] = useState(0);
    const [signal, setSignal] = useState('SCANNING');
    const [lastTradeTime, setLastTradeTime] = useState(0);
    const [activeTrade, setActiveTrade] = useState(null);
    const scrollRef = useRef(null);

    const addLog = (message, type = 'info') => {
        setLogs(prev => {
            // Anti-Spam: Don't add if identical to the last message
            if (prev.length > 0 && prev[prev.length - 1].msg === message) {
                return prev;
            }
            // Keep max 15 lines to prevent lag
            const newLogs = [...prev, { time: new Date().toLocaleTimeString(), msg: message, type }];
            return newLogs.slice(-15);
        });
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        const runAnalysis = async () => {
            if (!currentSymbol) return;

            try {
                // Fetch Data Manually here to update UI states granularly
                const depth = await fetchOrderBook(currentSymbol);
                const klines = await fetchKlines(currentSymbol);

                if (!depth || klines.length === 0) {
                    addLog("Error fetching data...", "error");
                    return;
                }

                const currentPrice = klines[klines.length - 1];
                const currentOBI = calculateOBI(depth);
                const bb = calculateBollingerBands(klines);
                const analysis = await analyzeAtlas(currentSymbol); // Use centralized logic

                setPrice(currentPrice);
                setObi(currentOBI);

                if (bb && analysis.setup) {
                    const now = Date.now();
                    const isCooldown = now - lastTradeTime < 600000; // 10 minutes

                    if (isCooldown) {
                        setSignal('COOLDOWN');
                        if (Math.random() > 0.8) addLog(`Cooldown Active... (${Math.ceil((600000 - (now - lastTradeTime)) / 60000)}m left)`, 'warning');
                        return;
                    }

                    // Logic Check
                    let newSignal = 'SCANNING';

                    if (analysis.signal === 'LONG' || analysis.signal === 'SHORT') {
                        newSignal = `${analysis.signal} TRIGGER`;
                        setLastTradeTime(now);
                        setActiveTrade(analysis.setup);
                        addLog(analysis.log, analysis.signal === 'LONG' ? 'success' : 'error');

                        // Notify Logic
                        addLog(`Reason: ${analysis.log}`, 'info');
                    } else {
                        // Only log occasionally to avoid spam
                        if (Math.random() > 0.7) {
                            addLog(analysis.log, 'info');
                        }
                    }
                    setSignal(newSignal);
                }
            } catch (err) {
                console.error(err);
                addLog("Error analyzing market data.", "error");
            }
        };

        const interval = setInterval(runAnalysis, 5000); // Run every 5s
        runAnalysis();

        return () => clearInterval(interval);
    }, [currentSymbol]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                    <Activity size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-100">Atlas Bot</h3>
                    <p className="text-xs text-slate-400">Order Flow Scalper</p>
                </div>
                <div className="ml-auto px-3 py-1 bg-slate-800 rounded text-xs font-mono text-cyan-400 border border-cyan-500/30">
                    {signal}
                </div>
            </div>

            {/* Depth Visualizer (OBI) */}
            <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Sellers (Asks)</span>
                    <span>Buyers (Bids)</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex relative">
                    <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                        style={{ width: `${(1 - obi) * 100}%` }}
                    />
                    <div
                        className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${obi * 100}%` }}
                    />
                    {/* Center Marker */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white mix-blend-overlay"></div>
                </div>
                <div className="flex justify-between text-xs font-mono mt-1">
                    <span className="text-red-400">{((1 - obi) * 100).toFixed(0)}%</span>
                    <span className="text-emerald-400">{(obi * 100).toFixed(0)}%</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-500 block">Price</span>
                    <span className="text-sm font-mono text-slate-200">${price}</span>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-500 block">Status</span>
                    <span className="text-sm font-mono text-cyan-400">Active</span>
                </div>
            </div>

            {/* Terminal Log */}
            <div className="flex-1 bg-black rounded-lg p-3 font-mono text-xs overflow-y-auto border border-slate-800" ref={scrollRef} style={{ maxHeight: '150px' }}>
                <div className="text-slate-500 mb-2">--- ATLAS TERMINAL ---</div>
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="text-slate-600">[{log.time}]</span>{' '}
                        <span className={
                            log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-emerald-400' :
                                    'text-cyan-200'
                        }>
                            {log.msg}
                        </span>
                    </div>
                ))}
            </div>

            {/* Active Trade Setup */}
            {
                activeTrade && (
                    <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <h4 className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                            <span>LATEST SETUP</span>
                            <span className="text-slate-500">{new Date(lastTradeTime).toLocaleTimeString()}</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-500 block">Entry</span>
                                <span className="text-sm font-mono text-white">${activeTrade.entry}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Position Size</span>
                                <span className="text-sm font-mono text-white">${activeTrade.size}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Take Profit</span>
                                <span className="text-sm font-mono text-emerald-400">${activeTrade.tp.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Stop Loss</span>
                                <span className="text-sm font-mono text-red-400">${activeTrade.sl.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Leverage</span>
                                <span className="text-sm font-mono text-yellow-400">{activeTrade.leverage}x</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Risk</span>
                                <span className="text-sm font-mono text-orange-400">${activeTrade.risk}</span>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AtlasBot;
