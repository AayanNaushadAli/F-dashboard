import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Brain, Newspaper, Wallet, ArrowUpRight, LogIn, LogOut, User, Cpu } from 'lucide-react';
import { useTrading } from '../context/useTrading';
import PsychoBot from './PsychoBot';
import AtlasBot from './AtlasBot';
import LiquidVenomBot from './LiquidVenomBot';
import ObsidianTrapBot from './ObsidianTrapBot';
import KillzoneStatus from './KillzoneStatus';
import { supabase } from '../supabase';

import Layout from './Layout';
import QuickTradeModal from './QuickTradeModal';

const Dashboard = () => {
    const { user, profile, history, positions, marketSentiment, newsSentiment, currentPrice, currentSymbol } = useTrading();
    const navigate = useNavigate();
    const [timeframe, setTimeframe] = useState('1M');

    // Calculate Stats
    const stats = useMemo(() => {
        if (!history || history.length === 0) return { dailyPnL: 0, winRate: 0, wins: 0, total: 0 };

        const today = new Date().toDateString();
        const todaysTrades = history.filter(t => new Date(t.closed_at).toDateString() === today);
        const dailyPnL = todaysTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);

        const wins = history.filter(t => t.pnl > 0).length;
        const total = history.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        return { dailyPnL, winRate, wins, total };
    }, [history]);

    // Calculate Total Equity (Balance + Used Margin)
    const currentEquity = useMemo(() => {
        if (!profile) return 0;
        const balance = parseFloat(profile.balance) || 0;
        const usedMargin = positions.reduce((acc, pos) => acc + (parseFloat(pos.margin) || 0), 0);
        return balance + usedMargin;
    }, [profile, positions]);

    const chartData = useMemo(() => {
        if (!profile || !history) return [];

        let daysCount = 30;
        if (timeframe === '1W') daysCount = 7;
        if (timeframe === '3M') daysCount = 90;
        if (timeframe === 'ALL') daysCount = 365;

        // Generate dates backwards (Today -> Past)
        const days = [];
        for (let i = 0; i < daysCount; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }

        const pnlByDay = {};
        history.forEach((trade) => {
            const date = new Date(trade.closed_at).toISOString().split('T')[0];
            pnlByDay[date] = (pnlByDay[date] || 0) + parseFloat(trade.pnl);
        });

        let runningBalance = currentEquity;
        const balanceMap = {};

        days.forEach(day => {
            balanceMap[day] = runningBalance;
            const dailyPnL = pnlByDay[day] || 0;
            runningBalance -= dailyPnL;
        });

        return days.reverse().map((day) => ({
            day: day.slice(5),
            balance: parseFloat((balanceMap[day] || 0).toFixed(2))
        }));
    }, [profile, history, timeframe, currentEquity]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };
    const [quickTrade, setQuickTrade] = useState({ open: false, data: null });
    const { placeOrder } = useTrading();

    const handleExecuteSignal = (signalData) => {
        setQuickTrade({ open: true, data: signalData });
    };

    const confirmQuickTrade = async (tradeParams) => {
        try {
            await placeOrder({
                side: tradeParams.side,
                amount: tradeParams.amount,
                leverage: tradeParams.leverage,
                type: 'MARKET',
                tp: tradeParams.tp,
                sl: tradeParams.sl,
                trailingEnabled: tradeParams.trailingEnabled,
                trailingPercent: tradeParams.trailingPercent,
                reduceOnly: false
            });
            setQuickTrade({ open: false, data: null });
            // Ideally show success toast here
        } catch (err) {
            console.error(err);
            // Ideally show error toast here
        }
    };

    const portfolioValue = profile?.balance ? parseFloat(profile.balance) : 0;
    const activePositionsCount = positions.length;

    return (
        <Layout>
            <QuickTradeModal
                open={quickTrade.open}
                onClose={() => setQuickTrade({ open: false, data: null })}
                onConfirm={confirmQuickTrade}
                signalData={quickTrade.data}
                balance={portfolioValue}
            />
            <div className="p-6 md:p-10 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
                            COMMAND <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">CENTER</span>
                        </h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Operational • v2.4.0
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/market" className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/5">
                            <TrendingUp size={18} />
                            Launch Terminal
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {/* Killzone Status - New Addition */}
                    <KillzoneStatus />

                    {/* Portfolio Card */}
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet size={48} />
                        </div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Balance</div>
                        <div className="text-2xl font-mono font-bold text-white mb-2">
                            ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`text-xs font-medium flex items-center gap-1 ${stats.dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats.dailyPnL >= 0 ? '+' : ''}{stats.dailyPnL.toFixed(2)} Today
                        </div>
                    </div>

                    {/* Win Rate Card */}
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity size={48} />
                        </div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Win Rate (24h)</div>
                        <div className="text-2xl font-mono font-bold text-white mb-2">
                            {stats.winRate}%
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            {stats.wins} / {stats.total} Trades
                        </div>
                    </div>

                    {/* Active Positions */}
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ArrowUpRight size={48} />
                        </div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Positions</div>
                        <div className="text-2xl font-mono font-bold text-white mb-2">
                            {activePositionsCount}
                        </div>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${activePositionsCount > 0 ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                            {activePositionsCount > 0 ? 'Exposure Active' : 'No Exposure'}
                        </div>
                    </div>
                </div>{/* Chart Section */}

                {/* PsychoBot AI Analysis */}
                <div className="mb-6">
                    <PsychoBot
                        marketData={{
                            fearAndGreed: marketSentiment,
                            newsSentiment: newsSentiment,
                            ticker24h: { change: 0 } // Default or passed from context if available
                        }}
                        balance={profile?.balance ? parseFloat(profile.balance) : 0}
                        currentPrice={currentPrice}
                        onExecute={handleExecuteSignal}
                    />
                </div>

                {/* Atlas Bot */}
                <div className="mb-6">
                    <AtlasBot currentSymbol={currentSymbol} onExecute={handleExecuteSignal} />
                </div>

                {/* Liquid Venom Bot */}
                <div className="mb-6">
                    <LiquidVenomBot currentSymbol={currentSymbol} onExecute={handleExecuteSignal} />
                </div>

                {/* The Obsidian Trap Bot */}
                <div className="mb-6">
                    <ObsidianTrapBot currentSymbol={currentSymbol} onExecute={handleExecuteSignal} />
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-slate-200">Portfolio Growth (Equity Curve)</h2>
                        <div className="flex gap-2">
                            {['1W', '1M', '3M', 'ALL'].map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeframe === tf ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-80 w-full min-h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value, index) => index % 5 === 0 ? value : ''}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                    formatter={(value) => [`$${value}`, 'Balance']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorBalance)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Right Column: Psychology & History */}
            <div className="space-y-6">

                {/* Psychology Panel */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <Brain size={20} className="text-purple-400" />
                        Psychology Analysis
                    </h2>

                    <div className="space-y-4">
                        {/* Fear & Greed */}
                        <div className="p-4 bg-slate-700/30 rounded-xl border border-purple-500/20">
                            <div className="text-sm text-slate-400 mb-1">Current Market Mood</div>
                            {marketSentiment ? (
                                <>
                                    <div className="text-xl font-bold text-slate-200">
                                        {marketSentiment.value_classification} <span className="text-purple-400">({marketSentiment.value})</span>
                                    </div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${parseInt(marketSentiment.value) > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                            style={{ width: `${marketSentiment.value}%` }}
                                        ></div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-slate-500 animate-pulse">Loading Index...</div>
                            )}
                        </div>

                        {/* News Sentiment */}
                        <div className="p-4 bg-slate-700/30 rounded-xl border border-blue-500/20">
                            <div className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Newspaper size={14} />
                                News Sentiment Score
                            </div>
                            {newsSentiment ? (
                                <>
                                    <div className={`text-xl font-bold ${parseFloat(newsSentiment.score) >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                                        {parseFloat(newsSentiment.score) > 0 ? '+' : ''}{newsSentiment.score}
                                        <span className="text-sm font-normal text-slate-400 ml-2">
                                            ({parseFloat(newsSentiment.score) >= 0.2 ? 'Positive' : parseFloat(newsSentiment.score) <= -0.2 ? 'Negative' : 'Neutral'})
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Based on {newsSentiment.analyzedCount} analyzed headlines
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-slate-500 animate-pulse">Analyzing News...</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Trade History */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm flex-1">
                    <h2 className="text-lg font-semibold text-slate-200 mb-4">Recent Trades</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                                <tr>
                                    <th className="px-3 py-2 rounded-l-lg">Pair</th>
                                    <th className="px-3 py-2">Side</th>
                                    <th className="px-3 py-2">P/L</th>
                                    <th className="px-3 py-2 rounded-r-lg">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history && history.length > 0 ? history.map((trade) => (
                                    <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                        <td className="px-3 py-4 font-medium text-slate-200">{trade.symbol}</td>
                                        <td className="px-3 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${trade.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className={`px-3 py-4 font-bold ${trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {trade.pnl > 0 ? '+' : ''}${parseFloat(trade.pnl).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-4 text-slate-400 text-xs">
                                            {new Date(trade.closed_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                            No recent trades found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-center">
                        <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                            View All History
                        </button>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default Dashboard;
