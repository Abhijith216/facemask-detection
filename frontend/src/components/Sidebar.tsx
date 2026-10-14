import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  ImageIcon,
  Clock,
  BarChart3,
  Info,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/live', label: 'Live Detection', icon: Camera },
  { path: '/image', label: 'Image Analysis', icon: ImageIcon },
  { path: '/history', label: 'Detection History', icon: Clock },
  { path: '/performance', label: 'Model Performance', icon: BarChart3 },
  { path: '/about', label: 'About Project', icon: Info },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-40
          flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0a1628 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #14b8a6)' }}
            >
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">MASK AI</p>
              <p className="text-blue-400 text-[10px] leading-tight mt-0.5">Detection System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>ACCURACY</span>
              <span className="text-emerald-400 font-bold">92.2%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full w-[92.2%]"></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">
              MobileNetV2 · ImageNet CNN Head
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
