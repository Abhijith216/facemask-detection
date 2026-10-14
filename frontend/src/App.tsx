import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { LiveDetection } from './pages/LiveDetection';
import { ImageAnalysis } from './pages/ImageAnalysis';
import { DetectionHistory } from './pages/DetectionHistory';
import { ModelPerformance } from './pages/ModelPerformance';
import { AboutProject } from './pages/AboutProject';
import { SettingsPage } from './pages/SettingsPage';
import { useSettings } from './hooks/useSettings';
import { useBackendHealth } from './hooks/useBackendHealth';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings, updateSettings, resetSettings } = useSettings();
  const { connected } = useBackendHealth(10000);

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#070b14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#070b14] to-[#05080f]">
          <Header
            onMenuToggle={() => setSidebarOpen(v => !v)}
            connected={connected}
            settings={settings}
            onToggleTheme={toggleTheme}
          />

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/live"
                element={
                  <LiveDetection
                    confidenceThreshold={settings.confidenceThreshold}
                    detectionInterval={settings.detectionInterval}
                    saveHistory={settings.saveHistory}
                  />
                }
              />
              <Route
                path="/image"
                element={<ImageAnalysis confidenceThreshold={settings.confidenceThreshold} />}
              />
              <Route path="/history" element={<DetectionHistory />} />
              <Route path="/performance" element={<ModelPerformance />} />
              <Route path="/about" element={<AboutProject />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    settings={settings}
                    onUpdate={updateSettings}
                    onReset={resetSettings}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
