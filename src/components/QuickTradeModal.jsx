import React, { useState, useEffect } from 'react';
import { X, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

const QuickTradeModal = ({ open, onClose, onConfirm, signalData, balance }) => {
    const [amount, setAmount] = useState('1000');
    const [leverage, setLeverage] = useState('5');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && signalData) {
            setLeverage(String(signalData.leverage || 5));
            // Reset error
            setError(null);
        }
    }, [open, signalData]);

    if (!open || !signalData) return null;

    const handleSubmit = () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) {
            setError("Invalid amount");
            return;
        }
        if (amt > balance) {
            setError("Insufficient balance");
            return;
        }

        onConfirm({
            amount: amt,
            leverage: parseInt(leverage),
            ...signalData
        });
    };

    const isLong = signalData.side === 'LONG';
    const colorClass = isLong ? 'text-emerald-400' : 'text-red-400';
    const bgClass = isLong ? 'bg-emerald-500' : 'bg-red-500';

    // Calculation Logic
    const margin = parseFloat(amount) || 0;
    const lev = parseFloat(leverage) || 1;
    const positionSize = margin * lev;
    const entry = signalData.entry || 0;
    const tp = signalData.tp || 0;
    const sl = signalData.sl || 0;

    // Quantity (Coins) = Position Size / Entry Price
    const quantity = entry > 0 ? positionSize / entry : 0;

    // Projected PnL
    const projectedProfit = entry > 0 ? Math.abs(tp - entry) * quantity : 0;
    const projectedLoss = entry > 0 ? Math.abs(sl - entry) * quantity : 0;

    const riskReward = projectedLoss > 0 ? (projectedProfit / projectedLoss).toFixed(2) : '∞';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                        <Zap className="text-yellow-400" size={20} />
                        Quick Execute
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Signal Summary */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div>
                            <span className={`text-2xl font-black ${colorClass}`}>{signalData.side}</span>
                            <div className="text-xs text-slate-400 mt-1">BTCUSDT Perpetual</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-300">Entry: <span className="font-mono text-white">${signalData.entry?.toLocaleString()}</span></div>
                            <div className="text-xs text-emerald-400">TP: ${signalData.tp?.toLocaleString()}</div>
                            <div className="text-xs text-red-400">SL: ${signalData.sl?.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 ml-1">Margin (USDT)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="1000"
                            />
                            <div className="flex justify-between text-xs mt-1.5 px-1">
                                <span className="text-slate-500">Available: ${balance.toLocaleString()}</span>
                                <span className="text-slate-500">Pos Size: <span className="text-white">${positionSize.toLocaleString()}</span></span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 ml-1">Leverage</label>
                            <div className="flex gap-2">
                                {[1, 5, 10, 20, 50].map((lev) => (
                                    <button
                                        key={lev}
                                        onClick={() => setLeverage(String(lev))}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${parseInt(leverage) === lev
                                                ? 'bg-slate-700 text-white border border-slate-600'
                                                : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                                            }`}
                                    >
                                        {lev}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Projected PnL Card */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                            <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                                <TrendingUp size={12} /> Proj. Profit
                            </span>
                            <div className="text-lg font-mono text-emerald-300">
                                +${projectedProfit.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                            <span className="text-[10px] text-red-400 uppercase font-bold flex items-center gap-1">
                                <TrendingDown size={12} /> Proj. Loss
                            </span>
                            <div className="text-lg font-mono text-red-300">
                                -${projectedLoss.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-[10px] text-slate-500 -mt-2">
                        Risk/Reward: <span className="text-slate-300">1:{riskReward}</span>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handleSubmit}
                        className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${bgClass}`}
                    >
                        <Zap size={20} fill="currentColor" />
                        Execute {signalData.side}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickTradeModal;
