"""Run from backend: .venv/Scripts/python.exe -m unittest discover -s tests -v."""
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np

from face_detector import detect_faces, _detect_dnn, _merge_candidates, _tile_starts
from inference import run_inference_on_image, predict_faces

FIXTURES = Path(__file__).parent / "fixtures"

# Manually checked visible-face regions in the original, unannotated collage.
# Includes the four people at top right and three visible faces in the crowd tile.
COLLAGE_FACES = [
    (55, 33, 34, 44), (144, 33, 38, 53), (261, 22, 39, 49),
    (354, 28, 24, 30), (410, 19, 18, 21), (412, 40, 25, 30), (345, 63, 33, 39),
    (56, 146, 33, 43), (155, 145, 35, 46), (269, 138, 14, 17),
    (287, 140, 28, 33), (240, 160, 14, 17), (363, 153, 47, 61),
    (26, 237, 66, 88), (154, 254, 35, 48), (244, 242, 26, 34),
    (288, 262, 25, 27), (370, 228, 49, 55),
    (40, 377, 28, 36), (160, 359, 27, 40), (261, 361, 46, 57), (371, 367, 33, 37),
]


def iou(region, face):
    x, y, w, h = region
    fx, fy, fw, fh = (face[key] for key in ("x", "y", "w", "h"))
    intersection = max(0, min(x + w, fx + fw) - max(x, fx)) * max(0, min(y + h, fy + fh) - max(y, fy))
    return intersection / (w * h + fw * fh - intersection)


class FaceDetectionRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.collage = cv2.imread(str(FIXTURES / "mask_collage.jpg"))
        cls.portraits = cv2.imread(str(FIXTURES / "four_portraits.jpg"))
        cls.faces = detect_faces(cls.collage)

    def test_collage_recovers_each_visible_face_once(self):
        remaining = list(self.faces)
        for expected in COLLAGE_FACES:
            matched = max(remaining, key=lambda face: iou(expected, face), default=None)
            self.assertIsNotNone(matched, f"Missing face at {expected}")
            self.assertGreater(iou(expected, matched), 0.3, f"Missing face at {expected}")
            # Remove by identity; dictionaries contain numpy arrays.
            remaining = [face for face in remaining if face is not matched]
        self.assertEqual(remaining, [], "Duplicate or spurious boxes")
        self.assertGreater(len(self.faces), len(_detect_dnn(self.collage)))

    def test_four_portraits_have_no_duplicate_mask_contour(self):
        faces = detect_faces(self.portraits)
        self.assertEqual(len(faces), 4)
        centers = [(face["x"] + face["w"] / 2, face["y"] + face["h"] / 2) for face in faces]
        self.assertEqual({(x > 272, y > 281) for x, y in centers},
                         {(False, False), (True, False), (False, True), (True, True)})

    def test_boxes_and_crops_use_original_coordinates(self):
        for face in self.faces:
            x, y, w, h = (face[key] for key in ("x", "y", "w", "h"))
            self.assertTrue(0 <= x < x + w <= self.collage.shape[1])
            self.assertTrue(0 <= y < y + h <= self.collage.shape[0])
            np.testing.assert_array_equal(face["face_roi"], self.collage[y:y + h, x:x + w])
        # Exercise the 2560px working-image cap and map boxes back to the upload.
        enlarged = cv2.resize(self.portraits, (3270, 3378))
        self.assertEqual(len(detect_faces(enlarged)), 4)

    def test_blank_and_panoramic_images_do_not_create_faces(self):
        for shape, color in [((480, 640, 3), 0), ((640, 480, 3), 127),
                             ((480, 640, 3), 255), ((30, 2000, 3), 0)]:
            with self.subTest(shape=shape, color=color):
                self.assertEqual(detect_faces(np.full(shape, color, np.uint8)), [])

    def test_crop_grid_is_bounded_and_reaches_image_edges(self):
        for length in (10, 128, 447, 640, 2560):
            size = max(128, int(np.ceil(length / 4)))
            starts = _tile_starts(length, size)
            self.assertLessEqual(len(starts), 5)
            self.assertEqual(starts[0], 0)
            self.assertEqual(starts[-1], max(0, length - size))

    def test_nested_duplicates_are_merged_but_neighbours_remain(self):
        boxes = [dict(x=0, y=0, w=40, h=50, score=.95),
                 dict(x=2, y=20, w=42, h=65, score=.65),
                 dict(x=42, y=0, w=40, h=50, score=.9)]
        self.assertEqual(len(_merge_candidates(boxes)), 2)

    def test_concurrent_different_image_sizes_are_safe(self):
        images = [self.portraits, np.zeros((400, 700, 3), np.uint8)] * 2
        with ThreadPoolExecutor(max_workers=4) as pool:
            counts = list(pool.map(lambda image: len(detect_faces(image, high_accuracy=False)), images))
        self.assertEqual(counts, [4, 0, 4, 0])


class InferenceRegressionTests(unittest.TestCase):
    def test_uncertain_and_tiny_faces_are_still_counted(self):
        image = np.zeros((100, 100, 3), np.uint8)
        faces = [{"x": 0, "y": 0, "w": 30, "h": 30, "face_roi": image[:30, :30]},
                 {"x": 40, "y": 0, "w": 12, "h": 12, "face_roi": image[:12, :12]}]
        predictions = [dict(label="with_mask", confidence=.7, probabilities={"with_mask": .7, "without_mask": .3}),
                       dict(label="without_mask", confidence=.99, probabilities={"with_mask": .01, "without_mask": .99})]
        with patch("inference.detect_faces", return_value=faces) as detector, \
                patch("inference.predict_faces", return_value=predictions):
            result = run_inference_on_image(image, high_accuracy=False)
        detector.assert_called_once_with(image, high_accuracy=False)
        self.assertEqual(result["face_count"], 2)
        self.assertEqual(result["summary"]["uncertain"], 2)
        self.assertEqual(len(result["detections"]), 2)

    def test_threshold_must_be_finite_and_in_range(self):
        for threshold in (float("nan"), float("inf"), -1, 1.1):
            with self.subTest(threshold=threshold), self.assertRaises(ValueError):
                run_inference_on_image(np.zeros((30, 30, 3), np.uint8), threshold)

    def test_crowd_predictions_use_bounded_batches(self):
        class FakeModel:
            def __init__(self):
                self.batch_sizes = []

            def predict(self, inputs, verbose=0):
                self.batch_sizes.append(len(inputs))
                return np.tile([.9, .1], (len(inputs), 1))

        model = FakeModel()
        with patch("inference.load_mask_model", return_value=model):
            result = predict_faces([np.zeros((20, 20, 3), np.uint8)] * 70)
        self.assertEqual(model.batch_sizes, [32, 32, 6])
        self.assertEqual(len(result), 70)


if __name__ == "__main__":
    unittest.main()
