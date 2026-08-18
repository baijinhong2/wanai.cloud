"use client";

import { SITE } from "../lib/site";
import { useI18n } from "../lib/i18n";

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <main className="tool-main">
      <div className="legal">
        <h1>{t("about.title")}</h1>
        <p className="legal-lead">{t("about.lead", { name: SITE.name })}</p>

        <h2>{t("about.missionTitle")}</h2>
        <p>{t("about.missionBody")}</p>

        <h2>{t("about.doTitle")}</h2>
        <p>{t("about.doLead")}</p>
        <ul>
          <li><strong>{t("nav.text-to-video")}</strong>：{t("about.doText")}</li>
          <li><strong>{t("nav.image-to-video")}</strong>：{t("about.doImage")}</li>
          <li><strong>{t("nav.reference-to-video")}</strong>：{t("about.doRef")}</li>
        </ul>

        <h2>{t("about.techTitle")}</h2>
        <p>{t("about.techBody")}</p>

        <h2>{t("about.contactTitle")}</h2>
        <p>
          {t("about.contactBody1")} <a href={`mailto:${SITE.email}`}>{SITE.email}</a> {t("about.contactBody2")} <a href="/contact">{t("about.contactPage")}</a>.
        </p>
      </div>
    </main>
  );
}
