import { useLayoutEffect } from "react";

const publicOrigin = "https://pokkan.net";
const locales = ["pt-BR", "en", "es", "ja"] as const;
const indexableRoutes = new Set(["", "about", "kits", "privacy"]);

interface PageMetaProps {
  readonly title: string;
  readonly description: string;
  readonly indexable?: boolean;
}

/** Keeps browser, crawler and link-preview metadata aligned with the active route. */
export function PageMeta({
  title,
  description,
  indexable = true,
}: PageMetaProps) {
  useLayoutEffect(() => {
    const pageTitle = title === "Pokkan" ? title : `${title} · Pokkan`;
    const current = currentRoute();
    const stable =
      indexable &&
      current.locale !== undefined &&
      indexableRoutes.has(current.route);
    const canonical = `${publicOrigin}${current.path}`;

    document.title = pageTitle;
    setMeta("name", "description", description);
    setMeta("name", "robots", stable ? "index,follow" : "noindex,nofollow");
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "Pokkan");
    setMeta("property", "og:image", `${publicOrigin}/pokkanicon.png`);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", `${publicOrigin}/pokkanicon.png`);
    setLink("canonical", canonical);
    clearAlternates();
    if (stable) {
      for (const locale of locales)
        setLink(
          "alternate",
          `${publicOrigin}/${locale}${current.route ? `/${current.route}` : ""}`,
          { hreflang: locale, "data-pokkan-hreflang": "true" },
        );
    }
    setSiteSchema(current.locale !== undefined && current.route === "");
  }, [description, indexable, title]);

  return null;
}

function currentRoute() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const segments = path.split("/").filter(Boolean);
  const locale = locales.find((value) => value === segments[0]);
  const route = locale ? segments.slice(1).join("/") : segments.join("/");
  return {
    locale,
    route,
    path: locale ? `/${locale}${route ? `/${route}` : ""}` : path,
  };
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function setLink(
  rel: string,
  href: string,
  attributes: Record<string, string> = {},
) {
  const selector =
    rel === "alternate"
      ? `link[rel="alternate"][data-pokkan-hreflang="true"][hreflang="${attributes.hreflang}"]`
      : `link[rel="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.append(element);
  }
  element.href = href;
  for (const [key, value] of Object.entries(attributes))
    element.setAttribute(key, value);
}

function clearAlternates() {
  document.head
    .querySelectorAll('link[rel="alternate"][data-pokkan-hreflang="true"]')
    .forEach((element) => element.remove());
}

function setSiteSchema(active: boolean) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    'script[data-pokkan-site-schema="true"]',
  );
  if (!active) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-pokkan-site-schema", "true");
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pokkan",
    url: `${publicOrigin}/`,
  });
  if (!existing) document.head.append(script);
}
