import { createServer } from "vite";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const front = fileURLToPath(new URL("../", import.meta.url));
const docs = new URL("../../docs/src/", import.meta.url);
const examples = Object.fromEntries(
  await Promise.all(
    (await readdir(new URL("examples/", docs)))
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => [
        name.replace(/\.json$/, ""),
        JSON.parse(await readFile(new URL(`examples/${name}`, docs), "utf8")),
      ]),
  ),
);
const server = await createServer({
  root: front,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { renderMessages } = await server.ssrLoadModule(
    "/scripts/render-doc-messages.tsx",
  );
  await mkdir(new URL("generated/", docs), { recursive: true });
  await writeFile(
    new URL("generated/messages.json", docs),
    JSON.stringify(await renderMessages(examples)),
  );
  const styles = await Promise.all(
    ["message", "markdown", "embeds", "canvas"].map((name) =>
      readFile(
        new URL(`../src/features/editor/styles/${name}.css`, import.meta.url),
        "utf8",
      ),
    ),
  );
  const css = postcss.parse(styles.join("\n"));
  css.walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name.endsWith("keyframes"))
      return;
    rule.selectors = rule.selectors.map(
      (selector) => `.message-example ${selector}`,
    );
  });
  await writeFile(new URL("generated/messages.css", docs), css.toString());
} finally {
  await server.close();
}
