// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
import "./i18n";
import { SiteLayout } from "./SiteLayout";

vi.mock("../shared/session", () => ({
  useSession: () => ({ loading: false }),
}));

it("skips to the page content without replacing a shared-resource fragment", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  function Content() {
    const location = useLocation();
    return (
      <main id="main-content" tabIndex={-1}>
        {location.hash}
      </main>
    );
  }
  try {
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={["/en/shared/example#demo-link"]}>
          <Routes>
            <Route path="/:locale" element={<SiteLayout />}>
              <Route path="shared/:id" element={<Content />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      ),
    );
    flushSync(() =>
      host.querySelector<HTMLAnchorElement>(".skip-link")!.click(),
    );
    expect(document.activeElement).toBe(host.querySelector("main"));
    expect(host.querySelector("main")?.textContent).toBe("#demo-link");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
});
