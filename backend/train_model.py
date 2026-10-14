"""
Training script for the Face Mask Detection model.

Usage:
    python train_model.py

Steps performed:
1. Load dataset from DATASET_DIR (expects subdirectories per class)
2. Split into train / validation / test sets
3. Apply data augmentation
4. Build MobileNetV2 + classification head
5. Train (frozen base) then fine-tune (partial unfreeze)
6. Evaluate on test set
7. Save model, metrics JSON, accuracy/loss plots, confusion matrix
"""

import os
import json
import logging
import numpy as np
import matplotlib
matplotlib.use("Agg")  # headless backend
import matplotlib.pyplot as plt

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import train_test_split

from config import (
    DATASET_DIR,
    MODEL_PATH,
    OUTPUTS_DIR,
    METRICS_PATH,
    CLASS_NAMES,
    IMG_SIZE,
    BATCH_SIZE,
    LEARNING_RATE,
    TRAIN_EPOCHS,
    FINE_TUNE_EPOCHS,
    VALIDATION_SPLIT,
    TEST_SPLIT,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

os.makedirs(OUTPUTS_DIR, exist_ok=True)


# ─── Dataset loading ───────────────────────────────────────────────────────

def resolve_dataset_dir(base_dir: str) -> str:
    """Find the directory that directly contains class folders like with_mask."""
    if not os.path.exists(base_dir):
        return base_dir
    # Check if with_mask is directly inside
    if os.path.isdir(os.path.join(base_dir, "with_mask")):
        return base_dir
    # Check 1 or 2 levels down (e.g. data/with_mask)
    for root, dirs, _ in os.walk(base_dir):
        if "with_mask" in dirs and "without_mask" in dirs:
            return root
    return base_dir


def download_from_kaggle(dataset_handle: str = "omkargurav/face-mask-dataset") -> str:
    """Download dataset using kagglehub and return resolved data path."""
    try:
        import kagglehub
        logger.info("Downloading '%s' from Kaggle via kagglehub...", dataset_handle)
        downloaded_path = kagglehub.dataset_download(dataset_handle)
        logger.info("Dataset downloaded by kagglehub to: %s", downloaded_path)
        resolved = resolve_dataset_dir(downloaded_path)
        logger.info("Resolved training images directory: %s", resolved)
        return resolved
    except Exception as e:
        logger.error("Failed to download dataset with kagglehub: %s", e)
        return ""


def load_dataset(dataset_dir: str, class_names: list[str]):
    """
    Walk dataset_dir expecting:
        dataset_dir/
            with_mask/      *.jpg *.jpeg *.png
            without_mask/
            [mask_weared_incorrect/]

    Returns (image_paths, labels) as lists.
    """
    effective_dir = resolve_dataset_dir(dataset_dir)
    image_paths, labels = [], []
    for label_idx, class_name in enumerate(class_names):
        class_dir = os.path.join(effective_dir, class_name)
        if not os.path.isdir(class_dir):
            logger.warning("Class directory not found: %s", class_dir)
            continue
        for fname in os.listdir(class_dir):
            if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                image_paths.append(os.path.join(class_dir, fname))
                labels.append(label_idx)
    return image_paths, labels, effective_dir


def load_and_preprocess(path: str) -> np.ndarray:
    img = tf.keras.utils.load_img(path, target_size=IMG_SIZE)
    arr = tf.keras.utils.img_to_array(img)
    return preprocess_input(arr)


# ─── Data augmentation ────────────────────────────────────────────────────

def build_augmentation_layer():
    return tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.1),
        layers.RandomBrightness(0.1, value_range=(-1.0, 1.0)),
        layers.RandomContrast(0.1, value_range=(-1.0, 1.0)),
    ], name="augmentation")


# ─── Model architecture ───────────────────────────────────────────────────

