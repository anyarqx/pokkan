import { getCollection } from "astro:content";
import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// Starlight's explicit English fallback remains readable, but it is not a
// translation and must not be advertised as one to crawlers.
export const onRequest = defineRouteMiddleware(async ({ locals, site }) => {
  const route = locals.starlightRoute;
  const appLocale = route.locale === "pt-br" ? "pt-BR" : (route.locale ?? "en");
  const openLabel = {
    en: "Open Pokkan ↗",
    "pt-BR": "Abrir a Pokkan ↗",
    es: "Abrir Pokkan ↗",
    ja: "Pokkanを開く ↗",
  };
  route.sidebar.unshift({
    type: "link",
    label: openLabel[appLocale as keyof typeof openLabel] ?? openLabel.en,
    href: `https://pokkan.net/${appLocale}/kits`,
    isCurrent: false,
    badge: undefined,
    attrs: {},
  });
  if (route.id === "404") {
    route.head = route.head.filter(({ attrs }) => attrs?.rel !== "alternate");
    for (const tag of route.head) {
      if (tag.attrs?.rel === "canonical")
        tag.attrs.href = new URL("/404.html", site).href;
    }
    route.head.push({
      tag: "meta",
      attrs: { name: "robots", content: "noindex,follow" },
    });
    return;
  }
  const entries = await getCollection("docs", ({ data }) => !data.draft);
  const ids = new Set(entries.map(({ id }) => id.replace(/\/index$/, "")));
  route.head = route.head.filter(({ attrs }) => {
    if (attrs?.rel !== "alternate" || !attrs.href) return true;
    return ids.has(
      new URL(String(attrs.href)).pathname.replace(/^\/|\/$/g, ""),
    );
  });
  if (route.isFallback) {
    const canonical = new URL(
      `/${route.entry.id.replace(/\/index$/, "")}/`,
      site,
    ).href;
    for (const tag of route.head) {
      if (tag.attrs?.rel === "canonical") tag.attrs.href = canonical;
      if (tag.attrs?.property === "og:url") tag.attrs.content = canonical;
    }
    route.head.push({
      tag: "meta",
      attrs: { name: "robots", content: "noindex,follow" },
    });
    route.entry = {
      ...route.entry,
      data: { ...route.entry.data, pagefind: false },
    };
  }
});
