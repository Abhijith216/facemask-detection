import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'teal' | 'purple';
  subtitle?: string;
  trend?: number;
}

const COLOR_CLASSES: Record<StatCardProps['color'], { bg: string; icon: string; border: string; glow: string }> = {
  blue:   { bg: 'bg-cyan-950/40 text-cyan-400',   icon: 'text-cyan-400',   border: 'border-cyan-500/20 hover:border-cyan-500/50', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]' },
  green:  { bg: 'bg-emerald-950/40 text-emerald-400', icon: 'text-emerald-400', border: 'border-emerald-500/20 hover:border-emerald-500/50', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
  red:    { bg: 'bg-rose-950/40 text-rose-400',     icon: 'text-rose-400',     border: 'border-rose-500/20 hover:border-rose-500/50', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]' },
  yellow: { bg: 'bg-amber-950/40 text-amber-400', icon: 'text-amber-400', border: 'border-amber-500/20 hover:border-amber-500/50', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
  teal:   { bg: 'bg-teal-950/40 text-teal-400',   icon: 'text-teal-400',   border: 'border-teal-500/20 hover:border-teal-500/50', glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]' },
  purple: { bg: 'bg-purple-950/40 text-purple-400', icon: 'text-purple-400', border: 'border-purple-500/20 hover:border-purple-500/50', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
}) => {
  const c = COLOR_CLASSES[color];
  return (
    <div className={`relative overflow-hidden bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border ${c.border} transition-all duration-300 hover:-translate-y-1 ${c.glow}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl border border-white/5 ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend !== undefined && (
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-white tracking-tight mt-1 font-mono">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
};
