import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUTPUT = resolve(ROOT, "public/atlas/comparison-schematic-ventricle.mesh");
export const SCHEMATIC_FORMAT = "BNM2";
export const RING_SEGMENTS = 10;

// This is deliberately a small, disconnected teaching schematic. It is not
// sampled from a specimen, atlas volume, or existing label. Coordinates use
// the project's centred display convention: x right, y anterior, z superior.
const COMPONENTS = Object.freeze([
  {
    name: "left-lateral-ventricle",
    points: [[-18, 25, 10], [-22, 14, 10], [-23, 1, 9], [-21, -13, 6], [-16, -24, 0]],
    radius: [3.2, 2.7],
  },
  {
    name: "right-lateral-ventricle",
    points: [[18, 25, 10], [22, 14, 10], [23, 1, 9], [21, -13, 6], [16, -24, 0]],
    radius: [3.2, 2.7],
  },
  {
    name: "third-ventricle",
    points: [[0, 15, 8], [0, 8, 4], [0, 1, 0], [0, -7, -6], [0, -13, -12]],
    radius: [2.15, 1.55],
  },
]);

function length(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]) || 1;
}

function normalize(vector) {
  const size = length(vector);
  return [vector[0] / size, vector[1] / size, vector[2] / size];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(vector, value) {
  return [vector[0] * value, vector[1] * value, vector[2] * value];
}

function tangentAt(points, index) {
  if (index === 0) return normalize(subtract(points[1], points[0]));
  if (index === points.length - 1) return normalize(subtract(points[index], points[index - 1]));
  return normalize(subtract(points[index + 1], points[index - 1]));
}

function ringBasis(tangent) {
  const reference = Math.abs(tangent[2]) > 0.86 ? [0, 1, 0] : [0, 0, 1];
  const first = normalize(cross(tangent, reference));
  return [first, normalize(cross(tangent, first))];
}

function appendTube(component, vertices, normals, shade, faces) {
  const { points, radius } = component;
  const ringStarts = [];
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    const center = points[pointIndex];
    const tangent = tangentAt(points, pointIndex);
    const [first, second] = ringBasis(tangent);
    ringStarts.push(vertices.length / 3);
    for (let segment = 0; segment < RING_SEGMENTS; segment += 1) {
      const angle = (segment * Math.PI * 2) / RING_SEGMENTS;
      const radial = add(scale(first, Math.cos(angle) * radius[0]), scale(second, Math.sin(angle) * radius[1]));
      const normal = normalize(radial);
      const vertex = add(center, radial);
      // BNM stores z, y, x because the renderer converts p to anatomical
      // x, z, y. Keep the authored x/y/z points aligned with existing meshes.
      vertices.push(vertex[2], vertex[1], vertex[0]);
      normals.push(normal[2], normal[1], normal[0]);
      shade.push(0.82);
    }
  }
  for (let ring = 0; ring < ringStarts.length - 1; ring += 1) {
    const current = ringStarts[ring];
    const next = ringStarts[ring + 1];
    for (let segment = 0; segment < RING_SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % RING_SEGMENTS;
      const a = current + segment;
      const b = current + nextSegment;
      const c = next + nextSegment;
      const d = next + segment;
      faces.push(a, b, c, a, c, d);
    }
  }
  // Add deterministic end caps so each teaching component is a closed solid.
  for (const [ringIndex, direction] of [[0, -1], [ringStarts.length - 1, 1]]) {
    const center = points[ringIndex];
    const tangent = scale(tangentAt(points, ringIndex), direction);
    const centerIndex = vertices.length / 3;
    vertices.push(center[2], center[1], center[0]);
    normals.push(tangent[2], tangent[1], tangent[0]);
    shade.push(0.82);
    const ringStart = ringStarts[ringIndex];
    for (let segment = 0; segment < RING_SEGMENTS; segment += 1) {
      const nextSegment = (segment + 1) % RING_SEGMENTS;
      if (direction < 0) faces.push(centerIndex, ringStart + nextSegment, ringStart + segment);
      else faces.push(centerIndex, ringStart + segment, ringStart + nextSegment);
    }
  }
}

export function generateSchematicVentricleMesh() {
  const vertices = [];
  const normals = [];
  const shade = [];
  const faces = [];
  for (const component of COMPONENTS) appendTube(component, vertices, normals, shade, faces);
  const vertexCount = vertices.length / 3;
  const faceCount = faces.length / 3;
  const buffer = Buffer.alloc(12 + vertexCount * 3 * 4 + vertexCount * 3 * 4 + vertexCount * 4 + faceCount * 3 * 4);
  buffer.write(SCHEMATIC_FORMAT, 0, "ascii");
  buffer.writeUInt32LE(vertexCount, 4);
  buffer.writeUInt32LE(faceCount, 8);
  let offset = 12;
  for (const value of vertices) { buffer.writeFloatLE(value, offset); offset += 4; }
  for (const value of normals) { buffer.writeFloatLE(value, offset); offset += 4; }
  for (const value of shade) { buffer.writeFloatLE(value, offset); offset += 4; }
  for (const value of faces) { buffer.writeUInt32LE(value, offset); offset += 4; }
  return buffer;
}

export async function writeSchematicVentricleMesh(output = DEFAULT_OUTPUT) {
  const buffer = generateSchematicVentricleMesh();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, buffer);
  return { output, bytes: buffer.length, vertices: buffer.readUInt32LE(4), faces: buffer.readUInt32LE(8) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputFlag = process.argv.indexOf("--output");
  const output = outputFlag >= 0 ? resolve(process.argv[outputFlag + 1]) : DEFAULT_OUTPUT;
  const result = await writeSchematicVentricleMesh(output);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
