import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const assetDirectory = new URL("../dist/assets/", import.meta.url);
const entryAssets = (await readdir(assetDirectory)).filter((name) => /^index-[\w-]+\.js$/.test(name));

if (entryAssets.length !== 1) throw new Error(`Expected one application entry bundle, found ${entryAssets.length}.`);

const entryPath = fileURLToPath(new URL(entryAssets[0], assetDirectory));
const bytes = (await stat(entryPath)).size;
const limit = 460 * 1024;

if (bytes > limit) throw new Error(`Application entry bundle is ${bytes} bytes; the budget is ${limit} bytes.`);

console.log(`Application entry bundle: ${bytes} bytes (budget: ${limit} bytes).`);
