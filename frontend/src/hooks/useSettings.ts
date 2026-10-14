import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const SETTINGS_KEY = 'maskAI_settings';

const defaultSettings: Settings = {
  confidenceThreshold: 0.8,
  detectionInterval: 500,
  saveHistory: true,
  theme: 'dark',
  backendUrl: '',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(defaultSettings);
  }, []);

  return { settings, updateSettings, resetSettings };
}
