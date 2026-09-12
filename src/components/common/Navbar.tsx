import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Radio,
  Truck,
  Home,
  BarChart3,
  Clock,
  AlertTriangle,
  Send,
  Zap,
  Navigation
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' UTC'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const isReporterMode = location.pathname.startsWith('/report');

  return (
    <header className="sticky top-0 z-50 bg-[#DC0A2D] text-white shadow-lg border-b-4 border-[#89061C]">
      {/* Top Utility / HUD Bar */}
      <div className="bg-[#89061C]/90 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-white/90">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFCB05] animate-pulse" />
          <Clock className="w-3.5 h-3.5 text-[#FFCB05]" />
          <span className="text-white font-bold tracking-wider">{timeStr}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Mode Switcher */}
          <NavLink
            to={isReporterMode ? '/' : '/report'}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border-2 shadow-sm ${isReporterMode
              ? 'bg-white text-[#DC0A2D] border-white hover:bg-slate-100'
              : 'bg-[#FFCB05] text-slate-900 border-[#E5A700] hover:bg-[#FFE066]'
              }`}
          >
            {isReporterMode ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-[#DC0A2D]" />
                <span className="font-display uppercase">SWITCH TO COMMAND CENTER</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-slate-900" />
                <span className="font-display uppercase tracking-wide">FIELD REPORTER PORTAL</span>
              </>
            )}
          </NavLink>
        </div>
      </div>

      {/* Main Nav Items */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#DC0A2D] shadow-md border-2 border-white/80 group-hover:scale-105 transition-transform">
            <div className="relative flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#FFCB05] fill-[#FFCB05]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-wider text-white drop-shadow-sm">
                SANJIVANI
              </span>
            </div>
            <p className="text-[11px] font-sans font-medium text-white/80 hidden sm:block">
              Agentic Disaster Relief & Emergency Resource Coordinator
            </p>
          </div>
        </NavLink>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all flex items-center gap-1.5 border-2 ${isActive
                ? 'bg-white text-[#DC0A2D] border-white shadow-md scale-105'
                : 'bg-black/15 text-white/90 border-transparent hover:bg-white/20 hover:text-white'
              }`
            }
          >
            <Radio className="w-4 h-4" />
            <span className="hidden md:inline">COMMAND CENTER</span>
          </NavLink>

          <NavLink
            to="/incidents"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all flex items-center gap-1.5 border-2 ${isActive
                ? 'bg-white text-[#DC0A2D] border-white shadow-md scale-105'
                : 'bg-black/15 text-white/90 border-transparent hover:bg-white/20 hover:text-white'
              }`
            }
          >
            <AlertTriangle className="w-4 h-4 text-[#FFCB05]" />
            <span className="hidden md:inline">INCIDENTS</span>
          </NavLink>

          <NavLink
            to="/resources"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all flex items-center gap-1.5 border-2 ${isActive
                ? 'bg-white text-[#DC0A2D] border-white shadow-md scale-105'
                : 'bg-black/15 text-white/90 border-transparent hover:bg-white/20 hover:text-white'
              }`
            }
          >
            <Truck className="w-4 h-4 text-emerald-300" />
            <span className="hidden md:inline">RESOURCES</span>
          </NavLink>

          <NavLink
            to="/shelters"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all flex items-center gap-1.5 border-2 ${isActive
                ? 'bg-white text-[#DC0A2D] border-white shadow-md scale-105'
                : 'bg-black/15 text-white/90 border-transparent hover:bg-white/20 hover:text-white'
              }`
            }
          >
            <Home className="w-4 h-4 text-cyan-200" />
            <span className="hidden md:inline">SHELTERS</span>
          </NavLink>

          <NavLink
            to="/safe-route"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all flex items-center gap-1.5 border-2 ${isActive
                ? 'bg-white text-[#DC0A2D] border-white shadow-md scale-105'
                : 'bg-[#FFCB05] text-slate-900 border-[#E5A700] hover:bg-[#FFE066]'
              }`
            }
          >
            <Navigation className="w-4 h-4 text-[#DC0A2D]" />
            <span className="hidden md:inline font-black">SAFE ROUTE</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all flex items-center gap-1.5 border-2 ${isActive
                ? 'bg-white text-[#DC0A2D] border-white shadow-md scale-105'
                : 'bg-black/15 text-white/90 border-transparent hover:bg-white/20 hover:text-white'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 text-purple-200" />
            <span className="hidden md:inline">ANALYTICS</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
