import React, { useEffect, useState } from 'react';
import { Newspaper, Globe, TrendingUp, Clock } from 'lucide-react';
import { useTrading } from '../context/useTrading';

const News = () => {
    const { newsSentiment } = useTrading();
    const [news, setNews] = useState([]);

    useEffect(() => {
        // In a real app, we would fetch news articles here. 
        // For now, we simulate a feed or use context if it had articles.
        // We'll mock some data for display alongside sentiment.
        const mockNews = [
            {
                id: 1,
                title: "Bitcoin breaks $95k resistance as institutional demand surges",
                source: "CryptoDaily",
                time: "10 mins ago",
                sentiment: "bullish"
            },
            {
                id: 2,
                title: "SEC approves new Ethereum ETF applications",
                source: "Bloomberg",
                time: "1 hour ago",
                sentiment: "bullish"
            },
            {
                id: 3,
                title: "Fed signals potential rate hike pause in upcoming meeting",
                source: "Reuters",
                time: "2 hours ago",
                sentiment: "neutral"
            },
            {
                id: 4,
                title: "Solana network experiences brief congestion, developers investigating",
                source: "Coindesk",
                time: "4 hours ago",
                sentiment: "bearish"
            }
        ];
        setNews(mockNews);
    }, []);

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
                        <Newspaper size={32} className="text-blue-500" />
                        GLOBAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">NEWSFEED</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Real-time market intelligence & sentiment analysis</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sentiment Score Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">AI Sentiment Analysis</h3>
                        {newsSentiment ? (
                            <div className="text-center">
                                <div className={`text-6xl font-black mb-2 ${parseFloat(newsSentiment.score) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                    {parseFloat(newsSentiment.score) > 0 ? '+' : ''}{newsSentiment.score}
                                </div>
                                <div className="text-slate-400 font-medium">
                                    Overall Market Mood: <span className="text-white">{parseFloat(newsSentiment.score) >= 0.2 ? 'Bullish' : parseFloat(newsSentiment.score) <= -0.2 ? 'Bearish' : 'Neutral'}</span>
                                </div>
                                <div className="mt-4 text-xs text-slate-500">
                                    Based on {newsSentiment.analyzedCount} headlines processed in real-time.
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-10 animate-pulse">Analyzing Global Data...</div>
                        )}
                    </div>
                </div>

                {/* News Feed */}
                <div className="lg:col-span-2 space-y-4">
                    {news.map(item => (
                        <div key={item.id} className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${item.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                                        item.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                                            'bg-slate-500/20 text-slate-400'
                                    }`}>{item.sentiment}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Globe size={14} /> {item.source}</span>
                                <span className="flex items-center gap-1"><Clock size={14} /> {item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default News;
