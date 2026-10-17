// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import HighlightedCode from "./HighlightedCode";

it.each([
  ["py", 'print("hello")'],
  ["python", 'print("hello")'],
  ["js", 'const value = "hello";'],
  ["javascript", 'console.log("hello");'],
  ["c", "#include <stdio.h>\nint main() { return 0; }"],
  ["cpp", '#include <iostream>\nint main() { std::cout << "hello"; }'],
  ["c++", '#include <iostream>\nint main() { std::cout << "hello"; }'],
  ["ts", 'const value: string = "hello";'],
  ["json", '{"value": true}'],
  ["sh", 'echo "$HOME"'],
])("highlights %s without changing the source", (language, source) => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <HighlightedCode language={language} source={source} />,
  );
  expect(host.textContent).toBe(source);
  expect(host.querySelectorAll("span").length).toBeGreaterThan(0);
});

it("highlights a known fenced language without treating source as markup", () => {
  const html = renderToStaticMarkup(
    <HighlightedCode
      language="js"
      source={'const value = "<img onerror=alert(1)>";'}
    />,
  );
  expect(html).toContain("hljs-keyword");
  expect(html).toContain("&lt;img onerror=alert(1)&gt;");
  expect(html).not.toContain("<img");
});

it("keeps unknown languages readable as plain code", () => {
  const html = renderToStaticMarkup(
    <HighlightedCode language="unknown-language" source="hello <world>" />,
  );
  expect(html).toContain("hello &lt;world&gt;");
});
