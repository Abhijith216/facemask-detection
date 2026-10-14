import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { BarChart3, AlertCircle } from 'lucide-react';
import { LoadingSpinner, EmptyState } from '../components/ui';
import apiService from '../services/api';
import type { MetricsResponse, ModelMetrics } from '../types';

const fmt = (n: number) => `${(n * 100).toFixed(1)}%`;

export const ModelPerformance: React.FC = () => {
  const [resp, setResp] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getMetrics()
      .then(setResp)
      .catch(() => setResp({ available: false, message: 'Could not reach backend.' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading model metrics…" />;

  if (!resp?.available || !resp.metrics) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Model Performance</h2>
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="Metrics Not Available Yet"
          subtitle={resp?.message || 'Train the model first using train_model.py to see evaluation metrics.'}
        />
        <div className="bg-slate-900 rounded-2xl p-5 text-xs font-mono text-green-400 space-y-1 max-w-lg">
          <p># Install dependencies</p>
          <p>pip install -r requirements.txt</p>
          <p className="mt-2"># Download the Kaggle dataset into backend/dataset/</p>
          <p className="mt-2"># Train the model</p>
          <p>python train_model.py</p>
        </div>
        <ConceptsSection />
      </div>
    );
  }

  const m: ModelMetrics = resp.metrics;
  const classNames = m.class_names;

  // Training history chart data
  const historyData = m.training_history.accuracy.map((acc, i) => ({
    epoch: i + 1,
    train_acc: acc,
    val_acc: m.training_history.val_accuracy[i],
    train_loss: m.training_history.loss[i],
    val_loss: m.training_history.val_loss[i],
  }));

  // Per-class chart data
  const perClassData = Object.entries(m.per_class).map(([cls, v]) => ({
    class: cls.replace('_', ' '),
    precision: +(v.precision * 100).toFixed(1),
    recall: +(v.recall * 100).toFixed(1),
    f1: +(v.f1_score * 100).toFixed(1),
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Model Performance</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Evaluation metrics from the trained MobileNetV2 model
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Test Accuracy', value: fmt(m.test_accuracy), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Precision',     value: fmt(m.precision),     color: 'text-green-600 dark:text-green-400' },
          { label: 'Recall',        value: fmt(m.recall),        color: 'text-teal-600 dark:text-teal-400' },
          { label: 'F1 Score',      value: fmt(m.f1_score),      color: 'text-purple-600 dark:text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Dataset split */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500" />
          Dataset Split
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            { label: 'Total', value: m.dataset.total, color: '#3b82f6' },
            { label: 'Train', value: m.dataset.train, color: '#22c55e' },
            { label: 'Validation', value: m.dataset.val, color: '#f59e0b' },
            { label: 'Test', value: m.dataset.test, color: '#a855f7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-slate-500 dark:text-slate-400">{label}:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training history — Accuracy */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Training / Validation Accuracy
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => fmt(v as number)} />
              <Legend />
              <Line type="monotone" dataKey="train_acc" name="Train Acc" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="val_acc" name="Val Acc" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Training history — Loss */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Training / Validation Loss
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="val_loss" name="Val Loss" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-class performance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Per-Class Performance
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={perClassData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="class" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: unknown) => `${v}%`} />
            <Legend />
            <Bar dataKey="precision" name="Precision" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recall" name="Recall" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="f1" name="F1 Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Confusion matrix */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Confusion Matrix</h3>
        <div className="overflow-x-auto">
          <table className="text-sm mx-auto">
            <thead>
              <tr>
                <th className="p-2 text-xs text-slate-400">Actual ↓ / Predicted →</th>
                {classNames.map(c => (
                  <th key={c} className="p-2 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {c.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.confusion_matrix.map((row, i) => {
                const rowSum = row.reduce((a, b) => a + b, 0);
                return (
                  <tr key={i}>
                    <td className="p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 pr-4">
                      {classNames[i]?.replace('_', ' ')}
                    </td>
                    {row.map((val, j) => {
                      const intensity = rowSum > 0 ? val / rowSum : 0;
                      return (
                        <td
                          key={j}
                          className="p-3 text-center font-mono font-bold rounded-lg m-0.5"
                          style={{
                            background: i === j
                              ? `rgba(34,197,94,${0.1 + intensity * 0.7})`
                              : `rgba(239,68,68,${intensity * 0.5})`,
                            color: i === j ? '#15803d' : val > 0 ? '#b91c1c' : '#94a3b8',
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConceptsSection />
    </div>
  );
};

const ConceptsSection: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[
      {
        title: 'CNN',
        body: 'Convolutional Neural Networks use learnable filters to extract spatial features from images, enabling hierarchical pattern recognition.',
      },
      {
        title: 'Transfer Learning',
        body: 'Reusing weights pretrained on ImageNet allows the model to benefit from large-scale visual knowledge without training from scratch.',
      },
      {
        title: 'MobileNetV2',
        body: 'A lightweight architecture using depthwise separable convolutions and inverted residuals, optimised for mobile and embedded inference.',
      },
      {
        title: 'Face Detection vs. Classification',
        body: 'Detection (OpenCV Haar Cascade) locates faces in an image; classification (MobileNetV2) then labels each located face.',
      },
    ].map(({ title, body }) => (
      <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
      </div>
    ))}
  </div>
);
