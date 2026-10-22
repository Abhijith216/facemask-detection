"""
Face detection utilities using OpenCV.

Supports three modes:
  - 'yunet'       : multi-scale YuNet with overlapping crops for uploaded images
  - 'haarcascade' : Haar Cascade (ships with OpenCV, no extra download)
  - 'dnn'         : OpenCV DNN (more accurate; requires model files)
"""

import os
import threading
import cv2
import numpy as np
from config import FACE_DETECTOR, BASE_DIR, YUNET_MODEL_PATH, FACE_DETECTION_CONFIDENCE

_yunet_detector = None
_yunet_lock = threading.Lock()


def _yunet_candidates(image_bgr: np.ndarray, input_side: int) -> list[dict]:
    """Run one aspect-preserving pass; return unexpanded boxes in source pixels."""
    global _yunet_detector
    height, width = image_bgr.shape[:2]
    # Tiny letterboxed inputs can activate network biases even on flat colour.
    # A uniform region has no visual face detail to detect.
    _, deviation = cv2.meanStdDev(image_bgr)
    if float(deviation.max()) < 1.0:
        return []
    scale = input_side / max(height, width)
    resized_width = max(1, round(width * scale))
    resized_height = max(1, round(height * scale))
    resized = cv2.resize(image_bgr, (resized_width, resized_height))
    # Pad instead of stretching panoramic/portrait images. YuNet strides are 32.
    padded = cv2.copyMakeBorder(
        resized, 0, (-resized_height) % 32, 0, (-resized_width) % 32,
        cv2.BORDER_CONSTANT, value=(0, 0, 0),
    )
    with _yunet_lock:
        if _yunet_detector is None:
            if not os.path.isfile(YUNET_MODEL_PATH):
                raise RuntimeError("YuNet face detector is missing from backend/models. See backend/TRAINING.md.")
            _yunet_detector = cv2.FaceDetectorYN.create(
                YUNET_MODEL_PATH, "", (320, 320), FACE_DETECTION_CONFIDENCE, 0.3, 5000,
            )
        _yunet_detector.setInputSize((padded.shape[1], padded.shape[0]))
        _, faces = _yunet_detector.detect(padded)
    if faces is None:
        return []
    candidates = []
    sx, sy = width / resized_width, height / resized_height
    for face in faces:
        x, y, w, h = map(float, face[:4])
        score = float(face[-1])
        if not np.isfinite(face).all() or score < FACE_DETECTION_CONFIDENCE:
            continue
        if not (0 <= x + w / 2 < resized_width and 0 <= y + h / 2 < resized_height):
            continue
        candidates.append({"x": x * sx, "y": y * sy, "w": w * sx, "h": h * sy, "score": score})
    return candidates


