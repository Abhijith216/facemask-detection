import axios from 'axios';
import type {
  DetectionResult,
  HealthResponse,
  MetricsResponse,
  PaginatedHistory,
  Statistics,
} from '../types';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // If running directly on the backend server (merged mode), use same origin
    if (window.location.port === '5000' || !window.location.port) {
      return '';
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
});

export const apiService = {
  // ── Health ─────────────────────────────────────────────
  async getHealth(): Promise<HealthResponse> {
    const res = await api.get<HealthResponse>('/api/health');
    return res.data;
  },

  // ── Image detection ────────────────────────────────────
  async detectImage(file: File, confidenceThreshold: number = 0.5): Promise<DetectionResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('confidence_threshold', String(confidenceThreshold));
    const res = await api.post<DetectionResult>('/api/detect/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // ── Webcam frame detection ─────────────────────────────
  async detectFrame(
    frameBase64: string,
    confidenceThreshold: number = 0.5,
    saveHistory: boolean = true,
  ): Promise<DetectionResult> {
    const res = await api.post<DetectionResult>('/api/detect/frame', {
      frame: frameBase64,
      confidence_threshold: confidenceThreshold,
      save_history: saveHistory,
    });
    return res.data;
  },

  // ── History ────────────────────────────────────────────
  async getHistory(
    page: number = 1,
    perPage: number = 20,
    source?: 'image' | 'webcam',
  ): Promise<PaginatedHistory> {
    const params: Record<string, string | number> = { page, per_page: perPage };
    if (source) params.source = source;
    const res = await api.get<PaginatedHistory>('/api/history', { params });
    return res.data;
  },

  async clearHistory(): Promise<{ deleted: number; message: string }> {
    const res = await api.delete('/api/history');
    return res.data;
  },

  // ── Metrics ────────────────────────────────────────────
  async getMetrics(): Promise<MetricsResponse> {
    const res = await api.get<MetricsResponse>('/api/metrics');
    return res.data;
  },

  // ── Statistics ─────────────────────────────────────────
  async getStatistics(): Promise<Statistics> {
    const res = await api.get<Statistics>('/api/statistics');
    return res.data;
  },
};

export default apiService;
