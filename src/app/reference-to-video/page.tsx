import type { Metadata } from "next";
import ReferenceToVideoPage from "@/views/ReferenceToVideoPage";
import { SEO_CONTENT } from "@/lib/seoContent";
import { toolMetadata, toolJsonLd } from "@/lib/seo";

const KEY = "reference-to-video";
const APP_NAME = "WanAI.cloud Reference to Video";
const content = SEO_CONTENT[KEY];

export const metadata: Metadata = toolMetadata(KEY);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(KEY, APP_NAME, content)) }}
      />
      <ReferenceToVideoPage />
    </>
  );
}
