"""
Configuration settings for the Face Mask Detection backend.
"""

import os

# Base directory (backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Model configuration
MODEL_PATH = os.path.join(BASE_DIR, "models", "face_mask_model.keras")

# Dataset configuration
_LOCAL_DATASET = os.path.join(BASE_DIR, "dataset")
_PROJECT_CACHE_DATASET = os.path.join(BASE_DIR, ".kaggle-cache", "datasets", "omkargurav", "face-mask-dataset", "versions", "1", "data")
_KAGGLE_CACHE_DATASET = os.path.expanduser(r"~\.cache\kagglehub\datasets\omkargurav\face-mask-dataset\versions\1\data")

if os.path.isdir(os.path.join(_LOCAL_DATASET, "with_mask")):
    DATASET_DIR = _LOCAL_DATASET
elif os.path.isdir(os.path.join(_PROJECT_CACHE_DATASET, "with_mask")):
    DATASET_DIR = _PROJECT_CACHE_DATASET
elif os.path.isdir(_KAGGLE_CACHE_DATASET):
    DATASET_DIR = _KAGGLE_CACHE_DATASET
else:
    DATASET_DIR = _LOCAL_DATASET

# Outputs (plots, metrics, etc.)
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
METRICS_PATH = os.path.join(OUTPUTS_DIR, "metrics.json")

# Database
DATABASE_PATH = os.path.join(BASE_DIR, "history.db")

# Class labels — update if you train a three-class model
CLASS_NAMES = ["with_mask", "without_mask"]
# CLASS_NAMES = ["mask_weared_incorrect", "with_mask", "without_mask"]

# Image input size for MobileNetV2
IMG_SIZE = (224, 224)

# Maximum upload size (16 MB)
MAX_CONTENT_LENGTH = 16 * 1024 * 1024

# Allowed upload extensions
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

# Default confidence threshold (can be overridden via settings)
DEFAULT_CONFIDENCE_THRESHOLD = 0.8
# Conservative abstention threshold; confidence is not a guarantee of accuracy.
MIN_CLASSIFICATION_CONFIDENCE = 0.8

# YuNet searches several scales and overlapping crops for small/masked faces.
# The legacy detectors remain available for comparison.
FACE_DETECTOR = "yunet"  # "yunet" | "dnn" | "haarcascade"
YUNET_MODEL_PATH = os.path.join(BASE_DIR, "models", "face_detection_yunet_2023mar.onnx")
FACE_DETECTION_CONFIDENCE = 0.6
# Count tiny faces, but do not claim reliable mask classification from a few pixels.
MIN_CLASSIFICATION_FACE_SIZE = 16

# Training hyper-parameters (used by train_model.py)
TRAIN_EPOCHS = 20
FINE_TUNE_EPOCHS = 10
BATCH_SIZE = 32
LEARNING_RATE = 1e-4
VALIDATION_SPLIT = 0.15
TEST_SPLIT = 0.15
