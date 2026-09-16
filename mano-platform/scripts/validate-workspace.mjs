import { access, readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "README.md", "package.json", "pnpm-workspace.yaml", "tsconfig.base.json", ".env.example",
  "docs/00-product-vision.md", "docs/01-product-requirements.md", "docs/02-architecture.md",
  "docs/03-roadmap.md", "docs/04-legacy-intake.md", "docs/legacy/inventory.md", "docs/adr/README.md",
  "apps/web/package.json", "apps/api/package.json", "apps/worker/package.json",
  "apps/web/vite.config.ts", "apps/web/wrangler.jsonc",
  "packages/contracts/package.json", "packages/editor-core/package.json",
  "packages/sync-core/package.json", "packages/ui/package.json", "packages/config/package.json",
];

for (const path of required) await access(resolve(root, path));

const manifests = [];
for (const group of ["apps", "packages"]) {
  for (const entry of await readdir(resolve(root, group), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = resolve(root, group, entry.name, "package.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    if (!manifest.name || !manifest.private) throw new Error(`${relative(root, path)} must have a name and private=true`);
    manifests.push(manifest.name);
  }
}
if (new Set(manifests).size !== manifests.length) throw new Error("Workspace package names must be unique");

const wrangler = JSON.parse(await readFile(resolve(root, "apps/web/wrangler.jsonc"), "utf8"));
if (wrangler.name !== "mano-platform" || wrangler.workers_dev !== true) {
  throw new Error("Pilot Worker must use the mano-platform name and keep workers.dev enabled");
}
if (wrangler.routes?.length !== 1 || wrangler.routes[0]?.pattern !== "next.mano.io.kr" ||
    wrangler.routes[0]?.custom_domain !== true) {
  throw new Error("Pilot Worker must expose only next.mano.io.kr as a custom domain");
}
if (wrangler.routes.some((route) => route.pattern === "mano.io.kr" || route.pattern === "*.mano.io.kr")) {
  throw new Error("Pilot Worker must not route the production mano.io.kr domain");
}

const markdownFiles = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "build", "coverage"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith(".md")) markdownFiles.push(path);
  }
}
await collect(root);
for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+\.md(?:#[^)]+)?)\)/g)) {
    const target = match[1].split("#")[0];
    if (/^[a-z]+:/i.test(target)) continue;
    await access(resolve(dirname(file), target));
  }
}

console.log(`mano-platform check passed: ${manifests.length} workspaces, ${markdownFiles.length} markdown files`);
