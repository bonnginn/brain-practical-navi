import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
export const PIAL_MESH_LOGICAL_NAMES = Object.freeze(["pial-left", "pial-right"]);
export const PIAL_MESH_SOURCE_NAMES = Object.freeze(PIAL_MESH_LOGICAL_NAMES.map(name => `${name}.mesh`));
export const PIAL_MESH_SIDECAR_NAMES = Object.freeze(PIAL_MESH_LOGICAL_NAMES.map(name => `${name}.mesh.gz`));
const GZIP_HEADER = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x03]);

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(payload) {
  let value = 0xffffffff;
  for (const byte of payload) value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

/**
 * Produce a byte-for-byte stable gzip stream: fixed header, maximum zlib
 * compression, and a standard CRC32/ISIZE trailer.
 */
export function deterministicGzip(payload) {
  const source = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const compressed = deflateRawSync(source, { level: 9 });
  const trailer = Buffer.allocUnsafe(8);
  trailer.writeUInt32LE(crc32(source), 0);
  trailer.writeUInt32LE(source.length >>> 0, 4);
  return Buffer.concat([GZIP_HEADER, compressed, trailer]);
}

export function sha256(payload) {
  return createHash("sha256").update(payload).digest("hex");
}

export function generatePialMeshSidecars({ atlasRoot = resolve(SCRIPT_DIRECTORY, "../public/atlas"), write = true } = {}) {
  return PIAL_MESH_LOGICAL_NAMES.map(logicalName => {
    const sourceName = `${logicalName}.mesh`;
    const sidecarName = `${logicalName}.mesh.gz`;
    const sourcePath = join(atlasRoot, sourceName);
    const sidecarPath = join(atlasRoot, sidecarName);
    const raw = readFileSync(sourcePath);
    const compressed = deterministicGzip(raw);
    if (write) writeFileSync(sidecarPath, compressed);
    return {
      logicalName,
      sourceName,
      sidecarName,
      rawBytes: raw.byteLength,
      compressedBytes: compressed.byteLength,
      rawSha256: sha256(raw),
      compressedSha256: sha256(compressed),
      sidecarExists: statSync(sidecarPath, { throwIfNoEntry: false })?.isFile() === true,
      compressed,
    };
  });
}

function main(argv = process.argv.slice(2)) {
  const check = argv.includes("--check");
  const unexpected = argv.filter(argument => argument !== "--check");
  if (unexpected.length) throw new Error(`unknown option: ${unexpected.join(", ")}`);
  const results = generatePialMeshSidecars({ write: !check });
  for (const result of results) {
    if (check) {
      const actual = readFileSync(join(resolve(SCRIPT_DIRECTORY, "../public/atlas"), result.sidecarName));
      if (!actual.equals(result.compressed)) throw new Error(`${result.sidecarName}: sidecar is not deterministic or is stale`);
    }
    console.log(`${result.sidecarName}: ${result.rawBytes} -> ${result.compressedBytes} bytes; raw SHA-256 ${result.rawSha256}`);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(`pial mesh sidecar generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
