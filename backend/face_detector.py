"""
Face detection utilities using OpenCV.

Supports two modes:
  - 'haarcascade' : Haar Cascade (ships with OpenCV, no extra download)
  - 'dnn'         : OpenCV DNN (more accurate; requires model files)
"""

import os
import threading
import cv2
import numpy as np
from config import FACE_DETECTOR, BASE_DIR

_dnn_net = None
_dnn_lock = threading.Lock()


def _detect_dnn(image_bgr: np.ndarray) -> list[dict]:
    """Locate faces with OpenCV's ResNet-10 SSD before mask classification."""
    global _dnn_net
    height, width = image_bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(
        image_bgr, 1.0, (300, 300), (104.0, 177.0, 123.0),
        swapRB=False, crop=False,
    )
    # Flask can process concurrent frames; setInput/forward must stay paired.
    with _dnn_lock:
        if _dnn_net is None:
            model_dir = os.path.join(BASE_DIR, "models")
            proto = os.path.join(model_dir, "deploy.prototxt")
            weights = os.path.join(model_dir, "res10_300x300_ssd_iter_140000.caffemodel")
            if not os.path.isfile(proto) or not os.path.isfile(weights):
                raise RuntimeError("DNN face detector files are missing from backend/models. See backend/TRAINING.md.")
            _dnn_net = cv2.dnn.readNetFromCaffe(proto, weights)
        _dnn_net.setInput(blob)
        detections = _dnn_net.forward()

    boxes, scores = [], []
    for detection in detections[0, 0]:
        score = float(detection[2])
        if score < 0.5:
            continue
        x1, y1, x2, y2 = (detection[3:7] * [width, height, width, height]).astype(int)
        x1, y1 = max(0, int(x1)), max(0, int(y1))
        x2, y2 = min(width, int(x2)), min(height, int(y2))
        if x2 - x1 < 20 or y2 - y1 < 20:
            continue
        boxes.append([x1, y1, x2 - x1, y2 - y1])
        scores.append(score)

    results = []
    indices = cv2.dnn.NMSBoxes(boxes, scores, 0.5, 0.3)
    for index in np.asarray(indices).reshape(-1):
        x, y, w, h = boxes[int(index)]
        margin = int(0.1 * min(w, h))
        x1, y1 = max(0, x - margin), max(0, y - margin)
        x2, y2 = min(width, x + w + margin), min(height, y + h + margin)
        results.append({"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                        "face_roi": image_bgr[y1:y2, x1:x2]})
    return results


# ─── Haar Cascade (default) ────────────────────────────────────────────────
_haar_cascade = None

def _get_haar_cascade():
    global _haar_cascade
    if _haar_cascade is None:
        xml = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _haar_cascade = cv2.CascadeClassifier(xml)
    return _haar_cascade


# ─── Public API ────────────────────────────────────────────────────────────

def detect_faces(image_bgr: np.ndarray) -> list[dict]:
    """
    Detect faces in a BGR image.

    Returns a list of dicts, each with keys:
        x, y, w, h  (bounding box in pixel coordinates)
        face_roi    (cropped face as a BGR numpy array)
    """
    if FACE_DETECTOR == "haarcascade":
        return _detect_haar(image_bgr)
    if FACE_DETECTOR == "dnn":
        return _detect_dnn(image_bgr)
    raise ValueError(f"Unsupported face detector: {FACE_DETECTOR}")


def _detect_haar(image_bgr: np.ndarray) -> list[dict]:
    cascade = _get_haar_cascade()
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    detections = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )

    results = []
    if len(detections) == 0:
        return results

    for (x, y, w, h) in detections:
        # Add a small margin
        margin = int(0.1 * min(w, h))
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(image_bgr.shape[1], x + w + margin)
        y2 = min(image_bgr.shape[0], y + h + margin)
        roi = image_bgr[y1:y2, x1:x2]
        results.append({"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1, "face_roi": roi})

    return results


def draw_results(
    image_bgr: np.ndarray,
    detections: list[dict],
) -> np.ndarray:
    """
    Draw bounding boxes and labels on image_bgr (in-place copy).

    Each detection dict should contain:
        x, y, w, h, label, confidence
    """
    img = image_bgr.copy()

    COLOR_MAP = {
        "with_mask": (0, 200, 0),          # green
        "without_mask": (0, 0, 220),       # red (BGR)
        "mask_weared_incorrect": (0, 200, 255),  # yellow-ish
        "uncertain": (128, 128, 128),
    }
    DEFAULT_COLOR = (200, 200, 200)

    for det in detections:
        x, y, w, h = det["x"], det["y"], det["w"], det["h"]
        label = det.get("label", "unknown")
        conf = det.get("confidence", 0.0)
        color = COLOR_MAP.get(label, DEFAULT_COLOR)

        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        text = f"{label}: {conf:.1%}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(img, (x, y - th - 8), (x + tw + 4, y), color, -1)
        cv2.putText(
            img, text,
            (x + 2, y - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return img
