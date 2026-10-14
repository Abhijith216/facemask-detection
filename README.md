# Face Mask Detection System Using CNN and MobileNetV2

> **College Mini-Project** — An AI-powered computer-vision application that detects face mask usage in images and webcam frames using deep learning (MobileNetV2 + Transfer Learning).

---

## ⚠️ Disclaimer

This is an **educational prototype**. It is not a certified medical diagnostic device and must not be used to enforce mask compliance or make medical/health decisions.

---

## Features

| Feature | Description |
|---|---|
| 🎥 Live Webcam Detection | Real-time face detection with coloured bounding boxes |
| 🖼️ Image Upload Analysis | Drag-and-drop image analysis with annotated results |
| 📊 Dashboard Analytics | Statistics, charts, and activity trends |
| 🕑 Detection History | SQLite-persisted history with search, filter & CSV export |
| 📈 Model Performance | Real accuracy/loss curves, confusion matrix & per-class metrics |
| ⚙️ Settings | Confidence threshold, detection interval, theme, history toggle |

---

## Project Structure

```
face-mask-detection/
├── backend/
│   ├── app.py           # Flask REST API
│   ├── config.py        # Configuration (paths, hyper-parameters)
│   ├── face_detector.py # OpenCV face detection
│   ├── inference.py     # MobileNetV2 inference pipeline
│   ├── database.py      # SQLite history layer
│   ├── train_model.py   # Full training script
│   ├── requirements.txt
│   ├── models/          # Trained model saved here (.keras)
│   ├── dataset/         # Kaggle dataset extracted here
│   └── outputs/         # Training plots & metrics JSON
├── frontend/
│   ├── src/
│   │   ├── components/  # Sidebar, Header, StatCard, shared UI
│   │   ├── pages/       # Dashboard, LiveDetection, ImageAnalysis, …
│   │   ├── hooks/       # useSettings, useBackendHealth
│   │   ├── services/    # api.ts (Axios)
│   │   └── types/       # Shared TypeScript types
│   ├── .env             # VITE_API_BASE_URL
│   └── package.json
├── .gitignore
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Recommended Version |
|---|---|
| Python | 3.10 – 3.12 |
| Node.js | 18 or later |
| npm | 9 or later |

---

### Step 1 — Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **Tip:** Use a virtual environment:
> ```bash
> python -m venv .venv
> .venv\Scripts\activate   # Windows
> source .venv/bin/activate # macOS/Linux
> pip install -r requirements.txt
> ```

---

### Step 2 — Download and extract the Kaggle dataset

1. Visit: https://www.kaggle.com/datasets/omkargurav/face-mask-dataset
2. Download and extract the dataset.
3. Place the contents so the structure is:

```
backend/dataset/
    with_mask/       <-- face images with masks
    without_mask/    <-- face images without masks
```

> If you want three-class support (`mask_weared_incorrect`), update `CLASS_NAMES` in `backend/config.py` and use a matching three-class dataset.

---

### Step 3 — Train the model

```bash
cd backend
python train_model.py
```

This will:
- Train MobileNetV2 on the dataset (two phases)
- Save the model to `backend/models/face_mask_model.keras`
- Save metrics JSON to `backend/outputs/metrics.json`
- Save training plots to `backend/outputs/`

> ⏱️ Training time depends on your hardware. Expect ~10–40 minutes on CPU; much less on GPU.

---

### Step 4 — Start the backend

```bash
cd backend
python app.py
```

The API will be available at `http://localhost:5000`.

---

### Step 5 — Install frontend dependencies

```bash
cd frontend
npm install
```

---

### Step 6 — Start the frontend

```bash
cd frontend
npm run dev
```

Open the URL printed by Vite (default: `http://localhost:5173`).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend & model status |
| POST | `/api/detect/image` | Analyse an uploaded image |
| POST | `/api/detect/frame` | Analyse a base64 webcam frame |
| GET | `/api/history` | Paginated detection history |
| DELETE | `/api/history` | Clear all history |
| GET | `/api/metrics` | Model evaluation metrics |
| GET | `/api/statistics` | Aggregated dashboard statistics |

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Dashboard & stats | ✅ Working | Requires backend |
| Image upload analysis | ✅ Working | Requires trained model |
| Webcam live detection | ✅ Working | Requires camera permission + trained model |
| Detection history | ✅ Working | Requires backend (SQLite) |
| Model performance metrics | ✅ Working after training | Run `train_model.py` first |
| About & Settings pages | ✅ Working | No model needed |
| Three-class (incorrect mask) | ⚠️ Optional | Needs a 3-class dataset + config update |

---

## Technology Stack

**Frontend:** React · Vite · TypeScript · Tailwind CSS · Recharts · Lucide React · Axios · React Router  
**Backend:** Python · Flask · flask-cors · TensorFlow/Keras · OpenCV · NumPy · Pillow · scikit-learn · Matplotlib  
**AI/ML:** MobileNetV2 (ImageNet weights) · CNN classification head · Transfer learning · Two-phase fine-tuning  
**Storage:** SQLite (detection history)

---

## Limitations

- Haar Cascade face detection may miss faces at steep angles or in poor lighting.
- Real-time performance depends on CPU/GPU speed.
- Two-class model cannot reliably classify incorrectly worn masks without a suitable dataset.
- Not for medical or law-enforcement use.

---

## License

MIT — for educational use only.
