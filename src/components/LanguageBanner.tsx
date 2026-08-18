"use client";

import { useEffect, useState } from "react";
import { detectBrowserLang, useI18n } from "../lib/i18n";

const DISMISS_KEY = "wanai_lang_banner_dismissed";

// 顶部语言切换提示：浏览器是中文、且用户还没选择过语言时弹出
export default function LanguageBanner() {
  const { lang, setLang, t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const saved = localStorage.getItem("wanai_lang");
      if (!dismissed && !saved && detectBrowserLang() === "zh" && lang === "en") {
        setShow(true);
      }
    } catch { /* ignore */ }
  }, [lang]);

  if (!show) return null;

  function choose(toZh: boolean) {
    if (toZh) setLang("zh");
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <div className="lang-banner">
      <span className="lang-banner-text">{t("lang.banner.text")}</span>
      <div className="lang-banner-actions">
        <button type="button" className="lang-banner-yes" onClick={() => choose(true)}>{t("lang.banner.yes")}</button>
        <button type="button" className="lang-banner-no" onClick={() => choose(false)}>{t("lang.banner.no")}</button>
      </div>
    </div>
  );
}
