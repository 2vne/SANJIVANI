import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

import { ZenAIChatbot } from '../components/common/ZenAIChatbot';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2F6] text-slate-800 font-sans antialiased relative">
      <Navbar />

      {/* Page View Container */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Global Zen AI Bot */}
      <ZenAIChatbot />
    </div>
  );
};
