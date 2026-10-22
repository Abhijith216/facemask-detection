# Detection regression examples

`mask_collage.jpg` is the original local image behind the user's reported
missed-face screenshot. Its 22 visible face regions are manually recorded in
`test_detection.py` so a larger count cannot pass by adding duplicate boxes.

`four_portraits.jpg` contains two masked and two unmasked portraits. It checks
for duplicate boxes caused by a second detection around a mask contour.

These are regression inputs, not training data or an accuracy benchmark.
