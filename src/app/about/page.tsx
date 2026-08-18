import type { Metadata } from "next";
import AboutPage from "@/views/AboutPage";
import { toolMetadata } from "@/lib/seo";
import { getPageMeta, fullUrl } from "@/lib/site";

export const metadata: Metadata = toolMetadata("about");

export default function Page() {
  const meta = getPageMeta("about", "en");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About WanAI.cloud",
    url: fullUrl(meta.path),
    description: meta.description,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AboutPage />
    </>
  );
}
