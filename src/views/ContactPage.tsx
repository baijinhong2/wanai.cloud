"use client";

import { SITE } from "../lib/site";
import { Faq } from "../components/Faq";
import { useI18n } from "../lib/i18n";

export default function ContactPage() {
  const { t } = useI18n();

  const contactFaq = [
    { q: t("contact.faq1.q"), a: t("contact.faq1.a") },
    { q: t("contact.faq2.q"), a: t("contact.faq2.a") },
    { q: t("contact.faq3.q"), a: t("contact.faq3.a") },
    { q: t("contact.faq4.q"), a: t("contact.faq4.a") },
    { q: t("contact.faq5.q"), a: t("contact.faq5.a") },
  ];

  return (
    <main className="tool-main">
      <div className="legal">
        <h1>{t("contact.title")}</h1>
        <p className="legal-lead">{t("contact.lead")}</p>

        <div className="contact-grid">
          <div className="contact-card">
            <h2>{t("contact.feedbackTitle")}</h2>
            <p>{t("contact.feedbackDesc")}</p>
            <a className="btn-primary" href={`mailto:${SITE.email}?subject=Product%20Feedback`}>{t("contact.feedbackBtn")}</a>
          </div>
          <div className="contact-card">
            <h2>{t("contact.businessTitle")}</h2>
            <p>{t("contact.businessDesc")}</p>
            <a className="btn-primary" href={`mailto:${SITE.email}?subject=Business%20Partnership`}>{t("contact.businessBtn")}</a>
          </div>
          <div className="contact-card">
            <h2>{t("contact.supportTitle")}</h2>
            <p>{t("contact.supportDesc")}</p>
            <a className="btn-primary" href={`mailto:${SITE.email}?subject=Technical%20Support`}>{t("contact.supportBtn")}</a>
          </div>
        </div>

        <h2>{t("contact.email")}</h2>
        <p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      </div>

      <Faq items={contactFaq} title={t("contact.faqTitle")} />
    </main>
  );
}
