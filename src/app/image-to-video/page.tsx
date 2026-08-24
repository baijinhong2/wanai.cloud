import type { Metadata } from "next";
import ImageToVideoPage from "@/views/ImageToVideoPage";
import { SEO_CONTENT } from "@/lib/seoContent";
import { toolMetadata, toolJsonLd } from "@/lib/seo";

const KEY = "image-to-video";
const APP_NAME = "WanAI.cloud Image to Video";
const content = SEO_CONTENT[KEY];

export const metadata: Metadata = toolMetadata(KEY);

export default function Page({ searchParams }: { searchParams?: { model?: string } }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(KEY, APP_NAME, content)) }}
      />
      <ImageToVideoPage modelParam={searchParams?.model} />
    </>
  );
}
