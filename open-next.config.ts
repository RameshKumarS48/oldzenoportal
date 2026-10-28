import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every page is prerendered from mock data and never revalidated, so serve the
// built HTML straight from Workers static assets. Without a cache the worker
// re-rendered each "static" page on every request (200+ ms CPU), which hit
// Cloudflare's CPU limit (error 1102).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
