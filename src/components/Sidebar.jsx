import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, TrendingUp, Cpu, Wallet, Newspaper, LogOut, Brain } from 'lucide-react';
import { supabase } from '../supabase';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();

    // Helper to determine active state
    const isActive = (path) => location.pathname === path;
    const getLinkClass = (path) => `p-3 rounded-xl transition-all ${isActive(path) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-900'}`;
    const getIconClass = (path) => isActive(path) ? 'text-white' : '';

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Content */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-20 flex flex-col items-center py-6 border-r border-slate-900 bg-black transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="mb-8 p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
                    <Brain className="text-white" size={24} />
                </div>

                <nav className="flex-1 flex flex-col gap-6 w-full items-center">
                    <Link to="/" className={getLinkClass('/')} title="Dashboard" onClick={onClose}>
                        <Activity size={20} className={getIconClass('/')} />
                    </Link>

                    <Link to="/market" className={getLinkClass('/market')} title="Trading Terminal" onClick={onClose}>
                        <TrendingUp size={20} className={getIconClass('/market')} />
                    </Link>

                    <Link to="/quant" className={getLinkClass('/quant')} title="Quant System" onClick={onClose}>
                        <Cpu size={20} className={getIconClass('/quant')} />
                    </Link>

                    <Link to="/profile" className={getLinkClass('/profile')} title="Portfolio" onClick={onClose}>
                        <Wallet size={20} className={getIconClass('/profile')} />
                    </Link>

                    <Link to="/news" className={getLinkClass('/news')} title="Market News" onClick={onClose}>
                        <Newspaper size={20} className={getIconClass('/news')} />
                    </Link>

                    <div className="h-px w-8 bg-slate-900 my-2"></div>
                </nav>

                <div className="mt-auto flex flex-col gap-4">
                    <button onClick={() => supabase.auth.signOut()} className="p-3 text-slate-500 hover:text-red-400 transition-colors" title="Logout">
                        <LogOut size={20} />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 ring-2 ring-black"></div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
