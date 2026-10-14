"""Compare face detectors on local dataset samples without writing history."""
import json
from pathlib import Path

import cv2

from config import DATASET_DIR
from face_detector import _detect_haar, _detect_dnn


def main():
    results = {}
    for label in ("with_mask", "without_mask"):
        images = sorted(Path(DATASET_DIR, label).glob("*.jpg"))[:40]
        counts = {"images": len(images), "haar_found": 0, "dnn_found": 0}
        recovered = []
        for path in images:
            image = cv2.imread(str(path))
            haar_found = bool(_detect_haar(image))
            dnn_found = bool(_detect_dnn(image))
            counts["haar_found"] += haar_found
            counts["dnn_found"] += dnn_found
            if dnn_found and not haar_found:
                recovered.append(path.name)
        counts["recovered_examples"] = recovered[:3]
        results[label] = counts
    # Blank frames must not be treated as masked faces.
    import numpy as np
    results["blank_frame_faces"] = len(_detect_dnn(np.zeros((480, 640, 3), dtype=np.uint8)))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
