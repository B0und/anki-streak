import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';

import sharp from 'sharp';

type Box = { left: number; top: number; width: number; height: number };
type Image = { data: Buffer; width: number; height: number };
type RGB = readonly [number, number, number];

const usage = `Compare widget captures or measure their visible text edges.

  compare <reference> <capture> --output <png>
    [--reference-crop <box>] [--actual-crop <box>] [--pixel-tolerance <0-255>]
    [--max-changed-percent <0-100> | --scale-for-review]
  rail <capture> --count-box <box> --label-box <box> --count-color <hex> --label-color <hex>
    [--crop <box>] [--color-tolerance <0-255>] [--max-offset <pixels>]

A box is left,top,right,bottom in pixels. Colors can be CSS color names or #RRGGBB.
`;

const cropOption = { type: 'string' } as const;

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function box(value: string): Box {
  const parts = value.split(',');
  const [left, top, right, bottom] = parts.map(Number);
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part.trim()))
    || left === undefined || top === undefined || right === undefined || bottom === undefined
    || ![left, top, right, bottom].every(Number.isSafeInteger) || right <= left || bottom <= top) {
    throw new Error('Expected a nonempty box as left,top,right,bottom in pixels.');
  }
  return { left, top, width: right - left, height: bottom - top };
}

function within(bounds: Box, width: number, height: number) {
  if (bounds.left + bounds.width > width || bounds.top + bounds.height > height) {
    throw new Error(`Box extends outside the ${width} × ${height} image.`);
  }
}

function limit(value: string | undefined, fallback: number, maximum: number, name: string, integer = true) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number) || number < 0 || number > maximum || (integer && !Number.isInteger(number))) {
    throw new Error(`Invalid ${name}.`);
  }
  return number;
}

async function color(value: string): Promise<RGB> {
  const pixel = await sharp({ create: { width: 1, height: 1, channels: 3, background: value } }).raw().toBuffer();
  return [pixel.readUInt8(0), pixel.readUInt8(1), pixel.readUInt8(2)];
}

async function load(path: string, crop?: string): Promise<Image> {
  const image = sharp(path).toColourspace('srgb').removeAlpha();
  if (crop) {
    const bounds = box(crop);
    const { width, height } = await image.metadata();
    within(bounds, width, height);
    image.extract(bounds);
  }
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const raw = ({ data, width, height }: Image) => sharp(data, { raw: { width, height, channels: 3 } });

async function compare(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    'reference-crop': cropOption, 'actual-crop': cropOption, output: cropOption,
    'pixel-tolerance': cropOption, 'max-changed-percent': cropOption, 'scale-for-review': { type: 'boolean' },
  } });
  if (positionals.length !== 2) throw new Error('Provide a reference and a capture.');
  if (values['scale-for-review'] && values['max-changed-percent'] !== undefined) {
    throw new Error('Choose either --scale-for-review or --max-changed-percent.');
  }
  const output = required(values.output, '--output');
  const tolerance = limit(values['pixel-tolerance'], 16, 255, '--pixel-tolerance');
  const maxChanged = limit(values['max-changed-percent'], 100, 100, '--max-changed-percent', false);
  const [reference, capture] = await Promise.all([
    load(required(positionals[0], 'reference'), values['reference-crop']),
    load(required(positionals[1], 'capture'), values['actual-crop']),
  ]);
  const { width, height } = reference;
  let actual = capture;
  if (actual.width !== width || actual.height !== height) {
    if (!values['scale-for-review']) throw new Error('Use crops with equal dimensions or --scale-for-review.');
    if (Math.abs(actual.width * height / (width * actual.height) - 1) > 0.02) {
      throw new Error('Use crops with matching aspect ratios for a scaled comparison.');
    }
    actual = { width, height, data: await raw(actual).resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer() };
  }
  const difference = Buffer.alloc(reference.data.length);
  let changed = 0;
  for (let offset = 0; offset < difference.length; offset += 3) {
    let largest = 0;
    for (let channel = 0; channel < 3; channel++) {
      const index = offset + channel;
      const delta = Math.abs(reference.data.readUInt8(index) - actual.data.readUInt8(index));
      difference.writeUInt8(Math.min(delta * 3, 255), index);
      largest = Math.max(largest, delta);
    }
    if (largest > tolerance) changed++;
  }
  const panels = await Promise.all([reference, actual, { data: difference, width, height }].map(
    (panel) => raw(panel).png().toBuffer(),
  ));
  const labels = ['Reference', 'Capture', 'Difference (3x)'].map((label, index) =>
    `<text x="${index * (width + 8) + 4}" y="15">${label}</text>`).join('');
  const sheetWidth = width * 3 + 16;
  const headings = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="22"><g fill="white" font-family="sans-serif" font-size="12">${labels}</g></svg>`);
  await mkdir(dirname(output), { recursive: true });
  await sharp({ create: { width: sheetWidth, height: height + 22, channels: 3, background: '#181818' } })
    .composite([{ input: headings, top: 0, left: 0 }, ...panels.map((input, index) => ({ input, top: 22, left: index * (width + 8) }))])
    .toFile(output);

  const percent = 100 * changed / (width * height);
  process.stdout.write(`${percent.toFixed(2)}% of pixels exceed a channel difference of ${tolerance}. ${output}\n`);
  return percent > maxChanged;
}

function ink(image: Image, bounds: Box, rgb: RGB, tolerance: number) {
  within(bounds, image.width, image.height);
  let left = Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (let y = bounds.top; y < bounds.top + bounds.height; y++) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x++) {
      const offset = (y * image.width + x) * 3;
      if (rgb.some((value, channel) => Math.abs(image.data.readUInt8(offset + channel) - value) > tolerance)) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }
  }
  if (!Number.isFinite(left)) throw new Error(`No text pixels near rgb(${rgb.join(', ')}) inside the requested box.`);
  return { left, top, bottom };
}

async function rail(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    crop: cropOption, 'count-box': cropOption, 'label-box': cropOption, 'count-color': cropOption, 'label-color': cropOption,
    'color-tolerance': cropOption, 'max-offset': cropOption,
  } });
  if (positionals.length !== 1) throw new Error('Provide one capture.');
  const capture = required(positionals[0], 'capture');
  const image = await load(capture, values.crop);
  const tolerance = limit(values['color-tolerance'], 24, 255, '--color-tolerance');
  const count = ink(image, box(required(values['count-box'], '--count-box')), await color(required(values['count-color'], '--count-color')), tolerance);
  const label = ink(image, box(required(values['label-box'], '--label-box')), await color(required(values['label-color'], '--label-color')), tolerance);
  const offset = count.left - label.left;
  process.stdout.write(`${capture}: count x=${count.left}, label x=${label.left}, offset=${offset}px, gap=${label.top - count.bottom}px\n`);
  return Math.abs(offset) > limit(values['max-offset'], 2, Number.MAX_SAFE_INTEGER, '--max-offset');
}

try {
  const [, , command, ...args] = process.argv;
  if (command === '--help' || command === '-h' || args.includes('--help') || args.includes('-h')) process.stdout.write(usage);
  else if (command === 'compare') process.exitCode = Number(await compare(args));
  else if (command === 'rail') process.exitCode = Number(await rail(args));
  else throw new Error(usage);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
