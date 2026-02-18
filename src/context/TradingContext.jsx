import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { TradingContext } from './TradingContextCore';

export const TradingProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [positions, setPositions] = useState([]);
    const [history, setHistory] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [ticker24h, setTicker24h] = useState({ change: 0, high: 0, low: 0, vol: 0 });
    const [currentSymbol, setCurrentSymbol] = useState('BTCUSDT');
    const [availablePairs, setAvailablePairs] = useState([]);
    const ws = useRef(null);
    const checkingRef = useRef(false);
    const trailAnchorsRef = useRef({});

    const [marketSentiment, setMarketSentiment] = useState(null);
    const [newsSentiment, setNewsSentiment] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    const fetchMarketData = async () => {
        try {
            // Fetch available pairs
            const exchangeInfoRes = await fetch('https://api.binance.com/api/v3/exchangeInfo');
            const exchangeInfo = await exchangeInfoRes.json();
            const usdtPairs = exchangeInfo.symbols
                .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
                .map(s => s.symbol)
                .sort();
            setAvailablePairs(usdtPairs);

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
                    const text = `${article.title.toLowerCase()} ${article.body.toLowerCase()}`;
                    let articleScore = 0;
                    positiveWords.forEach(word => { if (text.includes(word)) articleScore++; });
                    negativeWords.forEach(word => { if (text.includes(word)) articleScore--; });
                    if (articleScore !== 0) {
                        score += articleScore > 0 ? 1 : -1;
                        count++;
                    }
                });

                const normalizedScore = count > 0 ? (score / count).toFixed(2) : 0;
                setNewsSentiment({ score: normalizedScore, articleCount: newsData.Data.length, analyzedCount: count });
            }
        } catch (error) {
            console.error('Error fetching market data:', error);
        }
    };

    const fetchData = async (userId) => {
        if (!userId) return;
        try {
            const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profileError) throw profileError;
            setProfile(profileData);

            const { data: posData, error: posError } = await supabase
                .from('positions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (posError) throw posError;
            setPositions(posData || []);

            const { data: histData, error: histError } = await supabase
                .from('trade_history')
                .select('*')
                .eq('user_id', userId)
                .order('closed_at', { ascending: false })
                .limit(50);
            if (histError) throw histError;
            setHistory(histData || []);

            const { data: pendingData, error: pendingError } = await supabase
                .from('pending_orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (pendingError) throw pendingError;
            setPendingOrders(pendingData || []);
        } catch (error) {
            console.error('Error in fetchData:', error);
        }
    };

    useEffect(() => {
        fetchMarketData();

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData(session.user.id);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData(session.user.id);
            else {
                setProfile(null);
                setPositions([]);
                setHistory([]);
                setPendingOrders([]);
            }
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (ws.current) ws.current.close();

        ws.current = new WebSocket(`wss://stream.binance.com:9443/ws/${currentSymbol.toLowerCase()}@ticker`);
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
        return () => { if (ws.current) ws.current.close(); };
    }, [currentSymbol]);

    const placeOrder = async (order) => {
        if (!user || !profile) throw new Error('Please login to trade');

        const parsedAmount = Number(order.amount);
        const parsedLeverage = Number(order.leverage);
        const safePrice = Number(currentPrice);
        const reduceOnly = Boolean(order.reduceOnly);

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error('Invalid order amount');
        if (!Number.isFinite(parsedLeverage) || parsedLeverage < 1 || parsedLeverage > 50) throw new Error('Leverage must be between 1 and 50');
        if (!Number.isFinite(safePrice) || safePrice <= 0) throw new Error('Market price unavailable');

        const safeTp = order.tp ? Number(order.tp) : null;
        const safeSl = order.sl ? Number(order.sl) : null;
        const trailingEnabled = Boolean(order.trailingEnabled);
        const trailingPercent = trailingEnabled ? Number(order.trailingPercent) : null;

        if (safeTp !== null && (!Number.isFinite(safeTp) || safeTp <= 0)) throw new Error('Invalid TP');
        if (safeSl !== null && (!Number.isFinite(safeSl) || safeSl <= 0)) throw new Error('Invalid SL');
        if (trailingEnabled && (!Number.isFinite(trailingPercent) || trailingPercent <= 0 || trailingPercent > 50)) {
            throw new Error('Invalid trailing SL %');
        }

        if (order.type === 'MARKET') {
            if (reduceOnly) {
                let remaining = parsedAmount;
                const reducible = positions.filter((p) => p.symbol === currentSymbol && p.side !== order.side);
                for (const pos of reducible) {
                    if (remaining <= 0) break;
                    const posMargin = Number(pos.margin);
                    const pct = Math.min(100, (remaining / posMargin) * 100);
                    const { error: reduceErr } = await supabase.rpc('close_position_partial_tx', {
                        p_user_id: user.id,
                        p_position_id: pos.id,
                        p_exit_price: safePrice,
                        p_close_percent: pct
                    });
                    if (reduceErr) throw reduceErr;
                    remaining -= Math.min(remaining, posMargin);
                }
                await fetchData(user.id);
                return { reduced: true };
            }

            const { data, error } = await supabase.rpc('open_position_tx', {
                p_user_id: user.id,
                p_symbol: currentSymbol,
                p_side: order.side,
                p_entry_price: safePrice,
                p_margin: parsedAmount,
                p_leverage: parsedLeverage,
                p_take_profit: safeTp,
                p_stop_loss: safeSl
            });
            if (error) throw error;

            if (data?.id && trailingEnabled) {
                const { error: riskErr } = await supabase.rpc('update_position_risk', {
                    p_user_id: user.id,
                    p_position_id: data.id,
                    p_take_profit: safeTp,
                    p_stop_loss: safeSl,
                    p_trailing_sl_enabled: true,
                    p_trailing_sl_percent: trailingPercent
                });
                if (riskErr) throw riskErr;
            }

            await fetchData(user.id);
            return data;
        }

        const triggerPrice = Number(order.triggerPrice);
        if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) throw new Error('Invalid trigger price');

        const { data, error } = await supabase
            .from('pending_orders')
            .insert([{
                user_id: user.id,
                symbol: currentSymbol,
                order_type: order.type,
                side: order.side,
                trigger_price: triggerPrice,
                margin: parsedAmount,
                leverage: parsedLeverage,
                take_profit: safeTp,
                stop_loss: safeSl,
                trailing_sl_enabled: trailingEnabled,
                trailing_sl_percent: trailingEnabled ? trailingPercent : null,
                reduce_only: reduceOnly
            }])
            .select()
            .single();

        if (error) throw error;
        await fetchData(user.id);
        return data;
    };

    const closePosition = async (position) => {
        if (!user) return;
        const exitPrice = Number(currentPrice);
        if (!Number.isFinite(exitPrice) || exitPrice <= 0) throw new Error('Market price unavailable');

        const { error } = await supabase.rpc('close_position_tx', {
            p_user_id: user.id,
            p_position_id: position.id,
            p_exit_price: exitPrice
        });
        if (error) throw error;
        await fetchData(user.id);
    };

    const closePositionPartial = async (position, closePercent) => {
        if (!user) return;
        const exitPrice = Number(currentPrice);
        const pct = Number(closePercent);
        if (!Number.isFinite(exitPrice) || exitPrice <= 0) throw new Error('Market price unavailable');
        if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw new Error('Invalid close %');

        const { error } = await supabase.rpc('close_position_partial_tx', {
            p_user_id: user.id,
            p_position_id: position.id,
            p_exit_price: exitPrice,
            p_close_percent: pct
        });
        if (error) throw error;

        // Reset the trailing anchor so the remaining position starts fresh
        if (trailAnchorsRef.current[position.id]) {
            delete trailAnchorsRef.current[position.id];
        }

        await fetchData(user.id);
    };

    const updatePositionRisk = async (positionId, { takeProfit, stopLoss, trailingEnabled, trailingPercent }) => {
        if (!user) return;
        const tp = takeProfit ? Number(takeProfit) : null;
        const sl = stopLoss ? Number(stopLoss) : null;
        const te = Boolean(trailingEnabled);
        const tpct = te ? Number(trailingPercent) : null;

        if (tp !== null && (!Number.isFinite(tp) || tp <= 0)) throw new Error('Invalid TP');
        if (sl !== null && (!Number.isFinite(sl) || sl <= 0)) throw new Error('Invalid SL');
        if (te && (!Number.isFinite(tpct) || tpct <= 0 || tpct > 50)) throw new Error('Invalid trailing %');

        const { error } = await supabase.rpc('update_position_risk', {
            p_user_id: user.id,
            p_position_id: positionId,
            p_take_profit: tp,
            p_stop_loss: sl,
            p_trailing_sl_enabled: te,
            p_trailing_sl_percent: tpct
        });
        if (error) throw error;

        // Reset the trailing anchor so the new settings start from current price (or entry)
        // avoiding "instant close" if price has retraced from a previous high.
        if (trailAnchorsRef.current[positionId]) {
            delete trailAnchorsRef.current[positionId];
        }

        await fetchData(user.id);
    };

    const cancelPendingOrder = async (orderId) => {
        if (!user) return;
        const { error } = await supabase.from('pending_orders').delete().eq('id', orderId).eq('user_id', user.id);
        if (error) throw error;
        await fetchData(user.id);
    };

    const checkTriggers = useCallback(async () => {
        if (!user || !currentPrice || checkingRef.current) return;
        checkingRef.current = true;
        try {
            for (const pos of positions) {
                const tp = pos.take_profit ? Number(pos.take_profit) : null;
                const sl = pos.stop_loss ? Number(pos.stop_loss) : null;
                const trailingEnabled = Boolean(pos.trailing_sl_enabled);
                const trailingPercent = pos.trailing_sl_percent ? Number(pos.trailing_sl_percent) : null;
                const price = Number(currentPrice);

                let effectiveSl = sl;
                if (!trailingEnabled) {
                    if (trailAnchorsRef.current[pos.id]) delete trailAnchorsRef.current[pos.id];
                } else if (trailingEnabled && trailingPercent) {
                    const prevAnchor = trailAnchorsRef.current[pos.id] ?? Number(pos.entry_price);
                    const anchor = pos.side === 'LONG' ? Math.max(prevAnchor, price) : Math.min(prevAnchor, price);
                    trailAnchorsRef.current[pos.id] = anchor;

                    const trailStop = pos.side === 'LONG'
                        ? anchor * (1 - trailingPercent / 100)
                        : anchor * (1 + trailingPercent / 100);

                    if (effectiveSl == null) effectiveSl = trailStop;
                    else effectiveSl = pos.side === 'LONG' ? Math.max(effectiveSl, trailStop) : Math.min(effectiveSl, trailStop);
                }

                let hit = false;
                if (pos.side === 'LONG') {
                    if (tp && price >= tp) hit = true;
                    if (effectiveSl && price <= effectiveSl) hit = true;
                } else {
                    if (tp && price <= tp) hit = true;
                    if (effectiveSl && price >= effectiveSl) hit = true;
                }

                if (hit) {
                    await supabase.rpc('close_position_tx', {
                        p_user_id: user.id,
                        p_position_id: pos.id,
                        p_exit_price: price
                    });
                    delete trailAnchorsRef.current[pos.id];
                }
            }

            for (const o of pendingOrders) {
                const trigger = Number(o.trigger_price);
                let shouldOpen = false;

                if (o.order_type === 'LIMIT') {
                    if (o.side === 'LONG' && Number(currentPrice) <= trigger) shouldOpen = true;
                    if (o.side === 'SHORT' && Number(currentPrice) >= trigger) shouldOpen = true;
                }
                if (o.order_type === 'STOP') {
                    if (o.side === 'LONG' && Number(currentPrice) >= trigger) shouldOpen = true;
                    if (o.side === 'SHORT' && Number(currentPrice) <= trigger) shouldOpen = true;
                }

                if (shouldOpen) {
                    if (o.reduce_only) {
                        let remaining = Number(o.margin);
                        const reducible = positions.filter((p) => p.symbol === o.symbol && p.side !== o.side);
                        for (const pos of reducible) {
                            if (remaining <= 0) break;
                            const posMargin = Number(pos.margin);
                            const pct = Math.min(100, (remaining / posMargin) * 100);
                            const { error: reduceErr } = await supabase.rpc('close_position_partial_tx', {
                                p_user_id: user.id,
                                p_position_id: pos.id,
                                p_exit_price: Number(currentPrice),
                                p_close_percent: pct
                            });
                            if (reduceErr) break;
                            remaining -= Math.min(remaining, posMargin);
                        }
                        await supabase.from('pending_orders').delete().eq('id', o.id).eq('user_id', user.id);
                    } else {
                        const { data: openedPos, error: openErr } = await supabase.rpc('open_position_tx', {
                            p_user_id: user.id,
                            p_symbol: o.symbol,
                            p_side: o.side,
                            p_entry_price: Number(currentPrice),
                            p_margin: Number(o.margin),
                            p_leverage: Number(o.leverage),
                            p_take_profit: o.take_profit,
                            p_stop_loss: o.stop_loss
                        });
                        if (!openErr) {
                            if (openedPos?.id && o.trailing_sl_enabled && o.trailing_sl_percent) {
                                await supabase.rpc('update_position_risk', {
                                    p_user_id: user.id,
                                    p_position_id: openedPos.id,
                                    p_take_profit: o.take_profit,
                                    p_stop_loss: o.stop_loss,
                                    p_trailing_sl_enabled: true,
                                    p_trailing_sl_percent: Number(o.trailing_sl_percent)
                                });
                            }
                            await supabase.from('pending_orders').delete().eq('id', o.id).eq('user_id', user.id);
                        }
                    }
                }
            }

            await fetchData(user.id);
        } catch (error) {
            console.error('Trigger execution error:', error);
        } finally {
            checkingRef.current = false;
        }
    }, [user, currentPrice, positions, pendingOrders]);

    useEffect(() => {
        if (currentPrice && user && (positions.length > 0 || pendingOrders.length > 0)) {
            checkTriggers();
        }
    }, [currentPrice, user, positions, pendingOrders, checkTriggers]);

    const value = {
        user,
        profile,
        positions,
        history,
        pendingOrders,
        currentPrice,
        ticker24h,
        currentSymbol,
        availablePairs,
        changeSymbol: setCurrentSymbol,
        placeOrder,
        closePosition,
        closePositionPartial,
        updatePositionRisk,
        cancelPendingOrder,
        fetchData,
        marketSentiment,
        newsSentiment,
        authLoading
    };

    return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
};
