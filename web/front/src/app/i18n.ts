import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../../../locales/en.yml";
import es from "../../../../locales/es.yml";
import ja from "../../../../locales/ja.yml";
import ptBr from "../../../../locales/pt-BR.yml";
import { defaultLocale, localeFromPathname } from "./locale";

const resources = {
  en: { translation: en },
  es: { translation: es },
  ja: { translation: ja },
  "pt-BR": { translation: ptBr },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: localeFromPathname(),
  fallbackLng: defaultLocale,
  react: { useSuspense: false },
  interpolation: { escapeValue: false },
});

export {
  defaultLocale,
  isLocale,
  localeOptions,
  locales,
  type Locale,
} from "./locale";

export default i18n;
