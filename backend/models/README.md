# Face detector assets

The default detector uses OpenCV Zoo's `face_detection_yunet_2023mar.onnx`,
compatible with the pinned OpenCV 4.10 runtime. It is bundled for offline use;
the application makes no runtime model downloads.

- Source: https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
- Download: https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
- SHA-256: `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4`
- License: MIT, copyright Shiqi Yu; see `YUNET_LICENSE.txt`.

The existing Caffe ResNet-10 assets are retained for the optional `dnn` detector
and before/after coverage checks. The mask classifier is the separate
`face_mask_model.keras`; changing the face detector does not retrain it.
