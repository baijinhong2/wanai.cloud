import type { Metadata } from "next";
import HomePage from "@/views/HomePage";
import SeoLanding from "@/components/SeoLanding";
import { SEO_CONTENT } from "@/lib/seoContent";
import { toolMetadata, toolJsonLd } from "@/lib/seo";

const KEY = "minimax-h3";
const APP_NAME = "MiniMax H3 Video Generator";
const content = SEO_CONTENT[KEY];

export const metadata: Metadata = toolMetadata(KEY);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(KEY, APP_NAME, content)) }}
      />
      <HomePage defaultModel="minimax-h3" contentKey={KEY}>
        <SeoLanding contentKey={KEY} showHead={false} />
      </HomePage>
    </>
  );
}
