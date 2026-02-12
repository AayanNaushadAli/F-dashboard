import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';

const TradingContext = createContext();

export const useTrading = () => useContext(TradingContext);

export const TradingProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [positions, setPositions] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [ticker24h, setTicker24h] = useState({ change: 0, high: 0, low: 0, vol: 0 });
    const ws = useRef(null);

    // New States for Market Sentiment
    const [marketSentiment, setMarketSentiment] = useState(null);
    const [newsSentiment, setNewsSentiment] = useState(null);

    // Fetch Market Data (Fear/Greed & News)
    const fetchMarketData = async () => {
        try {
            // 1. Fear & Greed Index
            const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
            const fgData = await fgRes.json();
            setMarketSentiment(fgData.data[0]);

            // 2. News & Sentiment Analysis
            const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            const newsData = await newsRes.json();

            if (newsData.Data && newsData.Data.length > 0) {
                // Simple Keyword Sentiment Analysis
                const positiveWords = ['bull', 'surge', 'gain', 'adoption', 'record', 'high', 'approve', 'etf', 'launch', 'growth'];
                const negativeWords = ['bear', 'crash', 'ban', 'hack', 'drop', 'low', 'reject', 'sec', 'fraud', 'collapse'];

                let score = 0;
                let count = 0;

                // Analyze last 50 headlines
                newsData.Data.slice(0, 50).forEach(article => {
                    const title = article.title.toLowerCase();
                    const body = article.body.toLowerCase();
                    const text = title + " " + body;

                    let articleScore = 0;
                    positiveWords.forEach(word => { if (text.includes(word)) articleScore++; });
                    negativeWords.forEach(word => { if (text.includes(word)) articleScore--; });

                    if (articleScore !== 0) {
                        score += articleScore > 0 ? 1 : -1;
                        count++;
                    }
                });

                // Normalize score (-1 to 1)
                const normalizedScore = count > 0 ? (score / count).toFixed(2) : 0;
                setNewsSentiment({
                    score: normalizedScore,
                    articleCount: newsData.Data.length,
                    analyzedCount: count
                });
            }

        } catch (error) {
            console.error("Error fetching market data:", error);
        }
    };

    const fetchData = async (userId) => {
        if (!userId) return;
        try {
            // Fetch Profile
            let { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return;
            }
            setProfile(profileData);

            // Fetch Active Positions
            const { data: posData } = await supabase
                .from('positions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            setPositions(posData || []);

            // Fetch History
            const { data: histData } = await supabase
                .from('trade_history')
                .select('*')
                .eq('user_id', userId)
                .order('closed_at', { ascending: false })
                .limit(50);
            setHistory(histData || []);

        } catch (error) {
            console.error('Error in fetchData:', error);
        }
    };

    // 1. Auth & Initial Data Fetch
    useEffect(() => {
        // Fetch non-user specific data immediately
        fetchMarketData();

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData(session.user.id);
            else {
                setProfile(null);
                setPositions([]);
                setHistory([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Real-time Price Feed (Binance WebSocket)
    useEffect(() => {
        ws.current = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.c) {
                const price = parseFloat(data.c);
                setCurrentPrice(price);
                setTicker24h({
                    change: parseFloat(data.P),
                    high: parseFloat(data.h),
                    low: parseFloat(data.l),
                    vol: parseFloat(data.v)
                });
            }
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    // Helper to check triggers (Simplified for now)
    const checkTriggers = async (price) => {
        // Implement TP/SL logic here later
    };

    // Effect to check triggers on price update
    useEffect(() => {
        if (currentPrice && positions.length > 0) {
            checkTriggers(currentPrice);
        }
    }, [currentPrice, positions]);

    // 3. Trade Actions
    const placeOrder = async (order) => {
        if (!user || !profile) throw new Error("Please login to trade");

        // 1. Calculate Margin & Fees
        const margin = parseFloat(order.amount);
        const fee = margin * 0.001; // 0.1% fee
        const cost = margin + fee;

        if (profile.balance < cost) throw new Error("Insufficient Balance");

        // 2. Calculate Liquidation Price
        const sideMulti = order.side === 'LONG' ? 1 : -1;
        const liqPrice = order.side === 'LONG'
            ? currentPrice * (1 - 1 / order.leverage + 0.005) // Buffer
            : currentPrice * (1 + 1 / order.leverage - 0.005);

        const newPosition = {
            user_id: user.id,
            symbol: 'BTCUSDT',
            side: order.side,
            entry_price: currentPrice,
            size: margin * order.leverage,
            leverage: order.leverage,
            margin: margin,
            liquidation_price: liqPrice,
            take_profit: order.tp || null,
            stop_loss: order.sl || null
        };

        // 3. Transaction: Deduct Balance & Insert Position
        // A. Deduct Balance
        const { error: balError } = await supabase
            .from('profiles')
            .update({ balance: profile.balance - cost })
            .eq('id', user.id);

        if (balError) throw balError;

        // B. Insert Position
        const { data: posData, error: posError } = await supabase
            .from('positions')
            .insert([newPosition])
            .select()
            .single();

        if (posError) {
            // Rollback balance (manual)
            await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
            throw posError;
        }

        // Refresh State
        fetchData(user.id);
        return posData;
    };

    const closePosition = async (position) => {
        if (!user) return;

        const quantity = position.size / position.entry_price;
        let pnl = 0;
        if (position.side === 'LONG') {
            pnl = (currentPrice - position.entry_price) * quantity;
        } else {
            pnl = (position.entry_price - currentPrice) * quantity;
        }

        const roi = (pnl / position.margin) * 100;
        const returnAmount = position.margin + pnl;

        // 1. Delete Position
        const { error: delError } = await supabase.from('positions').delete().eq('id', position.id);
        if (delError) throw delError;

        // 2. Add to History
        const historyEntry = {
            user_id: user.id,
            symbol: position.symbol,
            side: position.side,
            entry_price: position.entry_price,
            exit_price: currentPrice,
            pnl: pnl,
            roi: roi,
            closed_at: new Date()
        };
        await supabase.from('trade_history').insert([historyEntry]);

        // 3. Update Balance
        const { data: latestProfile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
        if (latestProfile) {
            await supabase.from('profiles').update({
                balance: Number(latestProfile.balance) + Number(returnAmount)
            }).eq('id', user.id);
        }

        fetchData(user.id);
    };

    const value = {
        user,
        profile,
        positions,
        history,
        currentPrice,
        ticker24h,
        placeOrder,
        closePosition,
        fetchData,
        marketSentiment,
        newsSentiment
    };

    return (
        <TradingContext.Provider value={value}>
            {children}
        </TradingContext.Provider>
    );
};
