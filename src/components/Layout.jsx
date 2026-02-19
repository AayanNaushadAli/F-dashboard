import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex bg-black h-screen overflow-hidden text-slate-200 font-sans selection:bg-cyan-500/30 relative">
            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 left-4 z-30 p-2 bg-slate-900/50 backdrop-blur-md rounded-lg text-slate-400 hover:text-white md:hidden border border-slate-800"
            >
                <Menu size={24} />
            </button>

            {/* Persistent Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full">
                {children}
            </div>
        </div>
    );
};

export default Layout;
