import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Brain, Newspaper, Wallet, ArrowUpRight, LogIn, LogOut, User } from 'lucide-react';
import { useTrading } from '../context/useTrading';
import PsychoBot from './PsychoBot';
import AtlasBot from './AtlasBot';
import { supabase } from '../supabase';

const Dashboard = () => {
    const { user, profile, history, marketSentiment, newsSentiment, currentPrice, currentSymbol } = useTrading();
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

    const chartData = useMemo(() => {
        if (!profile || !history) return [];

        let daysCount = 30;
        if (timeframe === '1W') daysCount = 7;
        if (timeframe === '3M') daysCount = 90;
        if (timeframe === 'ALL') daysCount = 365;

        const days = [];
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }

        const pnlByDay = {};
        history.forEach((trade) => {
            const date = new Date(trade.closed_at).toISOString().split('T')[0];
            pnlByDay[date] = (pnlByDay[date] || 0) + parseFloat(trade.pnl);
        });

        const startDate = days[0];
        const preHistory = history.filter((t) => new Date(t.closed_at).toISOString().split('T')[0] < startDate);
        const prePnL = preHistory.reduce((acc, t) => acc + parseFloat(t.pnl), 0);

        let currentBalance = parseFloat(profile.start_balance || 10000) + prePnL;

        return days.map((day) => {
            if (pnlByDay[day]) {
                currentBalance += pnlByDay[day];
            }
            return {
                day: day.slice(5),
                balance: parseFloat(currentBalance.toFixed(2))
            };
        });
    }, [profile, history, timeframe]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 mb-6 md:mb-8 pb-4 border-b border-slate-800">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        PsychoTrade Bot
                    </h1>
                    <p className="text-xs text-slate-400 tracking-wider">v1.2.0 • PRO</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                    <Link to="/market" className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                        <TrendingUp size={14} />
                        <span>Market</span>
                    </Link>

                    {user ? (
                        <>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-medium border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Live Connection</span>
                            </div>
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                                <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-slate-400">Trader</div>
                                        <div className="text-xs font-bold text-slate-200">
                                            {profile?.full_name || user.email.split('@')[0]}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                                        <User size={16} className="text-slate-300" />
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
                            <LogIn size={16} />
                            Login
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Stats & Chart */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Hero Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Balance */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                                <Wallet size={16} />
                                Total Balance
                            </div>
                            <div className="text-4xl font-bold text-white mb-1">
                                ${profile?.balance ? parseFloat(profile.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 text-sm">
                                <ArrowUpRight size={16} />
                                <span>+0.0%</span>
                                <span className="text-slate-500 ml-1">all time</span>
                            </div>
                        </div>

                        {/* Daily P&L */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                                <TrendingUp size={16} />
                                Daily P&L
                            </div>
                            <div className={`text-2xl font-bold mb-1 ${stats.dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {stats.dailyPnL >= 0 ? '+' : ''}${stats.dailyPnL.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-500">
                                Today's realized profit
                            </div>
                        </div>

                        {/* Win Rate */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-medium">
                                <Activity size={16} />
                                Win Rate
                            </div>
                            <div className="text-2xl font-bold text-blue-400 mb-1">
                                {stats.winRate}%
                            </div>
                            <div className="text-xs text-slate-500">
                                {stats.wins} wins / {stats.total} trades
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}

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
                        />
                    </div>

                    {/* Atlas Bot */}
                    <div className="mb-6">
                        <AtlasBot currentSymbol={currentSymbol} />
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

                        <div className="h-[300px] w-full">
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
            </div>
        </div>
    );
};

export default Dashboard;