def _tile_starts(length: int, size: int) -> list[int]:
    """Cover the last edge as well as the regular 25%-overlap windows."""
    if length <= size:
        return [0]
    return sorted(set(range(0, length - size, max(1, size * 3 // 4))) | {length - size})


def _merge_candidates(candidates: list[dict]) -> list[dict]:
    """Suppress repeats across scales/crops, including nested partial-face boxes."""
    kept = []
    for candidate in sorted(candidates, key=lambda box: box["score"], reverse=True):
        x, y, w, h = (candidate[key] for key in ("x", "y", "w", "h"))
        area = w * h
        if w <= 0 or h <= 0:
            continue
        duplicate = False
        for other in kept:
            ox, oy, ow, oh = (other[key] for key in ("x", "y", "w", "h"))
            intersection = max(0, min(x + w, ox + ow) - max(x, ox)) * max(0, min(y + h, oy + oh) - max(y, oy))
            union = area + ow * oh - intersection
            overlap = intersection / min(area, ow * oh)
            if (intersection / union > 0.35 or overlap > 0.7
                    or (overlap > 0.5 and other["score"] - candidate["score"] > 0.15)):
                duplicate = True
                break
        if not duplicate:
            kept.append(candidate)
    return kept


def _detect_yunet(image_bgr: np.ndarray, high_accuracy: bool = True) -> list[dict]:
    """Find large and small faces without forcing a crowd into a 300px square.

    Uploads use three whole-image scales plus at most 25 overlapping crops.
    Webcam frames use two whole-image scales to bound per-frame latency.
    All boxes are merged before margins are added and mapped to original pixels.
    """
    height, width = image_bgr.shape[:2]
    working_scale = min(1.0, 2560 / max(height, width))
    working = image_bgr if working_scale == 1 else cv2.resize(
        image_bgr, (round(width * working_scale), round(height * working_scale)),
    )
    wh, ww = working.shape[:2]
    candidates = []
    for side in ((320, 640, 1280) if high_accuracy else (320, 640)):
        candidates.extend(_yunet_candidates(working, side))
    if high_accuracy:
        tile_size = max(128, int(np.ceil(max(wh, ww) / 4)))
        for top in _tile_starts(wh, tile_size):
            for left in _tile_starts(ww, tile_size):
                tile = working[top:min(wh, top + tile_size), left:min(ww, left + tile_size)]
                th, tw = tile.shape[:2]
                for box in _yunet_candidates(tile, 512):
                    x, y, w, h = (box[key] for key in ("x", "y", "w", "h"))
                    # A face clipped by an internal tile edge is handled by a
                    # neighbouring tile/full pass, rather than counted twice.
                    if ((left > 0 and x < 2) or (top > 0 and y < 2)
                            or (left + tw < ww and x + w > tw - 2)
                            or (top + th < wh and y + h > th - 2)):
                        continue
                    candidates.append({**box, "x": x + left, "y": y + top})
    clipped = []
    for box in candidates:
        x1, y1 = max(0, box["x"]), max(0, box["y"])
        x2, y2 = min(ww, box["x"] + box["w"]), min(wh, box["y"] + box["h"])
        if min(x2 - x1, y2 - y1) < 6:
            continue
        clipped.append({**box, "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1})
    results = []
    sx, sy = width / ww, height / wh
    for box in _merge_candidates(clipped):
        x, y, w, h = (box[key] for key in ("x", "y", "w", "h"))
        margin = 0.1 * min(w, h)
        x1, y1 = max(0, int((x - margin) * sx)), max(0, int((y - margin) * sy))
        x2, y2 = min(width, int(np.ceil((x + w + margin) * sx))), min(height, int(np.ceil((y + h + margin) * sy)))
        results.append({"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                        "face_roi": image_bgr[y1:y2, x1:x2]})
    return sorted(results, key=lambda box: (box["y"], box["x"]))

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

def detect_faces(image_bgr: np.ndarray, high_accuracy: bool = True) -> list[dict]:
    """
    Detect faces in a BGR image.

    Returns a list of dicts, each with keys:
        x, y, w, h  (bounding box in pixel coordinates)
        face_roi    (cropped face as a BGR numpy array)
    """
    if image_bgr is None or image_bgr.ndim != 3 or image_bgr.shape[2] != 3 or min(image_bgr.shape[:2]) == 0:
        raise ValueError("Expected a non-empty BGR image.")
    if FACE_DETECTOR == "yunet":
        return _detect_yunet(image_bgr, high_accuracy)
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

    label_names = {"with_mask": "Mask", "without_mask": "No mask",
                   "mask_weared_incorrect": "Incorrect", "uncertain": "Uncertain"}
    for number, det in enumerate(detections, 1):
        x, y, w, h = det["x"], det["y"], det["w"], det["h"]
        label = det.get("label", "unknown")
        conf = det.get("confidence", 0.0)
        color = COLOR_MAP.get(label, DEFAULT_COLOR)

        cv2.rectangle(img, (x, y), (x + w - 1, y + h - 1), color, 1 if w < 80 else 2)

        # Tiny faces get numbered badges instead of long labels hiding neighbours.
        # Numbers match the per-face results displayed by the frontend.
        text = str(number) if w < 90 else f"{number} {label_names.get(label, label)} {conf:.0%}"
        font_scale = 0.35 if w < 90 else 0.5
        (tw, th), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
        tx = max(0, min(x, img.shape[1] - tw - 4))
        ty = max(th + 2, y - 3)
        cv2.rectangle(img, (tx, ty - th - 2), (tx + tw + 3, ty + baseline), color, -1)
        cv2.putText(
            img, text,
            (tx + 1, ty),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return img
