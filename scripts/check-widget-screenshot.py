#!/usr/bin/env python3
"""Compare widget crops or check the visible left edges of two text regions."""

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageColor, ImageDraw


def rectangle(value):
    try:
        left, top, right, bottom = map(int, value.split(","))
        if min(left, top) >= 0 and right > left and bottom > top:
            return left, top, right, bottom
    except ValueError:
        pass
    raise argparse.ArgumentTypeError("Expected left,top,right,bottom in pixels")


def load(path, region=None):
    with Image.open(path) as image:
        image = image.convert("RGB")
        if region is None:
            return image
        if region[2] > image.width or region[3] > image.height:
            raise ValueError(f"Crop {region} extends outside {path} ({image.size})")
        return image.crop(region)


def save(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def largest_channel(image):
    red, green, blue = image.split()
    return ImageChops.lighter(ImageChops.lighter(red, green), blue)


def compare(args):
    reference = load(args.reference, args.reference_crop)
    actual = load(args.actual, args.actual_crop)
    if reference.size != actual.size:
        if not args.scale_for_review:
            raise ValueError("Crops must have the same dimensions. For visual review use --scale-for-review.")
        aspect_change = (actual.width * reference.height) / (reference.width * actual.height)
        if abs(aspect_change - 1) > .02:
            raise ValueError("Use crops with matching aspect ratios for a scaled comparison")
        actual = actual.resize(reference.size, Image.Resampling.LANCZOS)

    difference = ImageChops.difference(reference, actual)
    changed = sum(largest_channel(difference).histogram()[args.pixel_tolerance + 1 :])
    percent = 100 * changed / (reference.width * reference.height)
    sheet = Image.new("RGB", (reference.width * 3 + 16, reference.height + 22), "#181818")
    labels = ImageDraw.Draw(sheet)
    for index, (label, panel) in enumerate(zip(
        ("Reference", "Capture", "Difference (3x)"),
        (reference, actual, difference.point([min(i * 3, 255) for i in range(256)] * 3)),
    )):
        x = index * (reference.width + 8)
        labels.text((x + 4, 4), label, fill="white")
        sheet.paste(panel, (x, 22))
    save(sheet, args.output)
    print(f"{percent:.2f}% of pixels exceed a channel difference of {args.pixel_tolerance}. {args.output}")
    return args.max_changed_percent is not None and percent > args.max_changed_percent


def ink_box(image, region, color, tolerance):
    crop = image.crop(region)
    ink = ImageChops.difference(crop, Image.new("RGB", crop.size, ImageColor.getrgb(color)))
    bounds = largest_channel(ink).point(lambda channel: 255 if channel <= tolerance else 0).getbbox()
    if bounds is None:
        raise ValueError(f"No text pixels near {color} inside {region}")
    return tuple(coordinate + region[index % 2] for index, coordinate in enumerate(bounds))


def rail(args):
    image = load(args.capture, args.crop)
    for region in (args.count_box, args.label_box):
        if region[2] > image.width or region[3] > image.height:
            raise ValueError(f"Text region {region} extends outside the crop ({image.size})")
    count = ink_box(image, args.count_box, args.count_color, args.color_tolerance)
    label = ink_box(image, args.label_box, args.label_color, args.color_tolerance)
    offset = count[0] - label[0]
    gap = label[1] - count[3]
    print(f"{args.capture}: count x={count[0]}, label x={label[0]}, offset={offset}px, gap={gap}px")
    return abs(offset) > args.max_offset


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(required=True)
    comparison = commands.add_parser("compare", help="Save a reference, capture, and absolute difference")
    for image in ("reference", "actual"):
        comparison.add_argument(image, type=Path)
        comparison.add_argument(f"--{image}-crop", type=rectangle)
    comparison.add_argument("--output", type=Path, required=True)
    comparison.add_argument("--pixel-tolerance", type=int, default=16)
    limit = comparison.add_mutually_exclusive_group()
    limit.add_argument("--max-changed-percent", type=float)
    limit.add_argument("--scale-for-review", action="store_true")
    comparison.set_defaults(run=compare)

    alignment = commands.add_parser("rail", help="Measure the first visible pixel of the count and caption")
    alignment.add_argument("capture", type=Path)
    alignment.add_argument("--crop", type=rectangle)
    for role in ("count", "label"):
        alignment.add_argument(f"--{role}-box", type=rectangle, required=True)
        alignment.add_argument(f"--{role}-color", required=True)
    alignment.add_argument("--color-tolerance", type=int, default=24)
    alignment.add_argument("--max-offset", type=int, default=2)
    alignment.set_defaults(run=rail)
    args = parser.parse_args()
    try:
        return args.run(args)
    except (OSError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    raise SystemExit(main())
