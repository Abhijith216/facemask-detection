"""
Inference pipeline for face mask detection.
Loads the trained MobileNetV2 model and performs predictions.
"""

import os
import json
import logging
import threading
import numpy as np
import cv2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model

from config import MODEL_PATH, CLASS_NAMES, IMG_SIZE, METRICS_PATH, MIN_CLASSIFICATION_CONFIDENCE, MIN_CLASSIFICATION_FACE_SIZE
from face_detector import detect_faces, draw_results

logger = logging.getLogger(__name__)

# ─── Singleton model loader ────────────────────────────────────────────────

_model = None
_model_loaded = False
_model_error: str | None = None
_prediction_lock = threading.Lock()


def load_mask_model():
    global _model, _model_loaded, _model_error
    if _model_loaded:
        return _model
    if not os.path.exists(MODEL_PATH):
        _model_error = (
            f"Trained model not found at '{MODEL_PATH}'. "
            "Please run 'python train_model.py' to train the model first."
        )
        logger.warning(_model_error)
        _model_loaded = True  # mark attempted
        return None
    try:
        _model = load_model(MODEL_PATH)
        _model_loaded = True
        _model_error = None
        logger.info("Model loaded successfully from %s", MODEL_PATH)
    except Exception as exc:
        _model_error = f"Failed to load model: {exc}"
        logger.error(_model_error)
        _model_loaded = True
        _model = None
    return _model


def get_model_status() -> dict:
    """Return model readiness status."""
    model = load_mask_model()
    return {
        "loaded": model is not None,
        "path": MODEL_PATH,
        "error": _model_error,
        "classes": CLASS_NAMES,
    }


# ─── Preprocessing ─────────────────────────────────────────────────────────

def _preprocess_face(face_bgr: np.ndarray) -> np.ndarray:
    """Resize and apply MobileNetV2 preprocessing to a face crop."""
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, IMG_SIZE)
    arr = np.array(face_resized, dtype=np.float32)
    arr = preprocess_input(arr)  # scales to [-1, 1]
    return np.expand_dims(arr, axis=0)


# ─── Core inference ────────────────────────────────────────────────────────

def predict_faces(face_crops: list[np.ndarray]) -> list[dict]:
    """Classify faces in batches, avoiding one TensorFlow call per crowd member."""
    if not face_crops:
        return []
    model = load_mask_model()
    if model is None:
        raise RuntimeError(_model_error or "Model not available")
    results = []
    for start in range(0, len(face_crops), 32):
        inputs = np.concatenate([_preprocess_face(face) for face in face_crops[start:start + 32]])
        with _prediction_lock:
            predictions = model.predict(inputs, verbose=0)
        for probs in predictions:
            idx = int(np.argmax(probs))
            results.append({"label": CLASS_NAMES[idx], "confidence": float(probs[idx]),
                            "probabilities": {name: float(probs[i]) for i, name in enumerate(CLASS_NAMES)}})
    return results


def predict_face(face_bgr: np.ndarray) -> dict:
    """Run classifier on one BGR crop; kept for callers using the single-face API."""
    return predict_faces([face_bgr])[0]


def run_inference_on_image(image_bgr: np.ndarray, confidence_threshold: float = MIN_CLASSIFICATION_CONFIDENCE,
                           high_accuracy: bool = True) -> dict:
    """
    Full pipeline: detect faces → classify → annotate image.

    Returns:
        detections      : list of per-face result dicts
        annotated_image : BGR image with bounding boxes drawn
        face_count      : total faces found
        summary         : counts per class
    """
    threshold = float(confidence_threshold)
    if not np.isfinite(threshold) or not 0 <= threshold <= 1:
        raise ValueError("Confidence threshold must be between 0 and 1.")
    threshold = max(threshold, MIN_CLASSIFICATION_CONFIDENCE)
    faces = detect_faces(image_bgr, high_accuracy=high_accuracy)
    predictions = predict_faces([face["face_roi"] for face in faces])

    detections = []
    for face_info, pred in zip(faces, predictions):
        reliable = (pred["confidence"] >= threshold
                    and min(face_info["w"], face_info["h"]) >= MIN_CLASSIFICATION_FACE_SIZE)
        det = {
            "x": face_info["x"],
            "y": face_info["y"],
            "w": face_info["w"],
            "h": face_info["h"],
            "label": pred["label"] if reliable else "uncertain",
            "confidence": pred["confidence"],
            "probabilities": pred["probabilities"],
        }
        detections.append(det)

    annotated = draw_results(image_bgr, detections)

    summary = {cls: 0 for cls in CLASS_NAMES}
    summary["uncertain"] = 0
    for d in detections:
        if d["label"] in summary:
            summary[d["label"]] += 1

    return {
        "detections": detections,
        "annotated_image": annotated,
        "face_count": len(detections),
        "summary": summary,
    }


def load_metrics() -> dict | None:
    """Load evaluation metrics produced by train_model.py, or None."""
    if not os.path.exists(METRICS_PATH):
        return None
    try:
        with open(METRICS_PATH, "r") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("Could not load metrics: %s", exc)
        return None
