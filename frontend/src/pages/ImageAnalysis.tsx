import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon, X, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { ModelNotReadyBanner, AlertBanner } from '../components/ui';
import apiService from '../services/api';
import type { DetectionResult } from '../types';
import { useBackendHealth } from '../hooks/useBackendHealth';

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const LABEL_COLORS: Record<string, string> = {
  with_mask: '#22c55e',
  without_mask: '#ef4444',
  mask_weared_incorrect: '#f59e0b',
  uncertain: '#94a3b8',
};
const LABEL_DISPLAY: Record<string, string> = {
  with_mask: 'Mask Detected',
  without_mask: 'No Mask',
  mask_weared_incorrect: 'Incorrect Mask',
  uncertain: 'Uncertain — use a clearer close-up',
};

interface ImageAnalysisProps {
  confidenceThreshold: number;
}

export const ImageAnalysis: React.FC<ImageAnalysisProps> = ({ confidenceThreshold }) => {
  const { health, connected } = useBackendHealth(10000);
  const modelReady = health?.model?.loaded === true;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: unknown[]) => {
    setResult(null);
    setError(null);

    if (rejected && (rejected as { errors: unknown[] }[]).length > 0) {
      setError('File rejected. Use JPG or PNG and keep size under 16 MB.');
      return;
    }
    const f = accepted[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Please upload a JPG or PNG image.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError('File too large. Maximum size is 16 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    multiple: false,
    maxSize: MAX_FILE_BYTES,
  });

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiService.detectImage(file, confidenceThreshold);
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const downloadResult = () => {
    if (!result?.annotated_image) return;
    const a = document.createElement('a');
    a.href = result.annotated_image;
    a.download = 'mask_detection_result.jpg';
    a.click();
  };

  const loadSample = async (className: 'with_mask' | 'without_mask') => {
    try {
      setLoading(true);
      const url = `/api/samples/${className}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not load sample image');
      const blob = await res.blob();
      const sampleFile = new File([blob], `sample_${className}.jpg`, { type: 'image/jpeg' });
      setFile(sampleFile);
      setPreview(URL.createObjectURL(sampleFile));
      setResult(null);
    } catch {
      setError('Could not load sample from server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Image Analysis Lab</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            CNN Head Active
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Perform high-resolution deep learning classification and bounding-box localization on uploaded images.
        </p>
      </div>

      {!connected && (
        <AlertBanner type="error" message="Backend is not connected. Start the Python backend first." />
      )}
      {connected && !modelReady && (
        <ModelNotReadyBanner error={health?.model?.error} />
      )}
      {error && <AlertBanner type="error" message={error} />}

      {/* Quick Test Presets */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-xs font-mono font-medium text-slate-300">
            QUICK EVALUATION PRESETS:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSample('with_mask')}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 text-xs font-mono font-semibold transition-all hover:scale-105"
          >
            ⚡ Load Sample: Mask
          </button>
          <button
            onClick={() => loadSample('without_mask')}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-600/40 text-rose-300 text-xs font-mono font-semibold transition-all hover:scale-105"
          >
            ⚡ Load Sample: No Mask
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upload panel */}
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            id="image-dropzone"
            className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                : 'border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/60 hover:bg-slate-900/90'
            }`}
          >
            <input {...getInputProps()} id="file-input" />
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-72 mx-auto rounded-2xl object-contain shadow-2xl border border-slate-700"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-500 transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4 py-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    {isDragActive ? 'Drop image now' : 'Drag & drop an image or click to browse'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">JPG, PNG · Supports up to 16 MB</p>
                </div>
              </div>
            )}
          </div>

          {/* File info */}
          {file && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              id="analyze-btn"
              onClick={analyze}
              disabled={!file || loading || !connected || !modelReady}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Neural Processing…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run AI Detection
                </>
              )}
            </button>
            {file && (
              <button
                id="clear-btn"
                onClick={clearAll}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-2xl transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div>
          {result ? (
            <div className="space-y-4">
              {/* Annotated image */}
              {result.annotated_image ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="bg-slate-900 flex items-center justify-center p-4">
                    <img
                      src={result.annotated_image}
                      alt="Detection result"
                      className="w-full max-h-[36rem] object-contain rounded-lg"
                    />
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {result.face_count} face{result.face_count !== 1 ? 's' : ''} detected
                      </span>
                    </div>
                    <button
                      id="download-result-btn"
                      onClick={downloadResult}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {result.message || 'No faces detected in the image.'}
                  </p>
                </div>
              )}

              {/* Per-face breakdown */}
              {(result.summary.uncertain ?? 0) > 0 && (
                <AlertBanner type="warning" message={`${result.summary.uncertain} face(s) were detected but are too small or below ${Math.round(Math.max(confidenceThreshold, 0.8) * 100)}% confidence to classify reliably. Use a sharper close-up for mask status.`} />
              )}
              {result.detections.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">
                    Detection Results
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">Numbers match the image boxes. Green: mask, red: no mask, grey: uncertain.</p>
                  <div className="space-y-2">
                    {result.detections.map((det, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: LABEL_COLORS[det.label] }}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              Face {i + 1} — {LABEL_DISPLAY[det.label] || det.label}
                            </p>
                            <p className="text-xs text-slate-400">
                              Confidence: {(det.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        {/* Confidence bar */}
                        <div className="w-20">
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${det.confidence * 100}%`,
                                background: LABEL_COLORS[det.label],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'with_mask', label: 'Mask', color: '#22c55e' },
                      { key: 'without_mask', label: 'No Mask', color: '#ef4444' },
                      { key: 'mask_weared_incorrect', label: 'Incorrect', color: '#f59e0b' },
                      { key: 'uncertain', label: 'Uncertain', color: '#94a3b8' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700">
                        <p className="text-xl font-bold" style={{ color }}>
                          {result.summary[key as keyof typeof result.summary] ?? 0}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Results will appear here
              </p>
              <p className="text-xs text-slate-400 text-center max-w-48">
                Upload an image and click Analyse Image to detect masks
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Missing import fix
const Zap: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
