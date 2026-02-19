import React, { useMemo } from 'react';
import {
    ComposedChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea
} from 'recharts';
import { generateMockCandleData, calculateLiquidityZones } from '../utils/indicators';

const CustomChart = () => {
    const data = useMemo(() => generateMockCandleData(150), []);
    const zones = useMemo(() => calculateLiquidityZones(data), [data]);

    if (!data || data.length === 0) {
        return <div className="text-white p-4">Initializing Chart Data...</div>;
    }

    return (
        <div className="w-full h-full bg-slate-900 p-4 flex flex-col">
            <div className="shrink-0 flex justify-between items-center mb-4">
                <h3 className="text-slate-200 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    BTC/USDT Custom Liquidity Map
                </h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500/20 border border-red-500"></div>
                        <span className="text-slate-400">Sell Liquidity</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500"></div>
                        <span className="text-slate-400">Buy Liquidity</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="day"
                            stroke="#475569"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(val) => `D${val}`}
                        />
                        <YAxis
                            domain={['dataMin - 500', 'dataMax + 500']}
                            orientation="right"
                            stroke="#475569"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            labelStyle={{ color: '#94a3b8' }}
                            formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                        />

                        {/* Draw Liquidity Zones using ReferenceArea */}
                        {zones.map((zone, i) => (
                            <ReferenceArea
                                key={i}
                                x1={zone.x1}
                                x2={zone.x2}
                                y1={zone.y1}
                                y2={zone.y2}
                                fill={zone.type === 'SELL' ? '#ef4444' : '#10b981'}
                                fillOpacity={0.15}
                                stroke="none"
                            />
                        ))}

                        {/* Price Line */}
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke="#3b82f6"
                            fill="url(#colorPrice)"
                            strokeWidth={2}
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff' }}
                        />

                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CustomChart;
