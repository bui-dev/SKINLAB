import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

const rootPackage = readJson(join(root, "package.json"));
const adminPackage = readJson(join(root, "admin-skinlab/package.json"));
const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");

requireCondition(
  rootPackage.packageManager === "pnpm@12.18.0",
  "root packageManager must be pnpm@12.18.0",
);
requireCondition(
  adminPackage.name === "@skinlab/admin-web",
  "frontend package must be @skinlab/admin-web",
);
requireCondition(
  !("packageManager" in adminPackage),
  "frontend must not own packageManager",
);
requireCondition(
  !("prepare" in (adminPackage.scripts ?? {})),
  "frontend must not own Husky prepare",
);

for (const script of [
  "workspace:verify",
  "security:secrets",
  "lint",
  "typecheck",
  "test",
  "build",
]) {
  requireCondition(
    Boolean(rootPackage.scripts?.[script]),
    `root script missing: ${script}`,
  );
}

for (const workspacePath of ["admin-skinlab", "api-skinlab", "packages/*"]) {
  requireCondition(
    workspace.includes(`- ${workspacePath}`),
    `workspace path missing: ${workspacePath}`,
  );
}

for (const policy of [
  '"@parcel/watcher": true',
  '"@swc/core": true',
  "esbuild: true",
  '"@storybook/builder-vite@10.6.6"',
  "jsdom@31.0.0",
  "lucide-react@1.70.0",
]) {
  requireCondition(
    workspace.includes(policy),
    `pnpm policy missing: ${policy}`,
  );
}

for (const retiredPath of [
  "admin-skinlab/pnpm-workspace.yaml",
  "admin-skinlab/pnpm-lock.yaml",
]) {
  requireCondition(
    !existsSync(join(root, retiredPath)),
    `nested workspace metadata must be absent: ${retiredPath}`,
  );
}

const packagesDirectory = join(root, "packages");
for (const entry of readdirSync(packagesDirectory)) {
  const packageDirectory = join(packagesDirectory, entry);
  if (statSync(packageDirectory).isDirectory()) {
    requireCondition(
      existsSync(join(packageDirectory, "package.json")),
      `package manifest missing: packages/${entry}/package.json`,
    );
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Root pnpm workspace policy verified.");
