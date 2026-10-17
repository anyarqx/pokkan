import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve("dist");
const files = (await readdir(root, { recursive: true })).filter((file) =>
  file.endsWith(".html"),
);
const failures = [];
let checked = 0;
for (const file of files) {
  const html = await readFile(join(root, file), "utf8");
  const page = new URL(
    file.replace(/index\.html$/, ""),
    "https://docs.pokkan.net/",
  );
  for (const [, attribute, raw] of html.matchAll(
    /\b(href|src|srcset)="([^"]+)"/g,
  )) {
    const candidates =
      attribute === "srcset"
        ? raw.split(",").map((entry) => entry.trim().split(/\s+/)[0])
        : [raw];
    for (const candidate of candidates) {
      const url = new URL(candidate.replaceAll("&amp;", "&"), page);
      if (url.origin !== page.origin) continue;
      const path = join(root, decodeURIComponent(url.pathname));
      let target;
      try {
        target = (await stat(path)).isDirectory()
          ? join(path, "index.html")
          : path;
        await stat(target);
      } catch {
        failures.push(`${file}: missing ${attribute} ${url.pathname}`);
        continue;
      }
      if (attribute === "href" && url.hash && target.endsWith(".html")) {
        const content =
          target === join(root, file) ? html : await readFile(target, "utf8");
        if (!content.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))
          failures.push(`${file}: missing anchor ${url.href}`);
      }
      checked++;
    }
  }
  if (file !== "index.html" && file !== "404.html") {
    const canonicals = [...html.matchAll(/<link[^>]+rel="canonical"[^>]*>/g)];
    if (canonicals.length !== 1)
      failures.push(`${file}: expected one canonical`);
  }
}
const sitemap = await readFile(join(root, "sitemap-0.xml"), "utf8");
for (const [, url] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const file = join(root, new URL(url).pathname, "index.html");
  const html = await readFile(file, "utf8");
  if (/<meta[^>]+name="robots"[^>]+noindex/.test(html))
    failures.push(`${url}: noindex page in sitemap`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `${files.length} HTML pages; ${checked} internal links/assets verified; canonical and sitemap checks passed.`,
  );
