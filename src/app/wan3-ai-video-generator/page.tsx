import type { Metadata } from "next";
import HomePage from "@/views/HomePage";
import SeoLanding from "@/components/SeoLanding";
import { SEO_CONTENT } from "@/lib/seoContent";
import { toolMetadata, toolJsonLd } from "@/lib/seo";

const KEY = "wan-3.0";
const APP_NAME = "Wan 3.0 AI Video Generator";
const content = SEO_CONTENT[KEY];

export const metadata: Metadata = toolMetadata(KEY);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(KEY, APP_NAME, content)) }}
      />
      <HomePage defaultModel="wan-3.0" contentKey={KEY}>
        <SeoLanding contentKey={KEY} showHead={false} />
      </HomePage>
    </>
  );
}
