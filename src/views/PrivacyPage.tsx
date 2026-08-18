"use client";

import { SITE } from "../lib/site";
import { useI18n } from "../lib/i18n";

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <main className="tool-main">
      <div className="legal">
        <h1>{t("privacy.title")}</h1>
        <p className="legal-lead">{t("privacy.lead")}</p>

        <h2>{t("privacy.s1.title")}</h2>
        <p>{t("privacy.s1.body")}</p>
        <ul>
          <li><strong>{t("privacy.s1.l1")}</strong></li>
          <li><strong>{t("privacy.s1.l2")}</strong></li>
        </ul>

        <h2>{t("privacy.s2.title")}</h2>
        <p>{t("privacy.s2.body")}</p>
        <ul>
          <li>{t("privacy.s2.l1")}</li>
          <li>{t("privacy.s2.l2")}</li>
          <li>{t("privacy.s2.l3")}</li>
        </ul>

        <h2>{t("privacy.s3.title")}</h2>
        <p>{t("privacy.s3.body")}</p>

        <h2>{t("privacy.s4.title")}</h2>
        <p>{t("privacy.s4.body")}</p>

        <h2>{t("privacy.s5.title")}</h2>
        <p>{t("privacy.s5.body")}</p>

        <h2>{t("privacy.s6.title")}</h2>
        <p>{t("privacy.s6.body")}</p>

        <h2>{t("privacy.s7.title")}</h2>
        <p>{t("privacy.s7.body")}</p>

        <h2>{t("privacy.s8.title")}</h2>
        <p>{t("privacy.s8.body")} <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </div>
    </main>
  );
}
