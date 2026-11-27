/**
 * Generates a realistically sculpted, multi-layered 3D Garden Peony-Rose GLB model
 * with Draco compression, PBR sheen materials, vertex color gradients, golden stamen
 * cluster, calyx sepals, curved stem, and 6 independently named animated leaf nodes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression, KHRMaterialsSheen } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const GOLDEN_ANGLE = 2.399963229728653;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

/** Convert intuitive sRGB [0..1] color to glTF linear RGB [0..1] for accurate PBR shading */
function toLinearRGB(c) {
  return [Math.pow(clamp(c[0], 0, 1), 2.2), Math.pow(clamp(c[1], 0, 1), 2.2), Math.pow(clamp(c[2], 0, 1), 2.2)];
}

function normalize3(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function computeSmoothNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];

    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;

    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
    normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
    normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const [nx, ny, nz] = normalize3(normals[i], normals[i + 1], normals[i + 2]);
    normals[i] = nx;
    normals[i + 1] = ny;
    normals[i + 2] = nz;
  }
  return normals;
}

function appendGeometry(target, geom, transformFn) {
  const baseVertex = target.positions.length / 3;
  for (let i = 0; i < geom.positions.length; i += 3) {
    const [x, y, z] = transformFn(geom.positions[i], geom.positions[i + 1], geom.positions[i + 2]);
    target.positions.push(x, y, z);
  }
  for (let i = 0; i < geom.uvs.length; i++) {
    target.uvs.push(geom.uvs[i]);
  }
  for (let i = 0; i < geom.colors.length; i++) {
    target.colors.push(geom.colors[i]);
  }
  for (let i = 0; i < geom.indices.length; i++) {
    target.indices.push(geom.indices[i] + baseVertex);
  }
}

/**
 * Builds a single organic double-curved peony/rose petal with ruffled edge and vertex colors.
 */
function buildPetalMeshData({
  length,
  width,
  cupDepth,
  curlOut,
  ruffleAmp,
  ruffleFreq,
  seed,
  baseColor,
  midColor,
  tipColor,
  uSegs = 14,
  vSegs = 16,
}) {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs; // 0 at base, 1 at tip
    // Teardrop / broad peony petal silhouette with gentle heart notch at top
    const widthProfile = Math.sin(Math.pow(v, 0.72) * Math.PI) * (0.28 + 0.85 * Math.pow(v, 0.35));
    const topNotch = v > 0.78 ? Math.pow((v - 0.78) / 0.22, 2) * 0.09 : 0;

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs; // 0..1 across width
      const s = u * 2 - 1; // -1..1

      const halfW = width * 0.5 * widthProfile;
      const x = s * halfW;

      // Vertical length with gentle center cleft at tip
      const notchOffset = Math.exp(-s * s * 10) * topNotch * length;
      const y = v * length - notchOffset;

      // Cross-sectional cupping + longitudinal outward reflex curl + organic edge ruffling
      const cup = (1 - s * s) * cupDepth * Math.sin(v * Math.PI * 0.92);
      const reflex = Math.pow(v, 2.2) * curlOut;
      const edgeFactor = Math.pow(v, 1.45) * (0.35 + 0.65 * Math.abs(s));
      const ruffle =
        Math.sin(s * ruffleFreq + seed) * ruffleAmp * edgeFactor +
        Math.cos(v * 7.0 + s * 4.5 + seed * 1.7) * (ruffleAmp * 0.35) * edgeFactor;

      // Subtle petal vein ribbing
      const veins = Math.cos(s * Math.PI * 7.0) * 0.004 * Math.sin(v * Math.PI);

      const z = cup - reflex + ruffle + veins;

      positions.push(x, y, z);
      uvs.push(u, v);

      // Rich botanical gradient: warm cream-blush base -> lush peony rose mid -> luminous ivory-pink edge
      let c;
      if (v < 0.45) {
        c = mixColor(baseColor, midColor, v / 0.45);
      } else {
        c = mixColor(midColor, tipColor, (v - 0.45) / 0.55);
      }
      // Slight luminous edge highlight (convert from sRGB to glTF linear RGB)
      const rimGlow = Math.pow(Math.abs(s), 2.2) * 0.05 * v;
      const lin = toLinearRGB([
        c[0] + rimGlow,
        c[1] + rimGlow * 0.92,
        c[2] + rimGlow * 0.95,
      ]);
      colors.push(lin[0], lin[1], lin[2]);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + 1;
      const c = a + (uSegs + 1);
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  return { positions, uvs, colors, indices };
}

