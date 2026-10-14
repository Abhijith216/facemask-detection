import React from 'react';
import { AlertTriangle, ServerCrash } from 'lucide-react';

interface ModelNotReadyBannerProps {
  error?: string | null;
}

export const ModelNotReadyBanner: React.FC<ModelNotReadyBannerProps> = ({ error }) => (
  <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 flex gap-4 items-start">
    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
      <ServerCrash className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    </div>
    <div>
      <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
        Model Not Loaded
      </h3>
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
        {error || 'The trained model was not found. Please train the model first.'}
      </p>
      <div className="bg-slate-900 rounded-lg px-4 py-3 font-mono text-xs text-green-400 space-y-1">
        <p># Step 1: Install dependencies</p>
        <p>pip install -r requirements.txt</p>
        <p className="mt-1"># Step 2: Download Kaggle dataset into backend/dataset/</p>
        <p className="mt-1"># Step 3: Train the model</p>
        <p>python train_model.py</p>
        <p className="mt-1"># Step 4: Start the backend</p>
        <p>python app.py</p>
      </div>
    </div>
  </div>
);

interface AlertBannerProps {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message }) => {
  const styles = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 text-sm ${styles[type]}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    {label && <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>}
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16">
    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">{icon}</div>
    <h3 className="font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
    {subtitle && <p className="text-sm text-slate-400 text-center max-w-xs">{subtitle}</p>}
  </div>
);
