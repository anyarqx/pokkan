export const locales = ["pt-BR", "en", "es", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt-BR";

/** Native language names stay readable before changing the active locale. */
export const localeOptions: readonly Readonly<{
  code: Locale;
  label: string;
}>[] = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && locales.includes(value as Locale);
}

export function localeFromPathname(
  pathname = typeof window === "undefined" ? "/" : window.location.pathname,
): Locale {
  const candidate = pathname.split("/").filter(Boolean)[0];
  return isLocale(candidate) ? candidate : defaultLocale;
}
