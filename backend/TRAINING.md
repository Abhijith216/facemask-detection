# Training on Windows

Run these commands from the `backend` directory in PowerShell. Use Python 3.12
with the pinned TensorFlow dependencies.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:KAGGLEHUB_CACHE = Join-Path (Get-Location) '.kaggle-cache'
$env:KERAS_HOME = Join-Path (Get-Location) '.keras'
$env:MPLCONFIGDIR = Join-Path (Get-Location) '.matplotlib'
.\.venv\Scripts\python.exe train_model.py --kaggle
```

If the project environment already exists, skip its creation and dependency
installation. The downloader reuses cached images. The backend automatically
finds version 1 of this dataset in the project cache.

The script trains the classification head, fine-tunes MobileNetV2, and evaluates
on a separate test set. It writes the model to `models/face_mask_model.keras`
and metrics and plots to `outputs/`.

After training finishes, restart the backend so it loads the new model:

```powershell
.\.venv\Scripts\python.exe app.py
```

Check `http://localhost:5000/api/health`: `model.loaded` should be `true`.
When training is redirected to `training.log`, monitor it with
`Get-Content training.log -Tail 20 -Wait`.

## Face detector

The default face detector is OpenCV's ResNet-10 SSD (`FACE_DETECTOR = "dnn"`).
It locates faces before MobileNetV2 classifies mask usage. Download its files
from OpenCV's official repositories when setting up a fresh checkout:

```powershell
Invoke-WebRequest 'https://raw.githubusercontent.com/opencv/opencv/4.10.0/samples/dnn/face_detector/deploy.prototxt' -OutFile models/deploy.prototxt
Invoke-WebRequest 'https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel' -OutFile models/res10_300x300_ssd_iter_140000.caffemodel
```

Run `.\.venv\Scripts\python.exe check_detection.py` to compare Haar and DNN
face coverage on 40 local dataset images per class and a blank frame. These
counts measure face detection coverage, not classifier accuracy.
