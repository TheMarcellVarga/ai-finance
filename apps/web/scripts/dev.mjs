import { accessSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const appRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const nextBin = join(appRoot, "node_modules", "next", "dist", "bin", "next");
const wasmBindingsDir = join(appRoot, "node_modules", "@next", "swc-wasm-nodejs");
const preferredNodeBinary = fileExists("/opt/homebrew/bin/node")
  ? "/opt/homebrew/bin/node"
  : fileExists("/usr/local/bin/node")
    ? "/usr/local/bin/node"
    : process.execPath;

function fileExists(path) {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

function ensureLightningCssBinary() {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    return;
  }

  const source = join(appRoot, "node_modules", "lightningcss-darwin-arm64", "lightningcss.darwin-arm64.node");
  const target = join(appRoot, "node_modules", "lightningcss", "lightningcss.darwin-arm64.node");

  if (!fileExists(source)) {
    throw new Error(`Missing lightningcss binary package at ${source}`);
  }

  if (!fileExists(target)) {
    copyFileSync(source, target);
  }
}

function patchLightningCssLoader() {
  const loaderPath = join(appRoot, "node_modules", "lightningcss", "node", "index.js");
  if (!fileExists(loaderPath)) {
    throw new Error(`Missing lightningcss loader at ${loaderPath}`);
  }

  const original = readFileSync(loaderPath, "utf8");
  const patched = original.replace(
    "try {\n  native = require(`lightningcss-${parts.join('-')}`);\n} catch (err) {\n  native = require(`../lightningcss.${parts.join('-')}.node`);\n}",
    "try {\n  native = require(`../lightningcss.${parts.join('-')}.node`);\n} catch (err) {\n  native = require(`lightningcss-${parts.join('-')}`);\n}",
  );

  if (patched !== original) {
    writeFileSync(loaderPath, patched);
  }
}

if (!existsSync(nextBin)) {
  throw new Error(`Missing Next.js binary at ${nextBin}. Run npm install first.`);
}

ensureLightningCssBinary();
patchLightningCssLoader();

const args = process.argv.slice(2);
const child = spawn(preferredNodeBinary, [nextBin, "dev", "--webpack", ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TEST_WASM_DIR: wasmBindingsDir,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
