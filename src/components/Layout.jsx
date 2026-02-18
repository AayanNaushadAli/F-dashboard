import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    return (
        <div className="flex bg-black h-screen overflow-hidden text-slate-200 font-sans selection:bg-cyan-500/30">
            {/* Persistent Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {children}
            </div>
        </div>
    );
};

export default Layout;
