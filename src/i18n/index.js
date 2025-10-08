import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBRTranslations from "./locales/pt-BR";
import enTranslations from "./locales/en";

const savedLanguage = localStorage.getItem('language');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": {
        ...ptBRTranslations,
      },
      "en": {
        ...enTranslations,
      },
    },
    lng: savedLanguage || undefined,
    fallbackLng: "pt-BR",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
