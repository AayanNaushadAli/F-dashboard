import React, { useEffect, useState } from 'react';
import { Brain, Zap, TrendingUp, TrendingDown, AlertTriangle, Target, Send, MessageSquare } from 'lucide-react';
import { analyzeMarket } from '../utils/marketAnalysis';
import { sendTelegramMessage, getTelegramUpdates } from '../utils/telegram';

const PsychoBot = ({ marketData, balance, currentPrice }) => {
    const [analysis, setAnalysis] = useState(null);
    const [telegramChatId, setTelegramChatId] = useState(localStorage.getItem('telegram_chat_id'));
    const [isConnecting, setIsConnecting] = useState(false);
    const [lastSent, setLastSent] = useState(0);

    useEffect(() => {
        if (marketData) {
            const result = analyzeMarket(marketData, balance, currentPrice, marketData.symbol || 'BTCUSDT');
            setAnalysis(result);
        }
    }, [marketData, balance, currentPrice]);

    const connectTelegram = async () => {
        setIsConnecting(true);
        const updates = await getTelegramUpdates();
        if (updates && updates.chatId) {
            setTelegramChatId(updates.chatId);
            localStorage.setItem('telegram_chat_id', updates.chatId);
            alert(`Connected to ${updates.firstName} (${updates.username})`);
            await sendTelegramMessage(updates.chatId, "✅ Surgeon AI Connected successfully.");
        } else {
            alert("Could not find your Chat ID. Please message the bot first: @SurgeonAIBot /start");
        }
        setIsConnecting(false);
    };

    const sendUpdate = async () => {
        if (!telegramChatId || !analysis) return;
        const now = Date.now();
        if (now - lastSent < 60000) return; // Prevent spam (1 min limit)

        const msg = `
*Surgeon AI Signal* 🩺
Asset: ${marketData.symbol || 'BTC'}
Signal: *${analysis.signal}*
Score: ${analysis.score.toFixed(2)}
price: $${currentPrice}

*Trade Setup:*
Entry: $${analysis.setup.entry.toFixed(2)}
TP: $${analysis.setup.tp.toFixed(2)}
SL: $${analysis.setup.sl.toFixed(2)}
size: $${analysis.setup.positionSize}

*Reasoning:*
${analysis.reasons.join('\n')}
        `;

        await sendTelegramMessage(telegramChatId, msg);
        setLastSent(now);
        alert("Signal sent to Telegram!");
    };

    if (!analysis || !marketData) return <div className="animate-pulse bg-slate-800 h-64 rounded-xl"></div>;

    // Check if we have valid price data for the setup
    const isDataReady = currentPrice > 0;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${analysis.signal.includes('BUY') ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

            <div className="flex items-center gap-3 mb-6 relative z-10 w-full justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-100">Surgeon AI</h3>
                        <p className="text-xs text-slate-400">Strict Risk Management</p>
                    </div>
                </div>

                {telegramChatId ? (
                    <button
                        onClick={sendUpdate}
                        disabled={!analysis || analysis.signal === 'WAIT'}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                        title="Send Signal to Telegram"
                    >
                        <Send size={18} />
                    </button>
                ) : (
                    <button
                        onClick={connectTelegram}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                        {isConnecting ? '...' : <><MessageSquare size={14} /> Connect Bot</>}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block mb-1">Signal</span>
                    <div className={`text-xl font-bold ${analysis.color} flex items-center gap-2`}>
                        {analysis.signal.includes('BUY') ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {analysis.signal}
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block mb-1">Leverage</span>
                    <div className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Zap size={20} className="text-yellow-400" />
                        {analysis.leverage}x
                    </div>
                </div>
            </div>

            <div className="space-y-3 relative z-10 mb-6">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Target size={14} className="text-blue-400" />
                    Recommended Trade Setup
                </h4>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 relative">
                    {!isDataReady && (
                        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-xs text-slate-400">Waiting for market data...</span>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-slate-500 block">Side</span>
                            <span className={`text-sm font-bold ${analysis.side === 'LONG' ? 'text-emerald-400' : analysis.side === 'SHORT' ? 'text-red-400' : 'text-slate-400'}`}>
                                {analysis.side}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 block">Entry</span>
                            <span className="text-sm font-mono text-slate-200">${analysis.setup.entry.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 block">Position Size</span>
                            <span className="text-sm font-mono text-slate-200">${analysis.setup.positionSize.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 block">Take Profit</span>
                            <span className="text-sm font-mono text-emerald-400">${analysis.setup.tp.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 block">Stop Loss</span>
                            <span className="text-sm font-mono text-red-400">${analysis.setup.sl.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="sm:col-span-2 border-t border-slate-700/50 pt-2 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Trailing Stop</span>
                            <span className={`text-xs font-bold ${analysis.setup.trailingEnabled ? 'text-blue-400' : 'text-slate-500'}`}>
                                {analysis.setup.trailingEnabled ? `ON (${analysis.setup.trailingPercent}%)` : 'OFF'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 relative z-10">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    Key Factors
                </h4>
                <div className="space-y-2">
                    {analysis.reasons.map((reason, idx) => (
                        <div key={idx} className="text-xs text-slate-400 bg-slate-800/30 px-3 py-2 rounded-lg border-l-2 border-indigo-500/50">
                            {reason}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PsychoBot;
