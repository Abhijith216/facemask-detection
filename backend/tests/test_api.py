"""Exercise multipart uploads and frame responses without changing user history."""
import base64
import io
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
from PIL import Image

with patch("database.init_db"):
    from app import app, image_from_bytes

FIXTURES = Path(__file__).parent / "fixtures"


class DetectionAPITests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_spa_deep_links_and_assets_use_frontend_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "index.html").write_text("<html>Application</html>", encoding="utf-8")
            (root / "bundle.js").write_text("console.log('asset')", encoding="utf-8")
            with patch("app.FRONTEND_DIST", directory):
                for route in ("/", "/image", "/live", "/settings", "/history"):
                    response = self.client.get(route)
                    self.assertEqual(response.status_code, 200, route)
                    self.assertIn(b"Application", response.data)
                    response.close()
                response = self.client.get("/bundle.js")
                self.assertEqual(response.status_code, 200)
                self.assertIn(b"console.log", response.data)
                response.close()
                self.assertEqual(self.client.get("/api/missing-endpoint").status_code, 404)

    def test_real_multipart_collage_returns_all_22_boxes_and_annotation(self):
        with patch("app.insert_detection") as history:
            response = self.client.post("/api/detect/image", data={
                "file": (io.BytesIO((FIXTURES / "mask_collage.jpg").read_bytes()), "collage.jpg"),
                "confidence_threshold": "0.8",
            })
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result["face_count"], 22)
        self.assertEqual(len(result["detections"]), 22)
        self.assertEqual(sum(result["summary"].values()), 22)
        raw = base64.b64decode(result["annotated_image"].split(",", 1)[1])
        annotated = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        self.assertEqual(annotated.shape, (447, 447, 3))
        history.assert_called_once()

    def test_webcam_mode_detects_four_faces_without_history(self):
        encoded = base64.b64encode((FIXTURES / "four_portraits.jpg").read_bytes()).decode()
        with patch("app.insert_detection") as history:
            response = self.client.post("/api/detect/frame", json={"frame": encoded, "save_history": False})
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result["face_count"], 4)
        self.assertEqual(result["summary"]["with_mask"], 2)
        self.assertEqual(result["summary"]["without_mask"], 2)
        history.assert_not_called()

    def test_exif_orientation_is_applied_before_detection(self):
        image = Image.new("RGB", (80, 40), "white")
        exif = Image.Exif()
        exif[274] = 6  # Phone held in portrait orientation; rotate 90 degrees.
        data = io.BytesIO()
        image.save(data, format="JPEG", exif=exif)
        self.assertEqual(image_from_bytes(data.getvalue()).shape, (80, 40, 3))


if __name__ == "__main__":
    unittest.main()
