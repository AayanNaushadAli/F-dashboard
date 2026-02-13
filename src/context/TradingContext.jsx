import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { TradingContext } from './TradingContextCore';

export const TradingProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [positions, setPositions] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [ticker24h, setTicker24h] = useState({ change: 0, high: 0, low: 0, vol: 0 });
    const ws = useRef(null);

    const [marketSentiment, setMarketSentiment] = useState(null);
    const [newsSentiment, setNewsSentiment] = useState(null);

    const fetchMarketData = async () => {
        try {
            const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
            const fgData = await fgRes.json();
            setMarketSentiment(fgData.data[0]);

            const newsRes = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            const newsData = await newsRes.json();

            if (newsData.Data && newsData.Data.length > 0) {
                const positiveWords = ['bull', 'surge', 'gain', 'adoption', 'record', 'high', 'approve', 'etf', 'launch', 'growth'];
                const negativeWords = ['bear', 'crash', 'ban', 'hack', 'drop', 'low', 'reject', 'sec', 'fraud', 'collapse'];

                let score = 0;
                let count = 0;

                newsData.Data.slice(0, 50).forEach(article => {
                    const title = article.title.toLowerCase();
                    const body = article.body.toLowerCase();
                    const text = `${title} ${body}`;

                    let articleScore = 0;
                    positiveWords.forEach(word => { if (text.includes(word)) articleScore++; });
                    negativeWords.forEach(word => { if (text.includes(word)) articleScore--; });

                    if (articleScore !== 0) {
                        score += articleScore > 0 ? 1 : -1;
                        count++;
                    }
                });

                const normalizedScore = count > 0 ? (score / count).toFixed(2) : 0;
                setNewsSentiment({
                    score: normalizedScore,
                    articleCount: newsData.Data.length,
                    analyzedCount: count
                });
            }
        } catch (error) {
            console.error('Error fetching market data:', error);
        }
    };

    const fetchData = async (userId) => {
        if (!userId) return;
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return;
            }
            setProfile(profileData);

            const { data: posData } = await supabase
                .from('positions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            setPositions(posData || []);

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

    useEffect(() => {
        fetchMarketData();

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

    const checkTriggers = async () => {
        // TODO: Implement TP/SL logic
    };

    useEffect(() => {
        if (currentPrice && positions.length > 0) {
            checkTriggers();
        }
    }, [currentPrice, positions]);

    const placeOrder = async (order) => {
        if (!user || !profile) throw new Error('Please login to trade');

        const parsedAmount = Number(order.amount);
        const parsedLeverage = Number(order.leverage);
        const safePrice = Number(currentPrice);

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw new Error('Invalid order amount');
        }
        if (!Number.isFinite(parsedLeverage) || parsedLeverage < 1 || parsedLeverage > 50) {
            throw new Error('Leverage must be between 1 and 50');
        }
        if (!Number.isFinite(safePrice) || safePrice <= 0) {
            throw new Error('Market price unavailable');
        }

        const margin = parsedAmount;
        const fee = margin * 0.001;
        const cost = margin + fee;

        if (Number(profile.balance) < cost) throw new Error('Insufficient Balance');

        const liqPrice = order.side === 'LONG'
            ? safePrice * (1 - 1 / parsedLeverage + 0.005)
            : safePrice * (1 + 1 / parsedLeverage - 0.005);

        const newPosition = {
            user_id: user.id,
            symbol: 'BTCUSDT',
            side: order.side,
            entry_price: safePrice,
            size: margin * parsedLeverage,
            leverage: parsedLeverage,
            margin,
            liquidation_price: liqPrice,
            take_profit: order.tp || null,
            stop_loss: order.sl || null
        };

        const previousBalance = Number(profile.balance);
        const { error: balError } = await supabase
            .from('profiles')
            .update({ balance: previousBalance - cost })
            .eq('id', user.id);

        if (balError) throw balError;

        const { data: posData, error: posError } = await supabase
            .from('positions')
            .insert([newPosition])
            .select()
            .single();

        if (posError) {
            await supabase.from('profiles').update({ balance: previousBalance }).eq('id', user.id);
            throw posError;
        }

        await fetchData(user.id);
        return posData;
    };

    const closePosition = async (position) => {
        if (!user) return;

        const quantity = Number(position.size) / Number(position.entry_price);
        let pnl = 0;
        if (position.side === 'LONG') {
            pnl = (Number(currentPrice) - Number(position.entry_price)) * quantity;
        } else {
            pnl = (Number(position.entry_price) - Number(currentPrice)) * quantity;
        }

        const roi = (pnl / Number(position.margin)) * 100;
        const returnAmount = Number(position.margin) + pnl;

        const { error: delError } = await supabase.from('positions').delete().eq('id', position.id);
        if (delError) throw delError;

        const historyEntry = {
            user_id: user.id,
            symbol: position.symbol,
            side: position.side,
            entry_price: position.entry_price,
            exit_price: currentPrice,
            pnl,
            roi,
            closed_at: new Date().toISOString()
        };

        const { error: historyError } = await supabase.from('trade_history').insert([historyEntry]);
        if (historyError) throw historyError;

        const { data: latestProfile, error: latestProfileError } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', user.id)
            .single();

        if (latestProfileError) throw latestProfileError;

        const { error: balanceError } = await supabase
            .from('profiles')
            .update({
                balance: Number(latestProfile.balance) + Number(returnAmount)
            })
            .eq('id', user.id);

        if (balanceError) throw balanceError;

        await fetchData(user.id);
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
