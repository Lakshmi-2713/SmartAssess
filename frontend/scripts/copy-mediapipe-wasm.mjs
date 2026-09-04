/**
 * Copies the MediaPipe WASM runtime out of node_modules into public/ so the
 * proctoring engine loads from our own origin instead of a CDN — school
 * networks routinely block third-party CDNs, and an exam should not depend on
 * one being reachable.
 *
 * Runs automatically after `npm install`. The copied files are git-ignored;
 * they come from the pinned @mediapipe/tasks-vision dependency.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(ROOT, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const DEST = path.join(ROOT, "public", "mediapipe-wasm");

// Only the vision fileset actually asks for these; the "module_internal"
// variants belong to a different loader and would add ~12 MB for nothing.
const NEEDED = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

if (!fs.existsSync(SRC)) {
  console.warn(
    "[mediapipe] @mediapipe/tasks-vision is not installed — skipping wasm copy.\n" +
      "            Face detection will fall back to camera-only verification."
  );
  process.exit(0);
}

fs.mkdirSync(DEST, { recursive: true });

let copied = 0;
let bytes = 0;
for (const file of NEEDED) {
  const from = path.join(SRC, file);
  if (!fs.existsSync(from)) {
    console.warn(`[mediapipe] missing ${file} in the package — skipped.`);
    continue;
  }
  const to = path.join(DEST, file);
  fs.copyFileSync(from, to);
  bytes += fs.statSync(to).size;
  copied += 1;
}

console.log(
  `[mediapipe] ${copied} runtime file(s) → public/mediapipe-wasm (${(bytes / 1024 / 1024).toFixed(1)} MB)`
);
