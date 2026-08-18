import type { Metadata } from "next";
import { getPageMeta, fullUrl, SITE } from "./site";
import type { SeoPageContent } from "./seoContent";

// 工具页统一的 Metadata（TDK + canonical + OG/Twitter）
export function toolMetadata(key: string): Metadata {
  const meta = getPageMeta(key, "en");
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: fullUrl(meta.path) },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: fullUrl(meta.path),
      siteName: SITE.name,
      type: "website",
      images: [{ url: fullUrl("/og-image.png"), width: 2172, height: 724, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [fullUrl("/og-image.png")],
    },
  };
}

// 工具页 JSON-LD：WebApplication + FAQPage
export function toolJsonLd(key: string, appName: string, content: SeoPageContent) {
  const meta = getPageMeta(key, "en");
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: appName,
      url: fullUrl(meta.path),
      applicationCategory: "MultimediaApplication",
      description: meta.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faqItems.map((f) => ({
        "@type": "Question",
        name: f.title,
        acceptedAnswer: { "@type": "Answer", text: f.description },
      })),
    },
  ];
}
