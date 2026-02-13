import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Wallet, AlertCircle, GripHorizontal, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/useTrading';

const Market = () => {
  const { profile, currentPrice, ticker24h, placeOrder, positions, pendingOrders, closePosition, cancelPendingOrder } = useTrading();
  const container = useRef();

  const [orderType, setOrderType] = useState('MARKET');
  const [amount, setAmount] = useState('1000');
  const [leverage, setLeverage] = useState('10');
  const [side, setSide] = useState('LONG');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [positionsHeight, setPositionsHeight] = useState(256);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    if (!container.current) return;
    if (container.current.querySelector('script')) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
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
    const delta = startY.current - e.clientY;
    const newHeight = Math.min(Math.max(startHeight.current + delta, 60), 700);
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
        leverage: parseInt(leverage, 10),
        type: orderType,
        triggerPrice: orderType === 'MARKET' ? null : parseFloat(triggerPrice),
        tp: tp ? parseFloat(tp) : null,
        sl: sl ? parseFloat(sl) : null
      });
      setTriggerPrice('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcPnL = (pos) => {
    const quantity = pos.size / pos.entry_price;
    if (pos.side === 'LONG') return (currentPrice - pos.entry_price) * quantity;
    return (pos.entry_price - currentPrice) * quantity;
  };

  return (
    <div className="h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
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
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-slate-900 relative border-r border-slate-800 min-h-0" ref={container}></div>

          <div onMouseDown={handleMouseDown} className="h-2 bg-slate-800 hover:bg-blue-500/50 cursor-row-resize flex items-center justify-center transition-colors z-10 shrink-0 border-t border-slate-700">
            <GripHorizontal size={12} className="text-slate-500" />
          </div>

          <div className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0" style={{ height: positionsHeight }}>
            <div className="px-4 py-2 border-b border-slate-800 font-medium text-sm text-slate-300 flex justify-between items-center">
              <span>Open Positions ({positions.length})</span>
              <span className="text-xs text-slate-500">Drag separator to resize</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 bg-slate-800/30 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Symbol</th>
                    <th className="px-4 py-2">Entry</th>
                    <th className="px-4 py-2">Mark</th>
                    <th className="px-4 py-2">TP / SL</th>
                    <th className="px-4 py-2">PnL</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const pnl = calcPnL(pos);
                    const roe = (pnl / pos.margin) * 100;
                    return (
                      <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-medium">
                          <span className={pos.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{pos.side}</span> {pos.symbol} <span className="text-slate-500">{pos.leverage}x</span>
                        </td>
                        <td className="px-4 py-3 font-mono">${Number(pos.entry_price).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono">${Number(currentPrice).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          TP: {pos.take_profit ? Number(pos.take_profit).toLocaleString() : '-'} / SL: {pos.stop_loss ? Number(pos.stop_loss).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                          <span className={`ml-1 text-[10px] ${roe >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>({roe.toFixed(2)}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => closePosition(pos)} className="text-slate-300 hover:text-white">Close</button>
                        </td>
                      </tr>
                    );
                  })}
                  {positions.length === 0 && <tr><td colSpan="6" className="px-4 py-6 text-center text-slate-500">No open positions</td></tr>}
                </tbody>
              </table>

              <div className="mt-4 px-4 pb-4">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2"><Clock size={12} /> Pending Orders ({pendingOrders.length})</div>
                <div className="space-y-2">
                  {pendingOrders.map((o) => (
                    <div key={o.id} className="bg-slate-800/40 border border-slate-700 rounded p-2 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-blue-300">{o.order_type}</span> {o.side} @ <span className="font-mono">{Number(o.trigger_price).toFixed(2)}</span>
                        <span className="text-slate-500 ml-2">{o.leverage}x • ${Number(o.margin).toFixed(2)}</span>
                      </div>
                      <button onClick={() => cancelPendingOrder(o.id)} className="text-red-400 hover:text-red-300">Cancel</button>
                    </div>
                  ))}
                  {pendingOrders.length === 0 && <div className="text-slate-500 text-xs">No pending orders</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 bg-slate-900 flex flex-col border-l border-slate-800 shrink-0">
          <div className="flex border-b border-slate-800">
            {['LIMIT', 'MARKET', 'STOP'].map(type => (
              <button key={type} onClick={() => setOrderType(type)} className={`flex-1 py-3 text-sm font-medium ${orderType === type ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}>
                {type}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400"><span>Leverage</span><span>{leverage}x</span></div>
              <div className="flex gap-1">
                {['1', '5', '10', '20', '50'].map(lev => (
                  <button key={lev} onClick={() => setLeverage(lev)} className={`flex-1 py-1 text-xs rounded border ${leverage === lev ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">Amount (USDT)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm" />
            </div>

            {orderType !== 'MARKET' && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Trigger Price</label>
                <input type="number" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm" placeholder="Enter trigger" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Take Profit (optional)</label>
                <input type="number" value={tp} onChange={(e) => setTp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Stop Loss (optional)</label>
                <input type="number" value={sl} onChange={(e) => setSl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm" />
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1"><Wallet size={12} /> Avail</span>
              <span className="text-slate-300 font-mono">${profile?.balance ? parseFloat(profile.balance).toLocaleString() : '0.00'}</span>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setSide('LONG')} className={`py-3 rounded-lg font-bold text-sm ${side === 'LONG' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>Buy / Long</button>
              <button onClick={() => setSide('SHORT')} className={`py-3 rounded-lg font-bold text-sm ${side === 'SHORT' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-500'}`}>Sell / Short</button>
            </div>

            <button onClick={handleOrder} disabled={isSubmitting} className={`w-full py-4 rounded-xl font-bold text-white disabled:opacity-50 ${side === 'LONG' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
              {isSubmitting ? 'Submitting...' : `Place ${orderType} ${side}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;
