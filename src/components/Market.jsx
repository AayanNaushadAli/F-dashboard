import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Clock, AlertCircle, XCircle, GripHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';

const Market = () => {
  const { user, profile, currentPrice, ticker24h, placeOrder, positions, closePosition } = useTrading();
  const container = useRef();

  // Form State
  const [orderType, setOrderType] = useState('MARKET');
  const [amount, setAmount] = useState('1000');
  const [leverage, setLeverage] = useState('10');
  const [side, setSide] = useState('LONG');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Layout State
  const [positionsHeight, setPositionsHeight] = useState(256); // Default 256px (~h-64)
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Initial Chart Load
  useEffect(() => {
    if (!container.current) return;
    if (container.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
        {
            "autosize": true,
            "symbol": "BINANCE:BTCUSDT",
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "calendar": false,
            "support_host": "https://www.tradingview.com"
        }`;

    container.current.appendChild(script);
  }, []);

  // Resize Handlers
  const handleMouseDown = (e) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = positionsHeight;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const delta = startY.current - e.clientY; // Drag up increases height
    const newHeight = Math.min(Math.max(startHeight.current + delta, 40), 600); // Min 40px, Max 600px
    setPositionsHeight(newHeight);
  }, []);

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  const handleOrder = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await placeOrder({
        side,
        amount: parseFloat(amount),
        leverage: parseInt(leverage),
        type: orderType
      });
      // Success feedback?
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcPnL = (pos) => {
    const quantity = pos.size / pos.entry_price;
    let pnl = 0;
    if (pos.side === 'LONG') {
      pnl = (currentPrice - pos.entry_price) * quantity;
    } else {
      pnl = (pos.entry_price - currentPrice) * quantity;
    }
    return pnl;
  };

  return (
    <div className="h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">BTC/USDT</span>
            <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400">Perpetual</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-slate-400 text-xs">Mark Price</span>
            <span className={`font-mono font-medium ${currentPrice > ticker24h.low ? 'text-emerald-400' : 'text-red-400'}`}>
              ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-400 text-xs">24h Change</span>
            <span className={`font-mono font-medium ${ticker24h.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {ticker24h.change > 0 ? '+' : ''}{ticker24h.change}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content: Chart + Positions */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chart Area */}
          <div className="flex-1 bg-slate-900 relative border-r border-slate-800 min-h-0" ref={container}></div>

          {/* Draggable Divider */}
          <div
            onMouseDown={handleMouseDown}
            className="h-2 bg-slate-800 hover:bg-blue-500/50 cursor-row-resize flex items-center justify-center transition-colors z-10 shrink-0 border-t border-slate-700"
          >
            <GripHorizontal size={12} className="text-slate-500" />
          </div>

          {/* Positions Panel */}
          <div
            className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0"
            style={{ height: positionsHeight }}
          >
            <div className="px-4 py-2 border-b border-slate-800 font-medium text-sm text-slate-300 flex justify-between items-center">
              <span>Open Positions ({positions.length})</span>
              <span className="text-xs text-slate-500">Drag separator to resize</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 bg-slate-800/30 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Symbol</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2">Entry Price</th>
                    <th className="px-4 py-2">Mark Price</th>
                    <th className="px-4 py-2">Liq. Price</th>
                    <th className="px-4 py-2">Margin</th>
                    <th className="px-4 py-2">PnL (ROE%)</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const pnl = calcPnL(pos);
                    const roe = (pnl / pos.margin) * 100;
                    return (
                      <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <span className={pos.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>
                            {pos.side}
                          </span>
                          {pos.symbol}
                          <span className="text-slate-500 text-[10px] bg-slate-800 px-1 rounded">{pos.leverage}x</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          ${parseFloat(pos.size).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          ${parseFloat(pos.entry_price).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          ${currentPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-orange-400">
                          ${parseFloat(pos.liquidation_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          ${parseFloat(pos.margin).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </span>
                          <span className={`ml-1 text-[10px] ${roe >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            ({roe.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => closePosition(pos)}
                            className="text-slate-400 hover:text-white hover:bg-slate-700 p-1 rounded transition-colors"
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-slate-500 italic">
                        No open positions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-80 bg-slate-900 flex flex-col border-l border-slate-800 shrink-0">
          {/* Order Tabs */}
          <div className="flex border-b border-slate-800">
            {['Limit', 'Market', 'Stop'].map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type.toUpperCase())}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${orderType === type.toUpperCase() ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Order Form */}
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">

            {/* Leverage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Leverage</span>
                <span className="text-slate-200">{leverage}x</span>
              </div>
              <div className="flex gap-1">
                {['1', '5', '10', '20', '50'].map(lev => (
                  <button
                    key={lev}
                    onClick={() => setLeverage(lev)}
                    className={`flex-1 py-1 text-xs rounded border ${leverage === lev ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Amount (USDT)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500">USDT</span>
                </div>
              </div>

              {/* Balance Info */}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Wallet size={12} /> Avail
                </span>
                <span className="text-slate-300 font-mono">
                  ${profile?.balance ? parseFloat(profile.balance).toLocaleString() : '0.00'}
                </span>
              </div>
            </div>

            {/* Error Msg */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Buy/Sell Buttons */}
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSide('LONG')}
                  className={`py-3 rounded-lg font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${side === 'LONG' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                >
                  <span className="flex items-center gap-1">Buy / Long</span>
                </button>
                <button
                  onClick={() => setSide('SHORT')}
                  className={`py-3 rounded-lg font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${side === 'SHORT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                >
                  <span className="flex items-center gap-1">Sell / Short</span>
                </button>
              </div>

              <button
                onClick={handleOrder}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${side === 'LONG' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-500 shadow-red-500/20'}`}
              >
                {isSubmitting ? 'Placing Order...' : (side === 'LONG' ? 'Confirm Buy Long' : 'Confirm Sell Short')}
              </button>
            </div>

            {/* Order Info */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Cost</span>
                <span className="text-slate-300 font-mono">${amount}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Fee (0.1%)</span>
                <span className="text-slate-300 font-mono">${(parseFloat(amount) * 0.001).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Est. Liquidation</span>
                <span className="text-orange-400 font-mono">
                  {/* Simple Liq Calc for Display */}
                  {(() => {
                    const entry = currentPrice || 0;
                    const lev = parseInt(leverage);
                    if (side === 'LONG') return (entry * (1 - 1 / lev + 0.005)).toLocaleString(undefined, { maximumFractionDigits: 2 });
                    return (entry * (1 + 1 / lev - 0.005)).toLocaleString(undefined, { maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;
