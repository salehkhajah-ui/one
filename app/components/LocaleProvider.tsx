"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getStoredLocale, setActiveLocale, setStoredLocale, type Locale } from "../../lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: "en", setLocale: () => {} });

/** Applies locale + direction to the document and re-renders the tree on change. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = getStoredLocale();
    setActiveLocale(stored);
    setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = (l: Locale) => {
    setActiveLocale(l);
    setStoredLocale(l);
    setLocaleState(l);
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
