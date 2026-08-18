"use client";

import { SEO_CONTENT, SEO_CONTENT_ZH } from "../lib/seoContent";
import { useI18n } from "../lib/i18n";

// SEO 落地页内容渲染（What is / How to use / Do with / Who is for / Why choose / Reviews / FAQ）
// 按当前语言自动选择英文 / 中文内容
export default function SeoLanding({ contentKey, showHead = true }: { contentKey: string; showHead?: boolean }) {
  const { lang } = useI18n();
  const content = (lang === "zh" ? SEO_CONTENT_ZH[contentKey] : SEO_CONTENT[contentKey]) || SEO_CONTENT[contentKey];
  return (
    <div className="seo-landing">
      {/* H1 头部 */}
      {showHead && (
        <header className="seo-head">
          <h1>{content.h1Title}</h1>
          <p>{content.h1Subtitle}</p>
        </header>
      )}

      {/* What is */}
      <section className="seo-section">
        <h2>{content.whatIsTitle}</h2>
        <p className="seo-section-lead">{content.whatIsDescription}</p>
      </section>

      {/* How to use */}
      <section className="seo-section">
        <h2>{content.howToUseTitle}</h2>
        <div className="seo-steps">
          {content.howToUseSteps.map((s) => (
            <div className="seo-step" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Do with */}
      <section className="seo-section">
        <h2>{content.doWithTitle}</h2>
        <p className="seo-section-lead">{content.doWithDescription}</p>
        <div className="seo-grid">
          {content.doWithItems.map((f) => (
            <div className="seo-card" key={f.title}>
              <img src={f.photo} alt={f.title} loading="lazy" />
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who is for */}
      <section className="seo-section">
        <h2>{content.whoIsForTitle}</h2>
        <div className="seo-grid seo-grid-3">
          {content.whoIsForItems.map((a) => (
            <div className="seo-card" key={a.title}>
              <img src={a.photo} alt={a.title} loading="lazy" />
              <h3>{a.title}</h3>
              <p>{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose */}
      <section className="seo-section">
        <h2>{content.whyChooseTitle}</h2>
        <div className="seo-grid seo-grid-3">
          {content.whyChooseItems.map((a) => (
            <div className="seo-card" key={a.title}>
              <img src={a.photo} alt={a.title} loading="lazy" />
              <h3>{a.title}</h3>
              <p>{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="seo-section">
        <h2>{content.reviewsTitle}</h2>
        <p className="seo-review-count">{content.reviewCount}</p>
        <div className="seo-reviews">
          {content.reviewItems.map((r) => (
            <div className="seo-review" key={r.name + r.title}>
              <div className="seo-review-head">
                <span className="seo-review-avatar">{r.name.charAt(0)}</span>
                <div className="seo-review-meta">
                  <strong>{r.name}</strong>
                  <span>{r.profession}</span>
                </div>
                <span className="seo-review-rating">★ {r.rating}</span>
              </div>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="seo-section">
        <h2>{content.faqTitle}</h2>
        <div className="seo-faq">
          {content.faqItems.map((f) => (
            <details className="seo-faq-item" key={f.title}>
              <summary>{f.title}</summary>
              <p>{f.description}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
