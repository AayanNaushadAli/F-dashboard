import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Wallet, AlertCircle, GripHorizontal, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrading } from '../context/useTrading';
import PairSelector from './PairSelector';
import Layout from './Layout';

const Market = () => {
  const { profile, currentPrice, ticker24h, placeOrder, positions, pendingOrders, history, closePosition, closePositionPartial, updatePositionRisk, cancelPendingOrder, currentSymbol, changeSymbol, availablePairs } = useTrading();
  const container = useRef();

  const [orderType, setOrderType] = useState('MARKET');
  const [amount, setAmount] = useState('1000');
  const [leverage, setLeverage] = useState('10');
  const [side, setSide] = useState('LONG');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [trailingEnabled, setTrailingEnabled] = useState(false);
  const [trailingPercent, setTrailingPercent] = useState('1');
  const [reduceOnly, setReduceOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowRisk, setRowRisk] = useState({});
  const [error, setError] = useState(null);
  const [riskModal, setRiskModal] = useState({ open: false, position: null });
  const [closeModal, setCloseModal] = useState({ open: false, position: null, percent: '100' });
  const [ticket, setTicket] = useState({ open: false, tab: 'close', position: null });

  const [positionsHeight, setPositionsHeight] = useState(256);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = ''; // Clear previous chart

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "BINANCE:${currentSymbol}",
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
  }, [currentSymbol]);

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
        sl: sl ? parseFloat(sl) : null,
        trailingEnabled,
        trailingPercent: trailingEnabled ? parseFloat(trailingPercent) : null,
        reduceOnly
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

  const getRiskDraft = (pos) => rowRisk[pos.id] || {
    tp: pos.take_profit ? String(pos.take_profit) : '',
    sl: pos.stop_loss ? String(pos.stop_loss) : '',
    trailingEnabled: Boolean(pos.trailing_sl_enabled),
    trailingPercent: pos.trailing_sl_percent ? String(pos.trailing_sl_percent) : '1',
    tpVariants: pos.tp_variants || []
  };

  const onRiskDraftChange = (posId, patch) => {
    setRowRisk((prev) => ({ ...prev, [posId]: { ...(prev[posId] || {}), ...patch } }));
  };

  const openTicket = (pos, tab = 'close') => {
    onRiskDraftChange(pos.id, getRiskDraft(pos));
    setCloseModal({ open: false, position: pos, percent: '100' });
    setRiskModal({ open: false, position: pos });
    setTicket({ open: true, tab, position: pos });
  };

  const saveRisk = async () => {
    const pos = ticket.position || riskModal.position;
    if (!pos) return;
    const draft = getRiskDraft(pos);
    await updatePositionRisk(pos.id, {
      takeProfit: draft.tp ? Number(draft.tp) : null,
      stopLoss: draft.sl ? Number(draft.sl) : null,
      trailingEnabled: draft.trailingEnabled,
      trailingPercent: draft.trailingEnabled ? Number(draft.trailingPercent) : null,
      tpVariants: draft.tpVariants
    });
    setTicket((t) => ({ ...t, open: false, position: null }));
    setRiskModal({ open: false, position: null });
  };

  const submitClose = async () => {
    const pos = ticket.position || closeModal.position;
    if (!pos) return;
    const pct = Number(closeModal.percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError('Exit % must be between 0 and 100');
      return;
    }
    if (pct === 100) await closePosition(pos);
    else await closePositionPartial(pos, pct);
    setCloseModal({ open: false, position: null, percent: '100' });
    setTicket((t) => ({ ...t, open: false, position: null }));
  };

  return (
    <Layout>
      <div className="h-full bg-slate-900 text-slate-100 font-sans flex flex-col">
        <div className="h-auto md:h-14 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center px-4 md:px-6 justify-between bg-slate-900/50 backdrop-blur-sm z-10 shrink-0 py-2 md:py-0 gap-2 md:gap-0">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-4">
              {/* Back button removed */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <PairSelector
                      currentSymbol={currentSymbol}
                      pairs={availablePairs}
                      onSelect={changeSymbol}
                    />
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400 hidden sm:inline">Perpetual</span>
                </div>
              </div>
              {/* Mobile Stats Show here */}
              <div className="flex md:hidden items-center gap-4 text-xs">
                <span className={`font-mono font-medium ${currentPrice > ticker24h.low ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${currentPrice?.toLocaleString()}
                </span>
                <span className={`font-mono font-medium ${ticker24h.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {ticker24h.change > 0 ? '+' : ''}{ticker24h.change}%
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
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
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 bg-slate-900 relative border-r border-slate-800 min-h-0" ref={container}></div>

            <div onMouseDown={handleMouseDown} className="h-2 bg-slate-800 hover:bg-blue-500/50 cursor-row-resize flex items-center justify-center transition-colors z-10 shrink-0 border-t border-slate-700 hidden lg:flex">
              <GripHorizontal size={12} className="text-slate-500" />
            </div>

            <div className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0" style={{ height: window.innerWidth < 1024 ? 'auto' : positionsHeight }}>
              <div className="px-4 py-2 border-b border-slate-800 font-medium text-sm text-slate-300 flex justify-between items-center">
                <span>Open Positions ({positions.length})</span>
                <span className="text-xs text-slate-500 hidden lg:inline">Drag separator to resize</span>
              </div>
              <div className="flex-1 overflow-auto max-h-48 lg:max-h-none">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-500 bg-slate-800/30 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Symbol</th>
                      <th className="px-4 py-2">Entry</th>
                      <th className="px-4 py-2 hidden sm:table-cell">Mark</th>
                      <th className="px-4 py-2 hidden sm:table-cell">Risk Controls</th>
                      <th className="px-4 py-2">PnL</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => {
                      const pnl = calcPnL(pos);
                      const roe = (pnl / pos.margin) * 100;
                      return (
                        <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800/20">
                          <td className="px-4 py-3 font-medium">
                            <span className={pos.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{pos.side}</span> {pos.symbol} <span className="text-slate-500 block sm:inline">{pos.leverage}x</span>
                          </td>
                          <td className="px-4 py-3 font-mono">${Number(pos.entry_price).toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono hidden sm:table-cell">${Number(currentPrice).toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-300 text-[11px] hidden sm:table-cell">
                            TP: {pos.take_profit ? Number(pos.take_profit).toFixed(2) : '-'}
                            <br />
                            SL: {pos.stop_loss ? Number(pos.stop_loss).toFixed(2) : '-'}
                            <br />
                            Trail: {pos.trailing_sl_enabled ? `${Number(pos.trailing_sl_percent || 0).toFixed(2)}%` : 'Off'}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                            <span className={`block sm:ml-1 text-[10px] ${roe >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>({roe.toFixed(2)}%)</span>
                          </td>
                          <td className="px-4 py-3 text-right space-y-1 sm:space-y-0 sm:space-x-2">
                            <button onClick={() => openTicket(pos, 'risk')} className="text-blue-300 hover:text-blue-200 block sm:inline">TP/SL</button>
                            <button onClick={() => openTicket(pos, 'close')} className="text-red-300 hover:text-red-200 block sm:inline">Close</button>
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
                          <span className="text-slate-500 ml-2 block sm:inline">{o.leverage}x • ${Number(o.margin).toFixed(2)}</span>
                        </div>
                        <button onClick={() => cancelPendingOrder(o.id)} className="text-red-400 hover:text-red-300">Cancel</button>
                      </div>
                    ))}
                    {pendingOrders.length === 0 && <div className="text-slate-500 text-xs">No pending orders</div>}
                  </div>

                  <div className="mt-4 border-t border-slate-800 pt-3 hidden lg:block">
                    <div className="text-xs text-slate-400 mb-2">Recent Fills</div>
                    <div className="space-y-1">
                      {(history || []).slice(0, 8).map((h) => (
                        <div key={h.id} className="text-[11px] text-slate-300 flex justify-between bg-slate-800/30 px-2 py-1 rounded">
                          <span>{h.side} {h.symbol}</span>
                          <span className={Number(h.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}>{Number(h.pnl) >= 0 ? '+' : ''}{Number(h.pnl).toFixed(2)}</span>
                        </div>
                      ))}
                      {(!history || history.length === 0) && <div className="text-slate-500 text-xs">No fills yet</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 h-[450px] lg:h-auto bg-slate-900 flex flex-col border-t lg:border-t-0 border-l-0 lg:border-l border-slate-800 shrink-0">
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

              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-400 flex items-center gap-2">
                  <input type="checkbox" checked={trailingEnabled} onChange={(e) => setTrailingEnabled(e.target.checked)} />
                  Enable Trailing SL
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={trailingPercent}
                    onChange={(e) => setTrailingPercent(e.target.value)}
                    disabled={!trailingEnabled}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>

              <label className="text-slate-400 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={reduceOnly} onChange={(e) => setReduceOnly(e.target.checked)} />
                Reduce-Only (won't open opposite new exposure)
              </label>

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

        {
          ticket.open && ticket.position && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setTicket({ open: false, tab: 'close', position: null })} />
              <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Order Ticket</h3>
                  <button onClick={() => setTicket({ open: false, tab: 'close', position: null })} className="text-slate-400">✕</button>
                </div>

                <div className="flex border border-slate-700 rounded-lg overflow-hidden mb-4 text-xs">
                  <button onClick={() => setTicket((t) => ({ ...t, tab: 'close' }))} className={`flex-1 py-2 ${ticket.tab === 'close' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Close Position</button>
                  <button onClick={() => setTicket((t) => ({ ...t, tab: 'risk' }))} className={`flex-1 py-2 ${ticket.tab === 'risk' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Modify TP/SL</button>
                  <button onClick={() => setTicket((t) => ({ ...t, tab: 'advanced' }))} className={`flex-1 py-2 ${ticket.tab === 'advanced' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Advanced</button>
                </div>

                {ticket.tab === 'close' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">How much do you want to exit?</p>
                    <input
                      type="number"
                      value={closeModal.percent}
                      onChange={(e) => setCloseModal((prev) => ({ ...prev, percent: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                      min="1"
                      max="100"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setCloseModal((p) => ({ ...p, percent: '25' }))} className="px-2 py-1 text-xs bg-slate-800 rounded">25%</button>
                      <button onClick={() => setCloseModal((p) => ({ ...p, percent: '50' }))} className="px-2 py-1 text-xs bg-slate-800 rounded">50%</button>
                      <button onClick={() => setCloseModal((p) => ({ ...p, percent: '100' }))} className="px-2 py-1 text-xs bg-slate-800 rounded">100%</button>
                    </div>
                    <button onClick={submitClose} className="w-full py-2 text-sm bg-red-600 rounded">Confirm Close</button>
                  </div>
                )}

                {ticket.tab === 'risk' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 block">Take Profit Levels (TP1, TP2...)</label>
                      {(getRiskDraft(ticket.position).tpVariants || []).map((v, i) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500">Price</label>
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => {
                                const newVariants = [...(getRiskDraft(ticket.position).tpVariants || [])];
                                newVariants[i].price = e.target.value;
                                onRiskDraftChange(ticket.position.id, { tpVariants: newVariants });
                              }}
                              className={`w-full bg-slate-950 border ${v.executed ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700'} rounded px-2 py-1 text-xs`}
                              placeholder="Price"
                              disabled={v.executed}
                            />
                          </div>
                          <div className="w-20">
                            <label className="text-[10px] text-slate-500">% Close</label>
                            <input
                              type="number"
                              value={v.percent}
                              onChange={(e) => {
                                const newVariants = [...(getRiskDraft(ticket.position).tpVariants || [])];
                                newVariants[i].percent = e.target.value;
                                onRiskDraftChange(ticket.position.id, { tpVariants: newVariants });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                              placeholder="%"
                              disabled={v.executed}
                            />
                          </div>
                          {!v.executed && (
                            <button
                              onClick={() => {
                                const newVariants = [...(getRiskDraft(ticket.position).tpVariants || [])];
                                newVariants.splice(i, 1);
                                onRiskDraftChange(ticket.position.id, { tpVariants: newVariants });
                              }}
                              className="mt-4 text-red-500 hover:text-red-400 px-2"
                            >
                              ✕
                            </button>
                          )}
                          {v.executed && <span className="mt-4 text-emerald-500 text-[10px]">✓</span>}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const current = getRiskDraft(ticket.position).tpVariants || [];
                          if (current.length < 5) {
                            onRiskDraftChange(ticket.position.id, { tpVariants: [...current, { price: '', percent: '50', executed: false }] });
                          }
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        + Add Take Profit Level
                      </button>
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <label className="text-xs text-slate-400 block mb-1">Main Stop Loss</label>
                      <input
                        type="number"
                        placeholder="Stop Loss"
                        value={getRiskDraft(ticket.position).sl}
                        onChange={(e) => onRiskDraftChange(ticket.position.id, { sl: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(getRiskDraft(ticket.position).trailingEnabled)}
                        onChange={(e) => onRiskDraftChange(ticket.position.id, { trailingEnabled: e.target.checked })}
                      />
                      Enable trailing SL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={getRiskDraft(ticket.position).trailingPercent}
                        onChange={(e) => onRiskDraftChange(ticket.position.id, { trailingPercent: e.target.value })}
                        disabled={!getRiskDraft(ticket.position).trailingEnabled}
                        className="w-24 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                      />
                      <span className="text-slate-400 text-sm">%</span>
                    </div>
                    <button onClick={saveRisk} className="w-full py-2 text-sm bg-blue-600 rounded">Save Risk Settings</button>
                  </div>
                )}

                {ticket.tab === 'advanced' && (
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                      <div className="font-medium mb-1">OCO Bracket Link</div>
                      <div className="text-slate-400">TP and SL are managed as one bracket path in trigger checks (first hit closes position).</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                      <div className="font-medium mb-1">Reduce-only behavior</div>
                      <div className="text-slate-400">Reduce-only prevents increasing opposite exposure and only reduces open positions.</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        }
      </div>
    </Layout>
  );
};

export default Market;