/**
 * Builds a realistic sculpted botanical rose/peony leaf centered at its petiole origin (0,0,0)
 * so rotating the leaf node naturally sways it from the stem attachment point.
 */
function buildLeafMeshData({ length = 0.82, width = 0.42, arch = 0.14, twist = 0.06 }) {
  const uSegs = 12;
  const vSegs = 18;
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  const stemGreen = [0.13, 0.27, 0.17];
  const deepEmerald = [0.10, 0.24, 0.16];
  const sageTip = [0.22, 0.37, 0.24];
  const veinHighlight = [0.26, 0.40, 0.25];

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs;
    // Ovate leaf silhouette with delicate botanical serration along margins
    const baseProfile = Math.sin(Math.pow(v, 0.82) * Math.PI);
    const serration = v > 0.14 && v < 0.94 ? 1 + 0.055 * Math.sin(v * Math.PI * 16) : 1;
    const widthAtV = width * 0.5 * baseProfile * serration;

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const s = u * 2 - 1;

      const x = s * widthAtV;
      // Leaf extends along +Z (outward from stem) and slightly upward then gracefully arching down
      const z = v * length;
      const midribFold = Math.abs(s) * 0.045 * Math.sin(v * Math.PI);
      const lateralVein = Math.sin((v * 9.0 - Math.abs(s) * 2.4) * Math.PI) * 0.005 * Math.sin(v * Math.PI);
      const y = Math.sin(v * Math.PI * 0.85) * arch - Math.pow(v, 2.3) * (arch * 0.85) + midribFold + lateralVein;

      // Subtle natural twist
      const angle = twist * v;
      const rx = x * Math.cos(angle) - y * Math.sin(angle);
      const ry = x * Math.sin(angle) + y * Math.cos(angle);

      positions.push(rx, ry, z);
      uvs.push(u, v);

      let col = v < 0.5 ? mixColor(stemGreen, deepEmerald, v * 2) : mixColor(deepEmerald, sageTip, (v - 0.5) * 2);
      const centerVein = Math.exp(-s * s * 45) * (1 - v * 0.4);
      col = mixColor(col, veinHighlight, centerVein * 0.55);
      // Warm reddish-bronze botanical margin hint like garden rose leaves (converted to glTF linear RGB)
      const edgeTint = Math.pow(Math.abs(s), 4) * 0.16 * Math.sin(v * Math.PI);
      const linLeaf = toLinearRGB([
        col[0] + edgeTint * 0.45,
        col[1] - edgeTint * 0.12,
        col[2] - edgeTint * 0.12,
      ]);
      colors.push(linLeaf[0], linLeaf[1], linLeaf[2]);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + 1;
      const c = a + (uSegs + 1);
      const d = c + 1;
      indices.push(a, d, b, a, c, d);
    }
  }

  return { positions, uvs, colors, indices };
}

/**
 * Builds a gently curved tube (for stem or stamen filaments).
 */
