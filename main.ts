// The World in One Image, Tuesday 17 November 2026.
// Entry program for the make.fun news-image-20261117 bounty (Node 22, standard library only).
//
// The picture itself is entry.png beside this file: a newspaper front page that sums up the
// day's world news. This program checks the file against the competition's limits before it
// hands it in, then copies it to the output directory as entry.png.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1_048_576;
const MAX_SIDE = 1_024;

const source = new URL('./entry.png', import.meta.url);
const image = readFileSync(source);

if (image.length > MAX_BYTES) {
  throw new Error(`entry image is ${image.length} bytes, over the ${MAX_BYTES} byte limit`);
}

function pngSize(buf) {
  // PNG: an 8 byte signature, then the IHDR chunk carries width and height as big-endian uint32.
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, i) => buf[i] === byte)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), kind: 'PNG' };
}

function jpegSize(buf) {
  // JPEG: starts FF D8, then a chain of segments; a SOF0 or SOF2 segment carries the frame size.
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5), kind: 'JPEG' };
    }
    offset += 2 + length;
  }
  return null;
}

const size = pngSize(image) ?? jpegSize(image);
if (!size) throw new Error('entry image is neither a whole PNG nor a whole JPEG');
if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
  throw new Error(`entry image is ${size.width}x${size.height}, over the ${MAX_SIDE} pixel limit`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), image);
console.log(`handed in entry.png: ${size.kind} ${size.width}x${size.height}, ${image.length} bytes`);
