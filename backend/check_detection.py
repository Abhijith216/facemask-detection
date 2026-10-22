"""Compare face detector coverage on local samples without writing history."""
import json
from pathlib import Path

import cv2

from config import DATASET_DIR
from face_detector import _detect_haar, _detect_dnn, _detect_yunet


def main():
    results = {}
    for label in ("with_mask", "without_mask"):
        images = sorted(Path(DATASET_DIR, label).glob("*.jpg"))[:40]
        counts = {"images": len(images), "haar_found": 0, "dnn_found": 0, "yunet_found": 0}
        recovered = []
        for path in images:
            image = cv2.imread(str(path))
            haar_found = bool(_detect_haar(image))
            dnn_found = bool(_detect_dnn(image))
            yunet_found = bool(_detect_yunet(image))
            counts["haar_found"] += haar_found
            counts["dnn_found"] += dnn_found
            counts["yunet_found"] += yunet_found
            if yunet_found and not dnn_found:
                recovered.append(path.name)
        counts["recovered_examples"] = recovered[:3]
        results[label] = counts
    # Blank frames must not be treated as masked faces.
    import numpy as np
    results["blank_frame_faces"] = len(_detect_yunet(np.zeros((480, 640, 3), dtype=np.uint8)))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
