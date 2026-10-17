import { useEffect, useState } from "react";
import type en from "./policies/en.json";

type PolicyCopy = typeof en;
const loaders = {
  en: () => import("./policies/en.json"),
  "pt-BR": () => import("./policies/pt-BR.json"),
  es: () => import("./policies/es.json"),
  ja: () => import("./policies/ja.json"),
};

export function usePolicyCopy(locale: string) {
  const [loaded, setLoaded] = useState<{ locale: string; copy: PolicyCopy }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    const load = loaders[locale as keyof typeof loaders] ?? loaders.en;
    void load()
      .then((module) => {
        if (active) setLoaded({ locale, copy: module.default });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [locale]);
  return { copy: loaded?.locale === locale ? loaded.copy : undefined, failed };
}
