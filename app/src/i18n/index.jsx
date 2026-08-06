import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LANGS, messages } from "./messages.js";

const STORAGE_KEY = "cnefe-lang";

// First load: honor a saved choice, else fall back to the browser locale.
// pt-* → Portuguese, anything else → English.
function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    /* localStorage may be unavailable (private mode) — ignore */
  }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("pt") ? "pt" : "en";
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failures */
    }
  }, []);

  // Reflect the active language onto the document (<html lang> + <title>).
  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.title = messages[lang].docTitle;
  }, [lang]);

  const t = useCallback(
    (key) => {
      const dict = messages[lang] || messages.pt;
      return key in dict ? dict[key] : key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}