def build_model(n_classes: int, img_size=IMG_SIZE):
    base = MobileNetV2(
        input_shape=(*img_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False  # freeze pretrained layers

    inputs = layers.Input(shape=(*img_size, 3))
    x = build_augmentation_layer()(inputs)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(n_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name="face_mask_mobilenetv2")
    return model, base


# ─── Training helpers ─────────────────────────────────────────────────────

def get_callbacks(model_path: str):
    return [
        ModelCheckpoint(model_path, save_best_only=True, monitor="val_accuracy", verbose=1),
        EarlyStopping(patience=5, restore_best_weights=True, monitor="val_accuracy"),
        ReduceLROnPlateau(factor=0.5, patience=3, monitor="val_loss"),
    ]


def plot_history(histories: list, labels: list[str]):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    offset = 0
    for hist, label in zip(histories, labels):
        ep = range(offset + 1, offset + len(hist.history["accuracy"]) + 1)
        axes[0].plot(ep, hist.history["accuracy"], label=f"{label} train acc")
        axes[0].plot(ep, hist.history["val_accuracy"], "--", label=f"{label} val acc")
        axes[1].plot(ep, hist.history["loss"], label=f"{label} train loss")
        axes[1].plot(ep, hist.history["val_loss"], "--", label=f"{label} val loss")
        offset += len(hist.history["accuracy"])

    axes[0].set_title("Accuracy")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Accuracy")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    axes[1].set_title("Loss")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Loss")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    path = os.path.join(OUTPUTS_DIR, "training_history.png")
    plt.savefig(path, dpi=150)
    plt.close()
    logger.info("Training history plot saved to %s", path)
    return path


def plot_confusion_matrix(cm: np.ndarray, class_names: list[str]):
    fig, ax = plt.subplots(figsize=(max(6, len(class_names) * 2), max(5, len(class_names) * 2)))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(len(class_names)),
        yticks=np.arange(len(class_names)),
        xticklabels=class_names,
        yticklabels=class_names,
        ylabel="True label",
        xlabel="Predicted label",
        title="Confusion Matrix",
    )
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    thresh = cm.max() / 2
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    plt.tight_layout()
    path = os.path.join(OUTPUTS_DIR, "confusion_matrix.png")
    plt.savefig(path, dpi=150)
    plt.close()
    logger.info("Confusion matrix saved to %s", path)
    return path


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Train MobileNetV2 Face Mask Detection Model")
    parser.add_argument("--dataset", type=str, default=DATASET_DIR, help="Path to dataset root folder")
    parser.add_argument("--kaggle", action="store_true", help="Force download latest dataset using kagglehub")
    parser.add_argument("--epochs", type=int, default=TRAIN_EPOCHS, help="Phase 1 training epochs")
    parser.add_argument("--fine-tune-epochs", type=int, default=FINE_TUNE_EPOCHS, help="Phase 2 fine-tuning epochs")
    args = parser.parse_args()

    dataset_path = args.dataset
    if args.kaggle:
        logger.info("Flag --kaggle provided. Fetching dataset via kagglehub...")
        downloaded = download_from_kaggle("omkargurav/face-mask-dataset")
        if downloaded:
            dataset_path = downloaded

    logger.info("=== Face Mask Detection — Training Script ===")
    logger.info("Dataset directory : %s", dataset_path)
    logger.info("Classes           : %s", CLASS_NAMES)
    logger.info("Output model      : %s", MODEL_PATH)

    # 1. Load dataset
    image_paths, labels, effective_dir = load_dataset(dataset_path, CLASS_NAMES)
    if len(image_paths) == 0:
        logger.info("No images found in '%s'. Attempting to fetch automatically from Kaggle...", dataset_path)
        kaggle_dir = download_from_kaggle("omkargurav/face-mask-dataset")
        if kaggle_dir:
            image_paths, labels, effective_dir = load_dataset(kaggle_dir, CLASS_NAMES)

    if len(image_paths) == 0:
        logger.error(
            "No images found. Please verify the dataset path.\n"
            "Expected subdirectories 'with_mask/' and 'without_mask/'.",
        )
        return

    logger.info("Using dataset from: %s", effective_dir)
    logger.info("Total images: %d", len(image_paths))

    # 2. Split
    paths_arr = np.array(image_paths)
    labels_arr = np.array(labels)

    # First split off test set
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        paths_arr, labels_arr,
        test_size=TEST_SPLIT,
        random_state=42,
        stratify=labels_arr,
    )
    # Then split train/val from the remainder
    val_ratio = VALIDATION_SPLIT / (1 - TEST_SPLIT)
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval, y_trainval,
        test_size=val_ratio,
        random_state=42,
        stratify=y_trainval,
    )

    logger.info("Train: %d | Val: %d | Test: %d", len(X_train), len(X_val), len(X_test))

    # 3. Build tf.data pipelines
    def make_dataset(paths, lbls, shuffle=False):
        def parse_item(p, l):
            raw = tf.io.read_file(p)
            img = tf.io.decode_image(raw, channels=3, expand_animations=False)
            img = tf.image.resize(img, IMG_SIZE)
            img = preprocess_input(img)
            return img, l

        ds = tf.data.Dataset.from_tensor_slices((paths, lbls))
        if shuffle:
            ds = ds.shuffle(buffer_size=min(len(paths), 1000), seed=42)
        ds = ds.map(parse_item, num_parallel_calls=tf.data.AUTOTUNE)
        ds = ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
        return ds

    train_ds = make_dataset(X_train.tolist(), y_train.tolist(), shuffle=True)
    val_ds = make_dataset(X_val.tolist(), y_val.tolist())
    test_ds = make_dataset(X_test.tolist(), y_test.tolist())

    # 4. Build model
    n_classes = len(CLASS_NAMES)
    model, base_model = build_model(n_classes)
    model.summary()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    # 5. Phase 1: train classification head
    logger.info("Phase 1: Training classification head (base frozen)…")
    hist1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        callbacks=get_callbacks(MODEL_PATH),
    )

    # 6. Phase 2: fine-tune top layers of MobileNetV2
    logger.info("Phase 2: Fine-tuning top layers…")
    base_model.trainable = True
    # Freeze all but last 30 layers
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE / 10),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    hist2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.fine_tune_epochs,
        callbacks=get_callbacks(MODEL_PATH),
    )

    # 7. Evaluate on test set
    logger.info("Evaluating on test set…")
    model.load_weights(MODEL_PATH)  # reload best checkpoint

    y_pred_probs = model.predict(test_ds)
    y_pred = np.argmax(y_pred_probs, axis=1)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=CLASS_NAMES, output_dict=True)

    logger.info("Test Accuracy : %.4f", acc)
    logger.info("Precision     : %.4f", prec)
    logger.info("Recall        : %.4f", rec)
    logger.info("F1 Score      : %.4f", f1)

    # 8. Save plots
    plot_history([hist1, hist2], ["Phase 1", "Phase 2"])
    plot_confusion_matrix(cm, CLASS_NAMES)

    # 9. Build and save training history for the metrics JSON
    def _safe_list(lst):
        return [float(v) for v in lst]

    all_train_acc = _safe_list(hist1.history["accuracy"] + hist2.history["accuracy"])
    all_val_acc = _safe_list(hist1.history["val_accuracy"] + hist2.history["val_accuracy"])
    all_train_loss = _safe_list(hist1.history["loss"] + hist2.history["loss"])
    all_val_loss = _safe_list(hist1.history["val_loss"] + hist2.history["val_loss"])

    per_class = {}
    for cls in CLASS_NAMES:
        per_class[cls] = {
            "precision": float(report.get(cls, {}).get("precision", 0)),
            "recall": float(report.get(cls, {}).get("recall", 0)),
            "f1_score": float(report.get(cls, {}).get("f1-score", 0)),
            "support": int(report.get(cls, {}).get("support", 0)),
        }

    metrics = {
        "test_accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1_score": float(f1),
        "confusion_matrix": cm.tolist(),
        "class_names": CLASS_NAMES,
        "per_class": per_class,
        "training_history": {
            "accuracy": all_train_acc,
            "val_accuracy": all_val_acc,
            "loss": all_train_loss,
            "val_loss": all_val_loss,
        },
        "dataset": {
            "total": len(image_paths),
            "train": len(X_train),
            "val": len(X_val),
            "test": len(X_test),
        },
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info("Metrics saved to %s", METRICS_PATH)
    logger.info("=== Training complete! ===")


if __name__ == "__main__":
    main()
