import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing expected source file: ${src}`);
  }
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

// 1. Copy local Three.js Draco & Meshopt decoders into public/decoders/
const dracoSrc = path.join(root, 'node_modules/three/examples/jsm/libs/draco/gltf');
const dracoDst = path.join(root, 'public/decoders/draco');
for (const file of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  copyIfExists(path.join(dracoSrc, file), path.join(dracoDst, file));
}

const meshoptSrc = path.join(root, 'node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
const meshoptDst = path.join(root, 'public/decoders/meshopt_decoder.module.js');
copyIfExists(meshoptSrc, meshoptDst);

// 2. Copy local Cyrillic & Latin WOFF2 fonts into src/assets/fonts/ (subpath-safe Vite bundling) & public/fonts/
const fontsDst = path.join(root, 'src/assets/fonts');
const publicFontsDst = path.join(root, 'public/fonts');
ensureDir(fontsDst);
ensureDir(publicFontsDst);

const cormorantDir = path.join(root, 'node_modules/@fontsource/cormorant-garamond/files');
const manropeDir = path.join(root, 'node_modules/@fontsource/manrope/files');

const fontFiles = [
  // Cormorant Garamond (editorial serif, Cyrillic + Latin)
  [cormorantDir, 'cormorant-garamond-cyrillic-300-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-cyrillic-400-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-cyrillic-400-italic.woff2'],
  [cormorantDir, 'cormorant-garamond-cyrillic-500-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-cyrillic-600-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-latin-300-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-latin-400-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-latin-400-italic.woff2'],
  [cormorantDir, 'cormorant-garamond-latin-500-normal.woff2'],
  [cormorantDir, 'cormorant-garamond-latin-600-normal.woff2'],
  // Manrope (clean editorial sans, Cyrillic + Latin)
  [manropeDir, 'manrope-cyrillic-300-normal.woff2'],
  [manropeDir, 'manrope-cyrillic-400-normal.woff2'],
  [manropeDir, 'manrope-cyrillic-500-normal.woff2'],
  [manropeDir, 'manrope-cyrillic-600-normal.woff2'],
  [manropeDir, 'manrope-latin-300-normal.woff2'],
  [manropeDir, 'manrope-latin-400-normal.woff2'],
  [manropeDir, 'manrope-latin-500-normal.woff2'],
  [manropeDir, 'manrope-latin-600-normal.woff2'],
];

for (const [dir, file] of fontFiles) {
  copyIfExists(path.join(dir, file), path.join(fontsDst, file));
  copyIfExists(path.join(dir, file), path.join(publicFontsDst, file));
}

console.log('Local decoders and WOFF2 fonts copied into public/.');
