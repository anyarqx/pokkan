// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { PageMeta } from "./PageMeta";

describe("page metadata", () => {
  it("updates browser and link-preview metadata without duplicating tags", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    flushSync(() =>
      root.render(<PageMeta description="First description" title="Kits" />),
    );
    expect(document.title).toBe("Kits · Pokkan");
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("First description");

    window.history.replaceState({}, "", "/en/kits?kit=abc");
    flushSync(() =>
      root.render(<PageMeta description="Second description" title="Kits" />),
    );
    expect(document.title).toBe("Kits · Pokkan");
    expect(
      document.head.querySelectorAll('meta[name="description"]'),
    ).toHaveLength(1);
    expect(
      document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
    ).toBe("Kits · Pokkan");
    expect(
      document.head
        .querySelector('link[rel="canonical"]')
        ?.getAttribute("href"),
    ).toBe("https://pokkan.net/en/kits");
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content"),
    ).toBe("index,follow");
    expect(
      document.head.querySelectorAll(
        'link[rel="alternate"][data-pokkan-hreflang="true"]',
      ),
    ).toHaveLength(4);

    flushSync(() => root.unmount());
    host.remove();
    window.history.replaceState({}, "", "/");
  });
});
