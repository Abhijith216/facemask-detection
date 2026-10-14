import React, { useState } from 'react';
import { RotateCcw, Wifi, WifiOff, Cpu } from 'lucide-react';
import type { Settings } from '../types';
import { useBackendHealth } from '../hooks/useBackendHealth';

interface SettingsPageProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  onReset: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdate, onReset }) => {
  const { health, connected, refresh } = useBackendHealth(15000);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleReset = () => {
    if (resetConfirm) {
      onReset();
      setResetConfirm(false);
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure detection preferences and appearance
        </p>
      </div>

      {/* Detection settings */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Detection Settings</h3>

        {/* Confidence threshold */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Confidence Threshold
            </label>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
              {(settings.confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            id="confidence-slider"
            type="range"
            min="0.1"
            max="0.99"
            step="0.01"
            value={settings.confidenceThreshold}
            onChange={e => onUpdate({ confidenceThreshold: parseFloat(e.target.value) })}
            className="w-full h-2 rounded-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>10% (more sensitive)</span>
            <span>99% (more strict)</span>
          </div>
        </div>

        {/* Detection interval */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Webcam Detection Interval
            </label>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
              {settings.detectionInterval} ms
            </span>
          </div>
          <input
            id="interval-slider"
            type="range"
            min="200"
            max="3000"
            step="100"
            value={settings.detectionInterval}
            onChange={e => onUpdate({ detectionInterval: parseInt(e.target.value) })}
            className="w-full h-2 rounded-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>200ms (faster, more CPU)</span>
            <span>3000ms (slower)</span>
          </div>
        </div>

        {/* Save history toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Save Detection History</p>
            <p className="text-xs text-slate-400 mt-0.5">Store detection results in the local database</p>
          </div>
          <button
            id="save-history-toggle"
            onClick={() => onUpdate({ saveHistory: !settings.saveHistory })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.saveHistory ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.saveHistory ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Appearance</h3>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
            Theme
          </label>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map(t => (
              <button
                key={t}
                id={`theme-${t}-btn`}
                onClick={() => onUpdate({ theme: t })}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all capitalize ${
                  settings.theme === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Backend config */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Backend Connection</h3>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
            Backend URL
          </label>
          <input
            id="backend-url-input"
            type="text"
            value={settings.backendUrl}
            onChange={e => onUpdate({ backendUrl: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="http://localhost:5000"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <button
            id="refresh-connection-btn"
            onClick={refresh}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Check Connection
          </button>
        </div>
      </div>

      {/* Model status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-purple-500" />
          Model Status
        </h3>
        {health ? (
          <div className="space-y-2 text-sm">
            <Row label="Status" value={health.model.loaded ? '✅ Loaded' : '❌ Not loaded'} />
            <Row label="Classes" value={health.model.classes.join(', ')} />
            <Row label="Path" value={health.model.path} mono />
            {health.model.error && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400">{health.model.error}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Connect to backend to see model status.</p>
        )}
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          id="reset-settings-btn"
          onClick={handleReset}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
            resetConfirm
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          {resetConfirm ? 'Click again to confirm reset' : 'Reset to Defaults'}
        </button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex gap-3 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
    <span className="text-slate-400 w-24 flex-shrink-0 text-xs mt-0.5">{label}</span>
    <span className={`text-slate-700 dark:text-slate-300 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
  </div>
);
