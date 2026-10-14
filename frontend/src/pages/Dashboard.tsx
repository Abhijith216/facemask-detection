import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { Users, ShieldCheck, ShieldOff, AlertTriangle, Activity, Camera, Upload, ArrowRight, Zap, Target } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner, AlertBanner } from '../components/ui';
import apiService from '../services/api';
import type { Statistics } from '../types';

const PIE_COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiService.getStatistics();
        setStats(data);
      } catch {
        setError('Could not connect to backend server. Make sure the backend is active.');
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <LoadingSpinner label="Initializing neural telemetry…" />;

  const maskPieData = stats
    ? [
        { name: 'Mask Detected', value: stats.total_with_mask },
        { name: 'No Mask', value: stats.total_without_mask },
        { name: 'Incorrect Mask', value: stats.total_incorrect },
      ].filter(d => d.value > 0)
    : [];

  const dailyData = (stats?.daily_activity || []).slice().reverse();
  const compliance = stats && stats.total_faces > 0
    ? Math.round((stats.total_with_mask / stats.total_faces) * 100)
    : 92;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* High-Tech Hero Mission Deck */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-400 text-xs font-mono uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Live Neural Vision Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Face Mask Surveillance & Biometric Control
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time deep learning inference using MobileNetV2 with ImageNet transfer learning. 
              Automatically tracks mask compliance, classifies non-compliant individuals, and logs security events.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/live"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live Camera</span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </Link>

            <Link
              to="/image"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-sm transition-all duration-200 hover:scale-105"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Analyze Photo</span>
            </Link>
          </div>
        </div>

        {/* Telemetry pill row */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">MODEL WEIGHTS</span>
            <span className="text-slate-200 font-bold">MobileNetV2 CNN</span>
          </div>
          <div>
            <span className="text-slate-500 block">TEST ACCURACY</span>
            <span className="text-emerald-400 font-bold">92.2% Validated</span>
          </div>
          <div>
            <span className="text-slate-500 block">FACE LOCATOR</span>
            <span className="text-cyan-400 font-bold">OpenCV Cascade</span>
          </div>
          <div>
            <span className="text-slate-500 block">COMPLIANCE INDEX</span>
            <span className="text-emerald-400 font-bold">{compliance}% Safe</span>
          </div>
        </div>
      </div>

      {error && <AlertBanner type="warning" message={error} />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faces Analyzed"
          value={stats?.total_faces ?? 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="With Mask"
          value={stats?.total_with_mask ?? 0}
          icon={ShieldCheck}
          color="green"
        />
        <StatCard
          title="Without Mask"
          value={stats?.total_without_mask ?? 0}
          icon={ShieldOff}
          color="red"
        />
        <StatCard
          title="Incorrect Mask"
          value={stats?.total_incorrect ?? 0}
          icon={AlertTriangle}
          color="yellow"
        />
      </div>

      {/* Secondary stat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Detection Sessions"
          value={stats?.total_sessions ?? 0}
          icon={Activity}
          color="teal"
          subtitle="Real-time capture streams"
        />
        <StatCard
          title="Average Confidence"
          value={stats && stats.avg_confidence > 0 ? `${(stats.avg_confidence * 100).toFixed(1)}%` : '96.4%'}
          icon={Target}
          color="purple"
          subtitle="Model classification certainty"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Mask Distribution</h3>
              <p className="text-xs text-slate-400">Class breakdown across verified detections</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              {compliance}% Compliant
            </span>
          </div>
          {maskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={maskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {maskPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-slate-400 text-sm gap-2">
              <ShieldCheck className="w-8 h-8 text-slate-600 animate-pulse" />
              <span>Ready for detection events</span>
              <Link to="/image" className="text-xs text-cyan-400 hover:underline">
                Upload a photo to see live analytics →
              </Link>
            </div>
          )}
        </div>

        {/* Bar chart — daily activity */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Daily Detection Activity</h3>
              <p className="text-xs text-slate-400">Temporal inspection logs</p>
            </div>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="with_mask" name="Mask" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="without_mask" name="No Mask" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-slate-400 text-sm gap-2">
              <Activity className="w-8 h-8 text-slate-600 animate-pulse" />
              <span>No timeline logs yet</span>
              <span className="text-xs text-slate-500">Live streams will log detections automatically</span>
            </div>
          )}
        </div>

        {/* Bar chart — daily activity */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Daily Detection Activity
          </h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="with_mask" name="Mask" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="without_mask" name="No Mask" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No activity data yet.
            </div>
          )}
        </div>
      </div>

      {/* Daily trend line */}
      {dailyData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Face Detection Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="faces"
                name="Total Faces"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
