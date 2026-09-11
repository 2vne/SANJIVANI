import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2F6] text-slate-800 font-sans antialiased">
      <Navbar />

      {/* Page View Container */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};
