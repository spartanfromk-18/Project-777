// ScamShield — fixture post-processor (TEST tooling).
// Adds a PNG tEXt marker (e.g. "MOCK:KYC") to base screenshots so the TEST-ONLY
// mock engine knows which transcription to script. Harmless PNG metadata for the
// real engines (they ignore it; live OCR reads the pixels).
//
// Usage: node tests/fixtures/inject-markers.mjs <in.png> <out.png> <marker>
import fs from 'node:fs';
import zlib from 'node:zlib';

const [,, inPath, outPath, marker] = process.argv;
if (!inPath || !outPath || !marker) {
  console.error('Usage: node tests/fixtures/inject-markers.mjs <in.png> <out.png> <marker>');
  process.exit(1);
}

const buf = fs.readFileSync(inPath);
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (buf.subarray(0, 8).toString('hex') !== sig.toString('hex')) {
  console.error('Not a PNG');
  process.exit(1);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const textData = Buffer.concat([Buffer.from('Comment', 'latin1'), Buffer.from([0]), Buffer.from(marker, 'utf8')]);
const markerChunk = chunk('tEXt', textData);

// Find IEND and insert the marker chunk before it.
let off = 8;
let insertAt = -1;
while (off + 8 <= buf.length) {
  const type = buf.subarray(off + 4, off + 8).toString('latin1');
  if (type === 'IEND') { insertAt = off; break; }
  const len = buf.readUInt32BE(off);
  off += 12 + len;
}
if (insertAt === -1) {
  console.error('IEND not found');
  process.exit(1);
}

const out = Buffer.concat([buf.subarray(0, insertAt), markerChunk, buf.subarray(insertAt)]);
fs.writeFileSync(outPath, out);
console.log(outPath + ' <- marker "' + marker + '" (' + out.length + ' bytes)');
