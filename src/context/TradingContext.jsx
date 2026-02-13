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

        const { data, error } = await supabase.rpc('open_position_tx', {
            p_user_id: user.id,
            p_symbol: 'BTCUSDT',
            p_side: order.side,
            p_entry_price: safePrice,
            p_margin: parsedAmount,
            p_leverage: parsedLeverage,
            p_take_profit: order.tp || null,
            p_stop_loss: order.sl || null
        });

        if (error) throw error;

        await fetchData(user.id);
        return data;
    };

    const closePosition = async (position) => {
        if (!user) return;

        const exitPrice = Number(currentPrice);
        if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
            throw new Error('Market price unavailable');
        }

        const { error } = await supabase.rpc('close_position_tx', {
            p_user_id: user.id,
            p_position_id: position.id,
            p_exit_price: exitPrice
        });

        if (error) throw error;

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
