# Implement from an Android screenshot

1. Crop to the area being implemented and note its dimensions and visible state. For widgets, record the character, mood, counts and opacity. Mark the visible text edges, section boundaries, icon footprints and colors that define the requested result. Sample colors from flat areas and solid glyph interiors. Record measurements as fractions of the crop width or height when the reference and Android capture differ in scale.
2. Capture the previous implementation at the same state before editing. Compare it with the supplied reference to establish the gaps to fix. Use the launcher widget as the baseline for changes to the home screen.
3. Capture the result at matching state on the emulator. Save a side-by-side comparison and measure the requested edges again. For a count, use values with each affected leading digit. Limit the measurement to the text region. For icons, compare the visible shape and footprint within the icon slot.
4. For widgets, capture the preview and launcher at the same logical dimensions. For a pixel comparison, also match state, backdrop, density and font scale. Set background transparency to 0% to compare the card itself. Check transparent backgrounds over the intended backdrop.

## Compare captures

[`scripts/check-widget-screenshot.py`](../scripts/check-widget-screenshot.py) runs locally with Python and Pillow 9.1 or later. Crop coordinates are `left,top,right,bottom` in pixels, with exclusive right and bottom edges.

```sh
python3 scripts/check-widget-screenshot.py compare reference.png launcher.png \
  --reference-crop 17,6,729,200 --actual-crop 30,640,602,796 \
  --scale-for-review --output .gridlines/widget-comparison.png
```

For a regression check against an approved capture, use crops of equal size and replace `--scale-for-review` with `--max-changed-percent`. Choose the limit on repeated captures of the same state. Scaled comparisons require matching aspect ratios and are useful for visual review. Resizing changes anti-aliased edges.

```sh
python3 scripts/check-widget-screenshot.py rail tall.png \
  --count-box 0,100,347,225 --label-box 0,230,347,272 \
  --count-color '#FFFDF8' --label-color '#BDB5AB' --max-offset 2
```

The rail check samples pixels close to each text color, prints both visible edges and their vertical gap, and fails when the horizontal offset exceeds the limit. Use the colors, regions and tolerance for the actual capture.

## Tools evaluated

- Android's screenshot-testing guide describes using reference images and controlling for render differences. Capturing a pinned widget exercises the Android launcher host and the app's RemoteViews handoff. [Android screenshot testing](https://developer.android.com/training/testing/ui-tests/screenshot)
- Paparazzi and Roborazzi offer host-side snapshot suites. They suit isolated view or Compose components. The preview and the launcher for this project also depend on worklet data, Glance-generated RemoteViews and real launcher bounds, so the emulator remains the capture source for parity. [Paparazzi](https://shot.cashapp.dev/) · [Roborazzi](https://github.com/takahirom/roborazzi)
- Pixelmatch provides configurable image comparison and anti-alias detection. For this repository, a Pillow script handles crops, comparison sheets and the glyph measurements with one local dependency. The project-local Gridlines and Impeccable skills cover the visual review. [Pixelmatch](https://github.com/mapbox/pixelmatch)
