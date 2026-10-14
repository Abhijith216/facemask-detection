import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { ModelNotReadyBanner, AlertBanner } from '../components/ui';
import apiService from '../services/api';
import type { DetectionResult, FaceDetection } from '../types';
import { useBackendHealth } from '../hooks/useBackendHealth';

interface LiveDetectionProps {
  confidenceThreshold: number;
  detectionInterval: number;
  saveHistory: boolean;
}

const LABEL_COLORS: Record<string, string> = {
  with_mask: '#22c55e',
  without_mask: '#ef4444',
  mask_weared_incorrect: '#f59e0b',
  uncertain: '#94a3b8',
};

const LABEL_DISPLAY: Record<string, string> = {
  with_mask: 'Mask ✓',
  without_mask: 'No Mask ✗',
  mask_weared_incorrect: 'Incorrect Mask',
  uncertain: 'Uncertain',
};

export const LiveDetection: React.FC<LiveDetectionProps> = ({
  confidenceThreshold,
  detectionInterval,
  saveHistory,
}) => {
  const { health, connected } = useBackendHealth(5000);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDetectingRef = useRef(false);
  const cameraRequestRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });

  const modelReady = health?.model?.loaded === true;

  // ── Camera management ────────────────────────────────
  const startCamera = async (deviceId?: string) => {
    const requestId = ++cameraRequestRef.current;
    setCameraError(null);
    setCameraStarting(true);
    stopDetection();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setLastResult(null);
    clearOverlay();
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access requires localhost or HTTPS and a supported browser.');
      }
      const videoConstraints = { width: { ideal: 640 }, height: { ideal: 480 } };
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { ...videoConstraints, ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }) },
      });
      // Device labels become available after camera permission is granted.
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
      const preferred = devices.find(device => /hp.*wide\s*vision/i.test(device.label));
      if (!deviceId && preferred && stream.getVideoTracks()[0]?.getSettings().deviceId !== preferred.deviceId) {
        stream.getTracks().forEach(track => track.stop());
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { ...videoConstraints, deviceId: { exact: preferred.deviceId } },
        });
      }
      if (cameraRequestRef.current !== requestId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      setCameras(devices);
      setSelectedCamera(stream.getVideoTracks()[0]?.getSettings().deviceId || '');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (cameraRequestRef.current !== requestId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      setCameraActive(true);
    } catch (err: unknown) {
      stream?.getTracks().forEach(track => track.stop());
      if (cameraRequestRef.current !== requestId) return;
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : err instanceof DOMException && err.name === 'NotReadableError'
          ? 'Camera is unavailable. Close other apps using it and check its privacy shutter.'
          : err instanceof Error ? err.message : 'Failed to start camera.';
      setCameraError(msg);
    } finally {
      if (cameraRequestRef.current === requestId) setCameraStarting(false);
    }
  };

  const stopCamera = useCallback(() => {
    cameraRequestRef.current++;
    setCameraStarting(false);
    stopDetection();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setLastResult(null);
    clearOverlay();
  }, []);

  // ── Overlay drawing ──────────────────────────────────
  const clearOverlay = () => {
    const c = overlayCanvasRef.current;
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  };

  const drawOverlay = (detections: FaceDetection[], imgW: number, imgH: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imgW;
    canvas.height = imgH;
    ctx.clearRect(0, 0, imgW, imgH);

    for (const det of detections) {
      const color = LABEL_COLORS[det.label] || '#94a3b8';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(det.x, det.y, det.w, det.h);

      const label = `${LABEL_DISPLAY[det.label] || det.label} ${(det.confidence * 100).toFixed(1)}%`;
      ctx.font = '13px Inter, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(det.x, det.y - 22, tw + 8, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, det.x + 4, det.y - 6);
    }
  };

  // ── Detection loop ───────────────────────────────────
  const captureAndSend = useCallback(async () => {
    if (isDetectingRef.current) return; // skip if previous still running
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    isDetectingRef.current = true;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const frame = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const result = await apiService.detectFrame(frame, confidenceThreshold, saveHistory);
      setLastResult(result);
      setApiError(null);
      drawOverlay(result.detections, video.videoWidth, video.videoHeight);

      // FPS
      fpsCounterRef.current.count++;
      const now = Date.now();
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.count);
        fpsCounterRef.current = { count: 0, lastTime: now };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Detection failed';
      setApiError(msg);
    } finally {
      isDetectingRef.current = false;
    }
  }, [confidenceThreshold, saveHistory]);

  const startDetection = useCallback(() => {
    if (!cameraActive || detecting) return;
    setDetecting(true);
    intervalRef.current = setInterval(captureAndSend, detectionInterval);
  }, [cameraActive, detecting, captureAndSend, detectionInterval]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setDetecting(false);
    setFps(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Live Detection</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time face mask detection via webcam
        </p>
      </div>

      {!connected && (
        <AlertBanner type="error" message="Backend is not connected. Start the Python backend first." />
      )}
      {connected && !modelReady && (
        <ModelNotReadyBanner error={health?.model?.error} />
      )}
      {cameraError && <AlertBanner type="error" message={cameraError} />}
      {apiError && <AlertBanner type="warning" message={`Detection error: ${apiError}`} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Video feed */}
        <div className="xl:col-span-2">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Video container */}
            <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
              {/* HUD corner brackets */}
              <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none z-10"></div>
              <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none z-10"></div>
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none z-10"></div>
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none z-10"></div>

              {/* Laser scanning beam */}
              {detecting && <div className="animate-laser-scan pointer-events-none z-20" />}

              {!cameraActive && (
                <div className="flex flex-col items-center gap-3 text-slate-500 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <CameraOff className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-mono text-slate-400">CAMERA STANDBY // CLICK START BELOW</p>
                </div>
              )}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${!cameraActive ? 'hidden' : ''}`}
                muted
                playsInline
              />
              {/* Overlay canvas */}
              <canvas
                ref={overlayCanvasRef}
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${!cameraActive ? 'hidden' : ''}`}
              />
              {/* Hidden capture canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Status overlay */}
              {cameraActive && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pl-4">
                  {detecting ? (
                    <span className="flex items-center gap-1.5 bg-rose-600/90 text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-full shadow-lg shadow-rose-900/50">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      SCANNING
                    </span>
                  ) : (
                    <span className="bg-slate-800/80 text-slate-300 text-[11px] font-mono px-2.5 py-1 rounded-full border border-slate-700">
                      PAUSED
                    </span>
                  )}
                  <span className="bg-slate-950/80 text-cyan-400 text-[11px] font-mono px-2.5 py-1 rounded-full border border-slate-800">
                    {fps} FPS · 640x480
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  Camera
                  <select
                    aria-label="Camera"
                    value={selectedCamera}
                    disabled={cameraStarting || cameras.length === 0}
                    onChange={event => {
                      const deviceId = event.target.value;
                      setSelectedCamera(deviceId);
                      if (cameraActive) void startCamera(deviceId);
                    }}
                    className="max-w-64 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 disabled:opacity-50"
                  >
                    {cameras.length === 0 && <option value="">HP Wide Vision (preferred)</option>}
                    {cameras.map((camera, index) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                {!cameraActive ? (
                  <button
                    id="start-camera-btn"
                    onClick={() => void startCamera(selectedCamera || undefined)}
                    disabled={!connected || !modelReady || cameraStarting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    {cameraStarting ? 'Connecting camera…' : 'Activate Camera'}
                  </button>
                ) : (
                  <>
                    <button
                      id="stop-camera-btn"
                      onClick={stopCamera}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
                    >
                      <CameraOff className="w-4 h-4" />
                      Stop Feed
                    </button>
                    {!detecting ? (
                      <button
                        id="start-detection-btn"
                        onClick={startDetection}
                        disabled={!modelReady}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-colors"
                      >
                        <Zap className="w-4 h-4" />
                        Run AI Detection
                      </button>
                    ) : (
                      <button
                        id="stop-detection-btn"
                        onClick={stopDetection}
                        className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-colors"
                      >
                        <ZapOff className="w-4 h-4" />
                        Pause Detection
                      </button>
                    )}
                    <button
                      id="capture-frame-btn"
                      onClick={captureAndSend}
                      disabled={!modelReady}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-sm font-medium rounded-xl transition-colors"
                    >
                      Capture Snapshot
                    </button>
                  </>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Engine: MobileNetV2
              </span>
            </div>
          </div>
        </div>

        {/* Detection info panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              Detection Status
            </h3>
            <div className="space-y-3">
              <InfoRow label="Status" value={detecting ? '🟢 Active' : cameraActive ? '🟡 Ready' : '⚫ Offline'} />
              <InfoRow label="Faces Found" value={String(lastResult?.face_count ?? 0)} />
              <InfoRow label="Mask Detected" value={String(lastResult?.summary?.with_mask ?? 0)} />
              <InfoRow label="No Mask" value={String(lastResult?.summary?.without_mask ?? 0)} />
              <InfoRow label="Incorrect" value={String(lastResult?.summary?.mask_weared_incorrect ?? 0)} />
              <InfoRow label="Uncertain" value={String(lastResult?.summary?.uncertain ?? 0)} />
            </div>
          </div>

          {/* Per-face results */}
          {lastResult && lastResult.detections.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Detected Faces</h3>
              <div className="space-y-2">
                {lastResult.detections.map((det, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: LABEL_COLORS[det.label] }}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {LABEL_DISPLAY[det.label] || det.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {(det.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(LABEL_DISPLAY).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-0.5 flex-shrink-0" style={{ background: LABEL_COLORS[key] }} />
                  <span className="text-slate-600 dark:text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{value}</span>
  </div>
);
