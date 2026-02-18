import React, { useState, useEffect } from 'react';

const KillzoneStatus = () => {
    const [time, setTime] = useState(new Date());
    const [session, setSession] = useState({ name: 'ASIA (Accumulation)', status: 'WAIT', color: 'text-slate-500' });

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const hours = time.getUTCHours();

        // LONDON KILLZONE: 07:00 - 10:00 UTC (Adjust based on Daylight Savings)
        if (hours >= 7 && hours < 10) {
            setSession({ name: 'LONDON OPEN (Manipulation)', status: 'ACTIVE', color: 'text-emerald-400' });
        }
        // NEW YORK KILLZONE: 13:00 - 16:00 UTC
        else if (hours >= 13 && hours < 16) {
            setSession({ name: 'NEW YORK OPEN (Expansion)', status: 'ACTIVE', color: 'text-cyan-400' });
        }
        // LUNCH LULL: 17:00 - 18:00 UTC
        else if (hours >= 17 && hours < 18) {
            setSession({ name: 'NY LUNCH (Retracement)', status: 'PAUSED', color: 'text-orange-400' });
        }
        // ASIA / DEAD TIME
        else {
            setSession({ name: 'ASIA / OFF-HOURS', status: 'DORMANT', color: 'text-slate-600' });
        }
    }, [time]);

    // Helper to safely get bg color from text color
    const getBgColor = (textColor) => {
        return textColor.replace('text-', 'bg-');
    };

    return (
        <div className="flex flex-col gap-2 p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-lg h-full justify-center">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Market Session</h3>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                    UTC: {time.toISOString().split('T')[1].split('.')[0]}
                </span>
            </div>

            <div className="flex items-center gap-3">
                {/* Pulsing Status Dot */}
                <div className="relative flex h-3 w-3 shrink-0">
                    {session.status === 'ACTIVE' && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getBgColor(session.color)}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${getBgColor(session.color)}`}></span>
                </div>

                <div className="min-w-0">
                    <div className={`text-sm font-black tracking-tight ${session.color} truncate leading-tight`}>
                        {session.status}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                        {session.name}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KillzoneStatus;
