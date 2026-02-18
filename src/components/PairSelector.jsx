import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const PairSelector = ({ currentSymbol, pairs, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const filteredPairs = pairs.filter(p =>
        p.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-lg font-bold text-slate-100 hover:text-white transition-colors"
            >
                {currentSymbol.replace('USDT', '/USDT')}
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-700">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search pair..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {filteredPairs.length > 0 ? (
                            filteredPairs.map(pair => (
                                <button
                                    key={pair}
                                    onClick={() => {
                                        onSelect(pair);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 flex items-center justify-between group ${pair === currentSymbol ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300'}`}
                                >
                                    <span className="font-mono">{pair.replace('USDT', '/USDT')}</span>
                                    {pair === currentSymbol && <Check size={14} />}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center">
                                No pairs found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PairSelector;
