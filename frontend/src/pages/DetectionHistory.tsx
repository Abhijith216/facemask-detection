import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Search, Trash2, Download, ChevronLeft, ChevronRight, Camera, ImageIcon } from 'lucide-react';
import { LoadingSpinner, EmptyState, AlertBanner } from '../components/ui';
import apiService from '../services/api';
import type { PaginatedHistory } from '../types';

const LABEL_COLORS: Record<string, string> = {
  with_mask: '#22c55e',
  without_mask: '#ef4444',
  mask_weared_incorrect: '#f59e0b',
};

const PER_PAGE = 20;

export const DetectionHistory: React.FC = () => {
  const [data, setData] = useState<PaginatedHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'image' | 'webcam'>('all');
  const [search, setSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const src = sourceFilter === 'all' ? undefined : sourceFilter;
      const d = await apiService.getHistory(page, PER_PAGE, src);
      setData(d);
      setError(null);
    } catch {
      setError('Could not load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  const clearHistory = async () => {
    setClearing(true);
    try {
      await apiService.clearHistory();
      setShowConfirm(false);
      setPage(1);
      load();
    } catch {
      setError('Failed to clear history.');
    } finally {
      setClearing(false);
    }
  };

  const exportCsv = () => {
    if (!data?.records.length) return;
    const rows = [
      ['ID', 'Timestamp', 'Source', 'Faces', 'Mask', 'No Mask', 'Incorrect', 'Avg Confidence'],
      ...data.records.map(r => [
        r.id, r.timestamp, r.source, r.face_count,
        r.with_mask, r.without_mask, r.incorrect_mask,
        r.avg_confidence != null ? (r.avg_confidence * 100).toFixed(1) + '%' : 'N/A',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detection_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Client-side search filter
  const filtered = data?.records.filter(r => {
    if (!search) return true;
    return (
      r.source.includes(search.toLowerCase()) ||
      r.timestamp.includes(search)
    );
  }) ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Detection History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            All past detection sessions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            id="export-csv-btn"
            onClick={exportCsv}
            disabled={!data?.records.length}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            id="clear-history-btn"
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="history-search"
            type="text"
            placeholder="Search by source or date…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          id="source-filter"
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value as typeof sourceFilter); setPage(1); }}
          className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Sources</option>
          <option value="image">Image Upload</option>
          <option value="webcam">Webcam</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner label="Loading history…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No history found"
          subtitle="Detection history will appear here after you analyse images or use live detection."
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Source</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Faces</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mask</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">No Mask</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Incorrect</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg Conf.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-700/20'
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(r.timestamp + 'Z').toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        r.source === 'webcam'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      }`}>
                        {r.source === 'webcam' ? <Camera className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">{r.face_count}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: LABEL_COLORS.with_mask }}>{r.with_mask}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: LABEL_COLORS.without_mask }}>{r.without_mask}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: LABEL_COLORS.mask_weared_incorrect }}>{r.incorrect_mask}</td>
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 font-mono">
                      {r.avg_confidence != null ? `${(r.avg_confidence * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {data.page} of {data.pages} · {data.total} total records
              </p>
              <div className="flex gap-2">
                <button
                  id="prev-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  id="next-page-btn"
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Clear All History?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will permanently delete all detection history records. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-clear-btn"
                onClick={clearHistory}
                disabled={clearing}
                className="flex-1 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {clearing ? 'Clearing…' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
