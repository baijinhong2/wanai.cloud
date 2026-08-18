"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const label = lang === "zh" ? "中文" : "EN";

  return (
    <div className="lang-switcher" ref={ref}>
      <button type="button" className="lang-switcher-btn" onClick={() => setOpen((v) => !v)} aria-label="Language">
        {label}
      </button>
      {open && (
        <div className="lang-switcher-menu">
          <button type="button" className={`lang-switcher-item ${lang === "en" ? "is-active" : ""}`} onClick={() => { setLang("en"); setOpen(false); }}>English</button>
          <button type="button" className={`lang-switcher-item ${lang === "zh" ? "is-active" : ""}`} onClick={() => { setLang("zh"); setOpen(false); }}>简体中文</button>
        </div>
      )}
    </div>
  );
}
