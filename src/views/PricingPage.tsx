"use client";

import { useEffect, useState } from "react";
import { SITE } from "../lib/site";
import { useI18n } from "../lib/i18n";

interface Plan {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  credits: number;
  features: string[];
}

export default function PricingPage() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyPlan, setBuyPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetch("/api/plans")
      .then(async (r) => { if (r.ok) setPlans((await r.json()).plans || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <main className="tool-main">
        <section className="pricing">
          <div className="pricing-head">
            <h1>{t("pricing.title")}</h1>
            <p>{t("pricing.subtitle")}</p>
          </div>

          <div className="pricing-grid">
            {loading ? (
              <p className="pricing-loading">{t("pricing.loading")}</p>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className={`pricing-card ${plan.id === "pro" ? "is-popular" : ""}`}>
                  {plan.id === "pro" && <span className="pricing-popular">{t("pricing.popular")}</span>}
                  <h2 className="pricing-name">{plan.name}</h2>
                  <div className="pricing-price">
                    <span className="pricing-currency">$</span>
                    <span className="pricing-amount">{plan.price.toFixed(2)}</span>
                    <span className="pricing-original-strike">${plan.originalPrice.toFixed(2)}</span>
                    <span className="pricing-period">{t("pricing.perMonth")}</span>
                  </div>
                  <div className="pricing-credits">{plan.credits} {t("pricing.creditsIncluded")}</div>
                  <ul className="pricing-features">
                    {plan.features.map((f) => {
                      const isNegative = f === "no_hd" || f === "no_video_ref";
                      return (
                        <li key={f} className={isNegative ? "is-negative" : ""}>
                          {isNegative ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                          {t(`plan.f.${f}`)}
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" className="pricing-cta" onClick={() => setBuyPlan(plan)}>
                    {t("pricing.buy")}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {buyPlan && (
        <div className="auth-modal-backdrop" onClick={() => setBuyPlan(null)}>
          <div className="auth-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auth-modal-close" onClick={() => setBuyPlan(null)} aria-label="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h3 className="auth-modal-title">{t("pricing.paymentComingSoon")}</h3>
            <p className="auth-modal-sub">{t("pricing.paymentSub")}</p>

            <div className="pricing-modal-product">
              <div className="pricing-modal-row">
                <span className="pricing-modal-product-name">{t("pricing.modalProduct").replace("{plan}", buyPlan.name)}</span>
              </div>
              <div className="pricing-modal-row pricing-modal-meta">
                <span>{t("pricing.modalPrice").replace("{price}", buyPlan.price.toFixed(2))}</span>
                <span>{t("pricing.modalCredits").replace("{credits}", String(buyPlan.credits))}</span>
              </div>
            </div>

            <p className="pricing-buy-note">{t("pricing.modalComingSoon")}</p>
            <a className="pricing-buy-email" href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </div>
        </div>
      )}
    </>
  );
}
