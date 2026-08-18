import type { Metadata } from "next";
import TextToVideoPage from "@/views/TextToVideoPage";
import { SEO_CONTENT } from "@/lib/seoContent";
import { toolMetadata, toolJsonLd } from "@/lib/seo";

const KEY = "text-to-video";
const APP_NAME = "WanAI.cloud Text to Video";
const content = SEO_CONTENT[KEY];

export const metadata: Metadata = toolMetadata(KEY);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(KEY, APP_NAME, content)) }}
      />
      <TextToVideoPage />
    </>
  );
}
