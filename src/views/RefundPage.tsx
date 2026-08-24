"use client";

import { SITE } from "../lib/site";
import { useI18n } from "../lib/i18n";

export default function RefundPage() {
  const { t } = useI18n();
  return (
    <main className="tool-main">
      <div className="legal">
        <h1>{t("refund.title")}</h1>
        <p className="legal-lead">{t("refund.lead")}</p>

        <h2>{t("refund.s1.title")}</h2>
        <p>{t("refund.s1.body")}</p>

        <h2>{t("refund.s2.title")}</h2>
        <p>{t("refund.s2.body")}</p>

        <h2>{t("refund.s3.title")}</h2>
        <p>{t("refund.s3.body")}</p>

        <h2>{t("refund.s4.title")}</h2>
        <p>{t("refund.s4.body")}</p>

        <h2>{t("refund.s5.title")}</h2>
        <p>{t("refund.s5.body")}</p>

        <h2>{t("refund.s6.title")}</h2>
        <p>{t("refund.s6.body")}</p>

        <h2>{t("refund.s7.title")}</h2>
        <p>{t("refund.s7.body")}</p>

        <h2>{t("refund.s8.title")}</h2>
        <p>{t("refund.s8.body")} <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
      </div>
    </main>
  );
}
