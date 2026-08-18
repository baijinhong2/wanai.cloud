"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import AiVideoGenerator from "../components/AiVideoGenerator";
import { SEO_CONTENT, SEO_CONTENT_ZH } from "../lib/seoContent";
import { type ModelId } from "../lib/modelConfig";
import { type GenMode } from "../lib/site";
import { useI18n } from "../lib/i18n";

export default function HomePage({ children, defaultModel, contentKey }: { children?: ReactNode; defaultModel?: ModelId; contentKey?: string }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<GenMode>("image-to-video");
  // 模型专属落地页：用 SEO 内容的 H1/副标题覆盖通用标题
  const seo = contentKey ? ((lang === "zh" ? SEO_CONTENT_ZH[contentKey] : SEO_CONTENT[contentKey]) || SEO_CONTENT[contentKey]) : null;

  return (
    <>
      {/* 首屏：H1 → 副标题 → 工具区（左右结构） */}
      <section className="home-hero">
        <div className="home-hero-top">
          <h1>
            {seo ? seo.h1Title : (
              <>
                {t("home.h1a")}
                <span className="grad"> {t("home.h1b")}</span>
              </>
            )}
          </h1>
          <p className="home-sub">{seo ? seo.h1Subtitle : t("home.sub")}</p>
        </div>

        <div className="home-hero-tool">
          <AiVideoGenerator mode={mode} onModeChange={setMode} defaultModel={defaultModel} />
        </div>
      </section>

      {/* 功能特性 */}
      <section className="home-section" aria-labelledby="features-h">
        <h2 id="features-h">{t("home.featuresTitle")}</h2>
        <p className="home-section-sub">{t("home.featuresSub")}</p>
        <div className="feature-grid">
          <Link href="/text-to-video" className="feature-card">
            <div className="feature-icon">T</div>
            <h3>{t("nav.text-to-video")}</h3>
            <p>{t("home.f1.desc")}</p>
            <span className="feature-link">{t("home.tryNow")}</span>
          </Link>
          <Link href="/image-to-video" className="feature-card">
            <div className="feature-icon">I</div>
            <h3>{t("nav.image-to-video")}</h3>
            <p>{t("home.f2.desc")}</p>
            <span className="feature-link">{t("home.tryNow")}</span>
          </Link>
          <Link href="/reference-to-video" className="feature-card">
            <div className="feature-icon">R</div>
            <h3>{t("nav.reference-to-video")}</h3>
            <p>{t("home.f3.desc")}</p>
            <span className="feature-link">{t("home.tryNow")}</span>
          </Link>
        </div>
      </section>

      {/* SEO 落地内容（服务端渲染，作为 children 注入） */}
      {children}

      {/* 底部 CTA */}
      <section className="home-cta">
        <h2>{t("home.ready")}</h2>
        <p>{t("home.readySub")}</p>
        <Link href="/image-to-video" className="btn-primary">{t("home.start")}</Link>
      </section>
    </>
  );
}
