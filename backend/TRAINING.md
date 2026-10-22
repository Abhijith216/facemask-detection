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

The default is YuNet (`FACE_DETECTOR = "yunet"`), bundled in `models/` with its
MIT license. It locates faces before MobileNetV2 classifies mask usage. Uploads
use 320, 640 and 1280 pixel whole-image passes plus up to 25 overlapping crops.
This avoids losing small faces when a collage or crowd is reduced to 300x300.
Duplicate and partial crop boxes are merged before classification; all boxes
are returned in the original image coordinates. Webcam frames use 320 and 640
pixel passes to keep latency lower. Crops are classified in batches of 32.

To restore the bundled YuNet asset:

```powershell
Invoke-WebRequest 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx' -OutFile models/face_detection_yunet_2023mar.onnx
```

See `models/README.md` for the source, checksum and license. The legacy
ResNet-10 SSD is still selectable with `FACE_DETECTOR = "dnn"`. Its files are:

```powershell
Invoke-WebRequest 'https://raw.githubusercontent.com/opencv/opencv/4.10.0/samples/dnn/face_detector/deploy.prototxt' -OutFile models/deploy.prototxt
Invoke-WebRequest 'https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel' -OutFile models/res10_300x300_ssd_iter_140000.caffemodel
```

Run `.\.venv\Scripts\python.exe check_detection.py` to compare Haar, SSD and
YuNet on the first 40 local dataset images per class and a blank frame. These
counts measure whether any face was found, not classification accuracy or
recall over every face. In the checked samples, SSD found faces in 35/40 masked
images and 40/40 unmasked images; YuNet found 37/40 and 40/40 respectively.
The reported collage improved from 10 boxes to 22 individually matched faces.

Run the detector, classifier batching and upload API regression suite:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Detected faces are retained even when mask classification is uncertain.
Classification below the confidence threshold or on a crop smaller than 16px
is marked uncertain. Phone EXIF orientation is applied before detection.
Numbered image boxes correspond to the frontend's per-face results.

No detector can guarantee every face in arbitrary images. Severe occlusion,
cropped profiles, blur and very small faces can still be missed; mask labels
also depend on the separately trained classifier. The saved training metrics
have not been replaced by these detector regression results.
