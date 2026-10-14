import React from 'react';
import { Menu, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import type { Settings } from '../types';

interface HeaderProps {
  onMenuToggle: () => void;
  connected: boolean;
  settings: Settings;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  connected,
  settings,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            id="menu-toggle-btn"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>MASK AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase tracking-widest font-semibold">
                  v2.0 Neural Vision
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-Time Computer Vision & Deep Learning Surveillance Suite
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Neural Engine status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <span className="text-cyan-400 font-mono font-medium">Model:</span>
            <span className="font-medium text-slate-200">MobileNetV2 (92.2% Acc)</span>
          </div>

          {/* Backend Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              connected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
            </span>
            {connected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="font-mono text-xs">{connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Theme toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
