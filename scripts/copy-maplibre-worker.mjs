// Copies MapLibre's own web-worker bundle into /public so we can load it via a
// stable, self-hosted URL (maplibregl.setWorkerUrl). Turbopack's default worker
// resolution (a Blob that re-imports the chunk via import.meta.url) fails to
// spawn a working worker in the production build, which leaves every GeoJSON
// source stuck at 0 features (basemap renders, but no pins/clusters/heatmap).
//
// Both files are required: maplibre-gl-worker.mjs imports "./maplibre-gl-shared.mjs".
// Run automatically before every build (see package.json "prebuild"/"cf:*").

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "maplibre-gl", "dist");
const dest = join(root, "public", "vendor", "maplibre");

mkdirSync(dest, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(src, file), join(dest, file));
  console.log(`copied ${file} -> public/vendor/maplibre/`);
}
