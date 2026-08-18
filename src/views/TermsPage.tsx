"use client";

import { SITE } from "../lib/site";
import { useI18n } from "../lib/i18n";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <main className="tool-main">
      <div className="legal">
        <h1>{t("terms.title")}</h1>
        <p className="legal-lead">{t("terms.lead")}</p>

        <h2>{t("terms.s1.title")}</h2>
        <p>{t("terms.s1.body", { name: SITE.name })}</p>

        <h2>{t("terms.s2.title")}</h2>
        <p>{t("terms.s2.body")}</p>

        <h2>{t("terms.s3.title")}</h2>
        <p>{t("terms.s3.body")}</p>
        <ul>
          <li>{t("terms.s3.l1")}</li>
          <li>{t("terms.s3.l2")}</li>
          <li>{t("terms.s3.l3")}</li>
        </ul>

        <h2>{t("terms.s4.title")}</h2>
        <p>{t("terms.s4.body")}</p>

        <h2>{t("terms.s5.title")}</h2>
        <p>{t("terms.s5.body")}</p>

        <h2>{t("terms.s6.title")}</h2>
        <p>{t("terms.s6.body")}</p>

        <h2>{t("terms.s7.title")}</h2>
        <p>{t("terms.s7.body")}</p>

        <h2>{t("terms.s8.title")}</h2>
        <p>{t("terms.s8.body")} <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </div>
    </main>
  );
}
