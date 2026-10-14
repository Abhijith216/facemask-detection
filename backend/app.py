"""
Flask REST API backend for the Face Mask Detection System.
"""

import os
import io
import base64
import logging
import tempfile

import cv2
import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from PIL import Image

from config import MAX_CONTENT_LENGTH, ALLOWED_EXTENSIONS, DEFAULT_CONFIDENCE_THRESHOLD
from database import init_db, insert_detection, fetch_history, fetch_statistics, clear_history, count_history
from inference import run_inference_on_image, get_model_status, load_metrics

# ─── App setup ─────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

# Initialise DB on startup
init_db()


# ─── Helpers ───────────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def image_from_bytes(data: bytes) -> np.ndarray:
    """Convert raw image bytes to a BGR numpy array."""
    pil_img = Image.open(io.BytesIO(data)).convert("RGB")
    arr = np.array(pil_img, dtype=np.uint8)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def image_from_base64(b64_str: str) -> np.ndarray:
    """Decode a base64-encoded image (with or without data-URI prefix)."""
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    raw = base64.b64decode(b64_str)
    return image_from_bytes(raw)


def encode_image_b64(image_bgr: np.ndarray) -> str:
    """Encode a BGR image as a base64 JPEG string."""
    _, buf = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")


def sanitise_detections(detections: list[dict]) -> list[dict]:
    """Remove numpy types for JSON serialisation."""
    safe = []
    for d in detections:
        safe.append({
            "x": int(d["x"]),
            "y": int(d["y"]),
            "w": int(d["w"]),
            "h": int(d["h"]),
            "label": str(d["label"]),
            "confidence": float(d["confidence"]),
            "probabilities": {k: float(v) for k, v in d.get("probabilities", {}).items()},
        })
    return safe


# ─── Routes ────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    model_status = get_model_status()
    return jsonify({
        "status": "ok",
        "model": model_status,
    })


@app.route("/api/detect/image", methods=["POST"])
def detect_image():
    """Detect faces in an uploaded image file."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use JPG, JPEG, or PNG"}), 415

    confidence_threshold = float(request.form.get("confidence_threshold", DEFAULT_CONFIDENCE_THRESHOLD))

    try:
        img_bytes = file.read()
        if len(img_bytes) > MAX_CONTENT_LENGTH:
            return jsonify({"error": "File too large (max 16 MB)"}), 413

        image_bgr = image_from_bytes(img_bytes)
        result = run_inference_on_image(image_bgr, confidence_threshold)

        if result["face_count"] == 0:
            return jsonify({
                "face_count": 0,
                "detections": [],
                "summary": result["summary"],
                "annotated_image": None,
                "message": "No faces detected in the image.",
            }), 200

        annotated_b64 = encode_image_b64(result["annotated_image"])
        safe_dets = sanitise_detections(result["detections"])

        # Persist to history (enabled by default)
        insert_detection("image", result["face_count"], result["summary"], safe_dets)

        return jsonify({
            "face_count": result["face_count"],
            "detections": safe_dets,
            "summary": result["summary"],
            "annotated_image": annotated_b64,
            "message": f"Detected {result['face_count']} face(s).",
        })

    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        logger.exception("Unexpected error in /api/detect/image")
        return jsonify({"error": "Internal server error. Check backend logs."}), 500


@app.route("/api/detect/frame", methods=["POST"])
def detect_frame():
    """Detect faces in a base64-encoded webcam frame."""
    data = request.get_json(silent=True)
    if not data or "frame" not in data:
        return jsonify({"error": "Missing 'frame' field (base64 image)"}), 400

    confidence_threshold = float(data.get("confidence_threshold", DEFAULT_CONFIDENCE_THRESHOLD))

    try:
        image_bgr = image_from_base64(data["frame"])
        result = run_inference_on_image(image_bgr, confidence_threshold)

        annotated_b64 = encode_image_b64(result["annotated_image"])
        safe_dets = sanitise_detections(result["detections"])

        # Only persist to history if webcam option is enabled by client
        if data.get("save_history", True) and result["face_count"] > 0:
            insert_detection("webcam", result["face_count"], result["summary"], safe_dets)

        return jsonify({
            "face_count": result["face_count"],
            "detections": safe_dets,
            "summary": result["summary"],
            "annotated_image": annotated_b64,
        })

    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        logger.exception("Unexpected error in /api/detect/frame")
        return jsonify({"error": "Internal server error. Check backend logs."}), 500


@app.route("/api/history", methods=["GET"])
def get_history():
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    source = request.args.get("source", None)

    offset = (page - 1) * per_page
    records = fetch_history(limit=per_page, offset=offset, source_filter=source)
    total = count_history(source_filter=source)

    return jsonify({
        "records": records,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    })


@app.route("/api/history", methods=["DELETE"])
def delete_history():
    deleted = clear_history()
    return jsonify({"deleted": deleted, "message": f"Cleared {deleted} record(s)."})


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    metrics = load_metrics()
    if metrics is None:
        return jsonify({
            "available": False,
            "message": "Model metrics not available. Run 'python train_model.py' to generate them.",
        }), 200
    return jsonify({"available": True, "metrics": metrics})


@app.route("/api/statistics", methods=["GET"])
def get_statistics():
    stats = fetch_statistics()
    return jsonify(stats)


@app.route("/api/samples/<class_name>", methods=["GET"])
def get_sample_image(class_name):
    """Serve a sample image from the dataset for 1-click testing."""
    if class_name not in ["with_mask", "without_mask"]:
        return jsonify({"error": "Invalid class name"}), 400
    from config import DATASET_DIR
    target_dir = os.path.join(DATASET_DIR, class_name)
    if not os.path.isdir(target_dir):
        return jsonify({"error": "Dataset folder not found"}), 404
    files = [f for f in os.listdir(target_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    if not files:
        return jsonify({"error": "No images found in dataset"}), 404
    # Pick a sample
    sample_file = files[min(10, len(files) - 1)]
    return send_from_directory(target_dir, sample_file)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "Endpoint not found"}), 404
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return (
        "<h2>Frontend bundle not found.</h2>"
        "<p>Please build the frontend using <code>npm run build</code> in the <code>frontend</code> folder.</p>",
        404,
    )


# ─── Entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
