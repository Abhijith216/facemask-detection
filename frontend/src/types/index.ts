// Shared TypeScript types for the Face Mask Detection System

export type MaskLabel = 'with_mask' | 'without_mask' | 'mask_weared_incorrect' | 'uncertain';

export interface FaceDetection {
  x: number;
  y: number;
  w: number;
  h: number;
  label: MaskLabel;
  confidence: number;
  probabilities: Partial<Record<MaskLabel, number>>;
}

export interface DetectionResult {
  face_count: number;
  detections: FaceDetection[];
  summary: Record<MaskLabel, number>;
  annotated_image: string | null;
  message?: string;
}

export interface HistoryRecord {
  id: number;
  timestamp: string;
  source: 'image' | 'webcam';
  face_count: number;
  with_mask: number;
  without_mask: number;
  incorrect_mask: number;
  avg_confidence: number | null;
  detections: FaceDetection[];
}

export interface PaginatedHistory {
  records: HistoryRecord[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DailyActivity {
  day: string;
  faces: number;
  with_mask: number;
  without_mask: number;
}

export interface Statistics {
  total_sessions: number;
  total_faces: number;
  total_with_mask: number;
  total_without_mask: number;
  total_incorrect: number;
  avg_confidence: number;
  daily_activity: DailyActivity[];
}

export interface PerClassMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface TrainingHistory {
  accuracy: number[];
  val_accuracy: number[];
  loss: number[];
  val_loss: number[];
}

export interface ModelMetrics {
  test_accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  class_names: string[];
  per_class: Record<string, PerClassMetrics>;
  training_history: TrainingHistory;
  dataset: {
    total: number;
    train: number;
    val: number;
    test: number;
  };
}

export interface MetricsResponse {
  available: boolean;
  message?: string;
  metrics?: ModelMetrics;
}

export interface ModelStatus {
  loaded: boolean;
  path: string;
  error: string | null;
  classes: string[];
}

export interface HealthResponse {
  status: string;
  model: ModelStatus;
}

export interface Settings {
  confidenceThreshold: number;
  detectionInterval: number;
  saveHistory: boolean;
  theme: 'light' | 'dark' | 'system';
  backendUrl: string;
}
