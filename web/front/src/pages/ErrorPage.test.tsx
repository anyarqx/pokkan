// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../app/i18n";
import { ErrorPage } from "./ErrorPage";

afterEach(() => void i18n.changeLanguage("pt-BR"));

describe("localized error page", () => {
  it("keeps the current locale in its recovery actions", async () => {
    await i18n.changeLanguage("ja");
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={["/ja/missing"]}>
          <Routes>
            <Route element={<ErrorPage status={404} />} path="/:locale/*" />
          </Routes>
        </MemoryRouter>,
      ),
    );

    expect(host.textContent).toContain("ページが見つかりません");
    expect(
      [...host.querySelectorAll("a")].map((link) => link.getAttribute("href")),
    ).toEqual(["/ja", "/ja/kits"]);

    flushSync(() => root.unmount());
    host.remove();
  });
});
