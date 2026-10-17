import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { memo, type ReactNode } from "react";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);

const aliases: Record<string, string> = {
  html: "xml",
  js: "javascript",
  py: "python",
  sh: "bash",
  ts: "typescript",
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  shell: "bash",
};

/** Render only the text and span tokens produced by highlight.js, never source HTML. */
export default memo(function HighlightedCode({
  language,
  source,
}: Readonly<{ language?: string; source: string }>) {
  const tag = language?.toLowerCase();
  const selected = tag && (aliases[tag] ?? tag);
  if (
    !selected ||
    !hljs.getLanguage(selected) ||
    typeof DOMParser === "undefined"
  )
    return <code>{source}</code>;

  const marked = hljs.highlight(source, { language: selected }).value;
  const parsed = new DOMParser().parseFromString(marked, "text/html");
  const render = (node: ChildNode, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element) || node.tagName !== "SPAN")
      return node.textContent;
    const tokens = [...node.classList].filter((name) =>
      /^hljs-[a-z_-]+$/.test(name),
    );
    return (
      <span className={tokens.join(" ")} key={key}>
        {Array.from(node.childNodes, render)}
      </span>
    );
  };
  return <code>{Array.from(parsed.body.childNodes, render)}</code>;
});
