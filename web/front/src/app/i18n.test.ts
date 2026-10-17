import { describe, expect, it } from "vitest";
import en from "../../../../locales/en.yml";
import es from "../../../../locales/es.yml";
import ja from "../../../../locales/ja.yml";
import ptBr from "../../../../locales/pt-BR.yml";
import { localeFromPathname } from "./locale";

describe("route locale initialization", () => {
  it("uses the locale embedded in the initial route", () => {
    expect(localeFromPathname("/en/about")).toBe("en");
    expect(localeFromPathname("/pt-BR/kits")).toBe("pt-BR");
    expect(localeFromPathname("/ja/kits")).toBe("ja");
  });

  it("falls back only for routes without a supported locale", () => {
    expect(localeFromPathname("/kits")).toBe("pt-BR");
  });

  it("keeps every locale catalog structurally aligned", () => {
    const expected = translationPaths(ptBr);
    expect(translationPaths(en)).toEqual(expected);
    expect(translationPaths(es)).toEqual(expected);
    expect(translationPaths(ja)).toEqual(expected);
  });
});

function translationPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      translationPaths(item, `${prefix}[${index}]`),
    );
  if (value && typeof value === "object") {
    return Object.entries(value)
      .flatMap(([key, item]) =>
        translationPaths(item, prefix ? `${prefix}.${key}` : key),
      )
      .sort();
  }
  return [prefix];
}