function buildTube({
  points,
  radiusStart,
  radiusEnd,
  radialSegs = 12,
  colorStart,
  colorEnd,
}) {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i < points.length; i++) {
    const t = i / (points.length - 1);
    const p = points[i];
    const pPrev = points[Math.max(0, i - 1)];
    const pNext = points[Math.min(points.length - 1, i + 1)];
    const tang = normalize3(pNext[0] - pPrev[0], pNext[1] - pPrev[1], pNext[2] - pPrev[2]);

    // Build orthonormal frame
    const up = Math.abs(tang[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
    const side = normalize3(
      tang[1] * up[2] - tang[2] * up[1],
      tang[2] * up[0] - tang[0] * up[2],
      tang[0] * up[1] - tang[1] * up[0]
    );
    const binorm = normalize3(
      tang[1] * side[2] - tang[2] * side[1],
      tang[2] * side[0] - tang[0] * side[2],
      tang[0] * side[1] - tang[1] * side[0]
    );

    const r = lerp(radiusStart, radiusEnd, t);
    const col = toLinearRGB(mixColor(colorStart, colorEnd, t));

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const x = p[0] + (side[0] * cosT + binorm[0] * sinT) * r;
      const y = p[1] + (side[1] * cosT + binorm[1] * sinT) * r;
      const z = p[2] + (side[2] * cosT + binorm[2] * sinT) * r;

      positions.push(x, y, z);
      uvs.push(u, t);
      colors.push(col[0], col[1], col[2]);
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j;
      const b = a + 1;
      const c = a + (radialSegs + 1);
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  return { positions, uvs, colors, indices };
}

function buildSphere(cx, cy, cz, rx, ry, rz, color, segW = 8, segH = 6) {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  for (let iy = 0; iy <= segH; iy++) {
    const v = iy / segH;
    const phi = v * Math.PI;
    for (let ix = 0; ix <= segW; ix++) {
      const u = ix / segW;
      const theta = u * Math.PI * 2;
      const x = cx + Math.sin(phi) * Math.cos(theta) * rx;
      const y = cy + Math.cos(phi) * ry;
      const z = cz + Math.sin(phi) * Math.sin(theta) * rz;
      positions.push(x, y, z);
      uvs.push(u, v);
      const linS = toLinearRGB(color);
      colors.push(linS[0], linS[1], linS[2]);
    }
  }

  for (let iy = 0; iy < segH; iy++) {
    for (let ix = 0; ix < segW; ix++) {
      const a = iy * (segW + 1) + ix;
      const b = a + 1;
      const c = a + (segW + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return { positions, uvs, colors, indices };
}

function createPrimitiveFromData(doc, buffer, data, material) {
  const posArr = new Float32Array(data.positions);
  const idxArr = new Uint32Array(data.indices);
  const normArr = computeSmoothNormals(posArr, idxArr);
  const uvArr = new Float32Array(data.uvs);
  const colArr = new Float32Array(data.colors);

  const posAcc = doc.createAccessor().setType('VEC3').setArray(posArr).setBuffer(buffer);
  const normAcc = doc.createAccessor().setType('VEC3').setArray(normArr).setBuffer(buffer);
  const uvAcc = doc.createAccessor().setType('VEC2').setArray(uvArr).setBuffer(buffer);
  const colAcc = doc.createAccessor().setType('VEC3').setArray(colArr).setBuffer(buffer);
  const idxAcc = doc.createAccessor().setType('SCALAR').setArray(idxArr).setBuffer(buffer);

  return doc
    .createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('COLOR_0', colAcc)
    .setIndices(idxAcc)
    .setMaterial(material);
}

async function generateFlowerGLB() {
  const doc = new Document();
  const buffer = doc.createBuffer();

  // Enable Draco compression + PBR Sheen extension for velvety rose/peony petals
  const dracoExt = doc.createExtension(KHRDracoMeshCompression).setRequired(true);
  dracoExt.setEncoderOptions({
    method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
    encodeSpeed: 5,
    decodeSpeed: 5,
    quantizationVolume: 'MESH',
  });
  const sheenExt = doc.createExtension(KHRMaterialsSheen);

  // Materials
  const petalSheen = sheenExt
    .createSheen()
    .setSheenColorFactor([1.0, 0.92, 0.94])
    .setSheenRoughnessFactor(0.42);

  const petalMaterial = doc
    .createMaterial('PeonyRosePetal')
    .setBaseColorFactor([1.0, 1.0, 1.0, 1.0])
    .setRoughnessFactor(0.46)
    .setMetallicFactor(0.0)
    .setDoubleSided(true)
    .setExtension('KHR_materials_sheen', petalSheen);

  const stamenMaterial = doc
    .createMaterial('GoldenStamen')
    .setBaseColorFactor([1.0, 1.0, 1.0, 1.0])
    .setRoughnessFactor(0.42)
    .setMetallicFactor(0.05)
    .setEmissiveFactor([0.16, 0.11, 0.03]);

  const foliageSheen = sheenExt
    .createSheen()
    .setSheenColorFactor([0.55, 0.72, 0.58])
    .setSheenRoughnessFactor(0.55);

  const foliageMaterial = doc
    .createMaterial('BotanicalFoliage')
    .setBaseColorFactor([1.0, 1.0, 1.0, 1.0])
    .setRoughnessFactor(0.38)
    .setMetallicFactor(0.02)
    .setDoubleSided(true)
    .setExtension('KHR_materials_sheen', foliageSheen);

  const scene = doc.createScene('FloralGroveHero');
  const rootNode = doc.createNode('PeonyRoseRoot');
  scene.addChild(rootNode);

  // -------------------------------------------------------
  // 1. BLOOM PETALS: 62 layered phyllotaxis petals (inner rosebud core -> lush peony outer bowl)
  // -------------------------------------------------------
  const petalsData = { positions: [], uvs: [], colors: [], indices: [] };
  const totalPetals = 62;

  for (let i = 0; i < totalPetals; i++) {
    const t = i / (totalPetals - 1); // 0 = innermost bud, 1 = outermost lush skirt
    const azimuth = i * GOLDEN_ANGLE + Math.sin(i * 1.7) * 0.06;

    // Gradual outward radial offset and gentle bowl elevation
    const radius = 0.045 + Math.pow(t, 1.18) * 0.44;
    const baseY = 0.25 + (1 - t) * 0.12 - Math.pow(t, 1.8) * 0.16;

    // Tilt from tightly cupped center (0.25 rad) to generously open outer peony petals (1.36 rad)
    const tilt = lerp(0.24, 1.38, Math.pow(t, 0.86)) + Math.sin(i * 2.3) * 0.04;

    const length = lerp(0.46, 1.02, Math.pow(t, 0.65));
    const width = lerp(0.36, 0.96, Math.pow(t, 0.7));
    const cupDepth = lerp(0.18, 0.24, Math.sin(t * Math.PI)) * (1 - t * 0.25);
    const curlOut = lerp(-0.04, 0.26, Math.pow(t, 1.35));
    const ruffleAmp = lerp(0.018, 0.058, t);
    const ruffleFreq = 3.2 + (i % 5) * 0.65;

    // Lush Max&Jane daylight peony-rose color choreography (in sRGB, converted to linear in buildPetalMeshData):
    // Inner core: deep velvety rose-peony blush heart
    // Mid layers: luminous garden peony pink
    // Outer petals: airy powder-blush ivory silk
    const baseColor = mixColor([0.74, 0.28, 0.42], [0.85, 0.48, 0.58], t);
    const midColor = mixColor([0.87, 0.48, 0.60], [0.95, 0.72, 0.78], Math.pow(t, 0.8));
    const tipColor = mixColor([0.96, 0.76, 0.82], [0.99, 0.90, 0.92], Math.pow(t, 0.7));

    const petal = buildPetalMeshData({
      length,
      width,
      cupDepth,
      curlOut,
      ruffleAmp,
      ruffleFreq,
      seed: i * 1.31,
      baseColor,
      midColor,
      tipColor,
      uSegs: 12,
      vSegs: 14,
    });

    const cosA = Math.cos(azimuth);
    const sinA = Math.sin(azimuth);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    appendGeometry(petalsData, petal, (lx, ly, lz) => {
      // Tilt around local X so petal opens outward toward +Z
      const ty = ly * cosT - lz * sinT;
      const tz = ly * sinT + lz * cosT + radius;
      const tx = lx;
      // Rotate around global Y by azimuth
      const gx = tx * cosA + tz * sinA;
      const gz = -tx * sinA + tz * cosA;
      const gy = ty + baseY;
      return [gx, gy, gz];
    });
  }

  const bloomMesh = doc
    .createMesh('BloomPetalsMesh')
    .addPrimitive(createPrimitiveFromData(doc, buffer, petalsData, petalMaterial));
  const bloomNode = doc.createNode('BloomPetals').setMesh(bloomMesh);
  rootNode.addChild(bloomNode);

  // -------------------------------------------------------
  // 2. GOLDEN STAMEN CLUSTER & WARM HEART
  // -------------------------------------------------------
  const stamenData = { positions: [], uvs: [], colors: [], indices: [] };
  const centerDome = buildSphere(0, 0.34, 0, 0.11, 0.08, 0.11, [0.94, 0.78, 0.38], 10, 8);
  appendGeometry(stamenData, centerDome, (x, y, z) => [x, y, z]);

  const stamenCount = 34;
  for (let i = 0; i < stamenCount; i++) {
    const angle = i * GOLDEN_ANGLE;
    const r0 = 0.03 + (i / stamenCount) * 0.095;
    const r1 = r0 + 0.05 + (i % 3) * 0.018;
    const h = 0.18 + (i % 4) * 0.024;
    const p0 = [Math.cos(angle) * r0, 0.32, Math.sin(angle) * r0];
    const p1 = [Math.cos(angle) * (r0 + r1) * 0.5, 0.32 + h * 0.58, Math.sin(angle) * (r0 + r1) * 0.5];
    const p2 = [Math.cos(angle) * r1, 0.32 + h, Math.sin(angle) * r1];

    const filament = buildTube({
      points: [p0, p1, p2],
      radiusStart: 0.008,
      radiusEnd: 0.005,
      radialSegs: 5,
      colorStart: [0.96, 0.85, 0.55],
      colorEnd: [0.98, 0.78, 0.32],
    });
    appendGeometry(stamenData, filament, (x, y, z) => [x, y, z]);

    const anther = buildSphere(p2[0], p2[1], p2[2], 0.017, 0.013, 0.017, [0.96, 0.72, 0.24], 6, 5);
    appendGeometry(stamenData, anther, (x, y, z) => [x, y, z]);
  }

  const stamenMesh = doc
    .createMesh('GoldenStamenMesh')
    .addPrimitive(createPrimitiveFromData(doc, buffer, stamenData, stamenMaterial));
  rootNode.addChild(doc.createNode('GoldenStamen').setMesh(stamenMesh));

  // -------------------------------------------------------
  // 3. CALYX SEPALS + GRACEFUL BOTANICAL STEM
  // -------------------------------------------------------
  const stemCalyxData = { positions: [], uvs: [], colors: [], indices: [] };

  // Receptacle cup directly under petals
  const receptacle = buildSphere(0, 0.14, 0, 0.24, 0.15, 0.24, [0.16, 0.31, 0.19], 14, 10);
  appendGeometry(stemCalyxData, receptacle, (x, y, z) => [x, y, z]);

  // 7 sculpted calyx sepals cradling the underside of the peony
  for (let i = 0; i < 7; i++) {
    const azimuth = (i / 7) * Math.PI * 2 + 0.3;
    const sepal = buildPetalMeshData({
      length: 0.56,
      width: 0.24,
      cupDepth: 0.05,
      curlOut: 0.16,
      ruffleAmp: 0.01,
      ruffleFreq: 2.0,
      seed: i * 2.1,
      baseColor: [0.14, 0.28, 0.17],
      midColor: [0.17, 0.34, 0.20],
      tipColor: [0.24, 0.40, 0.23],
      uSegs: 6,
      vSegs: 8,
    });
    const tilt = 1.68;
    const cosA = Math.cos(azimuth);
    const sinA = Math.sin(azimuth);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    appendGeometry(stemCalyxData, sepal, (lx, ly, lz) => {
      const ty = ly * cosT - lz * sinT;
      const tz = ly * sinT + lz * cosT + 0.16;
      const gx = lx * cosA + tz * sinA;
      const gz = -lx * sinA + tz * cosA;
      return [gx, ty + 0.16, gz];
    });
  }

  // Graceful S-curved stem descending downward
  const stemPoints = [];
  const stemSegs = 20;
  for (let i = 0; i <= stemSegs; i++) {
    const t = i / stemSegs;
    const y = lerp(0.12, -1.65, t);
    const x = Math.sin(t * Math.PI * 1.1) * 0.11;
    const z = Math.cos(t * Math.PI * 0.9) * 0.06 - 0.06;
    stemPoints.push([x, y, z]);
  }
  const stemTube = buildTube({
    points: stemPoints,
    radiusStart: 0.068,
    radiusEnd: 0.044,
    radialSegs: 12,
    colorStart: [0.16, 0.31, 0.19],
    colorEnd: [0.11, 0.23, 0.15],
  });
  appendGeometry(stemCalyxData, stemTube, (x, y, z) => [x, y, z]);

  const stemMesh = doc
    .createMesh('StemCalyxMesh')
    .addPrimitive(createPrimitiveFromData(doc, buffer, stemCalyxData, foliageMaterial));
  rootNode.addChild(doc.createNode('StemCalyx').setMesh(stemMesh));

  // -------------------------------------------------------
  // 4. 6 INDEPENDENT ANIMATED LEAF NODES (Leaf_0 .. Leaf_5)
  // -------------------------------------------------------
  const leafConfigs = [
    { tStem: 0.24, yaw: 0.45, pitch: -0.22, roll: 0.08, length: 0.88, width: 0.44, arch: 0.16 },
    { tStem: 0.32, yaw: 2.55, pitch: -0.18, roll: -0.10, length: 0.82, width: 0.42, arch: 0.15 },
    { tStem: 0.44, yaw: 4.55, pitch: -0.26, roll: 0.07, length: 0.92, width: 0.46, arch: 0.17 },
    { tStem: 0.56, yaw: 1.25, pitch: -0.32, roll: -0.09, length: 0.78, width: 0.38, arch: 0.14 },
    { tStem: 0.68, yaw: 3.45, pitch: -0.34, roll: 0.11, length: 0.84, width: 0.41, arch: 0.15 },
    { tStem: 0.79, yaw: 5.55, pitch: -0.28, roll: -0.06, length: 0.72, width: 0.35, arch: 0.12 },
  ];

  leafConfigs.forEach((cfg, idx) => {
    const stemIdx = Math.round(cfg.tStem * stemSegs);
    const anchor = stemPoints[stemIdx];

    // Compound leaflet triad (main leaf + two smaller side leaflets) for authentic botanical fullness
    const compoundLeaf = { positions: [], uvs: [], colors: [], indices: [] };

    // Short petiole stem
    const petiole = buildTube({
      points: [
        [0, 0, 0],
        [0, 0.02, 0.12],
        [0, 0.03, 0.24],
      ],
      radiusStart: 0.02,
      radiusEnd: 0.012,
      radialSegs: 6,
      colorStart: [0.14, 0.28, 0.17],
      colorEnd: [0.17, 0.32, 0.19],
    });
    appendGeometry(compoundLeaf, petiole, (x, y, z) => [x, y, z]);

    // Main terminal leaf
    const mainLeaf = buildLeafMeshData({
      length: cfg.length,
      width: cfg.width,
      arch: cfg.arch,
      twist: idx % 2 === 0 ? 0.08 : -0.08,
    });
    appendGeometry(compoundLeaf, mainLeaf, (x, y, z) => [x, y + 0.025, z + 0.2]);

    // Left and right flanking leaflets
    for (const side of [-1, 1]) {
      const sideLeaf = buildLeafMeshData({
        length: cfg.length * 0.58,
        width: cfg.width * 0.56,
        arch: cfg.arch * 0.72,
        twist: side * 0.12,
      });
      const ang = side * 0.92;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      appendGeometry(compoundLeaf, sideLeaf, (x, y, z) => {
        const rx = x * ca + z * sa;
        const rz = -x * sa + z * ca;
        return [rx, y + 0.018, rz + 0.14];
      });
    }

    const leafMesh = doc
      .createMesh(`LeafMesh_${idx}`)
      .addPrimitive(createPrimitiveFromData(doc, buffer, compoundLeaf, foliageMaterial));

    // Convert Euler XYZ -> quaternion for glTF node rotation
    const cy = Math.cos(cfg.yaw * 0.5), sy = Math.sin(cfg.yaw * 0.5);
    const cp = Math.cos(cfg.pitch * 0.5), sp = Math.sin(cfg.pitch * 0.5);
    const cr = Math.cos(cfg.roll * 0.5), sr = Math.sin(cfg.roll * 0.5);
    // YXZ order
    const qw = cy * cp * cr + sy * sp * sr;
    const qx = cy * sp * cr + sy * cp * sr;
    const qy = sy * cp * cr - cy * sp * sr;
    const qz = cy * cp * sr - sy * sp * cr;

    const leafNode = doc
      .createNode(`Leaf_${idx}`)
      .setMesh(leafMesh)
      .setTranslation([anchor[0], anchor[1], anchor[2]])
      .setRotation([qx, qy, qz, qw]);

    rootNode.addChild(leafNode);
  });

  // Write Draco-compressed GLB
  const outDir = path.join(process.cwd(), 'public/models');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'peony-rose.glb');

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression, KHRMaterialsSheen])
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  await io.write(outPath, doc);
  const stats = fs.statSync(outPath);
  console.log(`Generated Draco-compressed 3D Peony-Rose GLB: ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

generateFlowerGLB().catch((err) => {
  console.error(err);
  process.exit(1);
});
