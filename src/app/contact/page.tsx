import type { Metadata } from "next";
import ContactPage from "@/views/ContactPage";
import { toolMetadata } from "@/lib/seo";
import { getPageMeta, fullUrl } from "@/lib/site";

export const metadata: Metadata = toolMetadata("contact");

export default function Page() {
  const meta = getPageMeta("contact", "en");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact WanAI.cloud",
    url: fullUrl(meta.path),
    description: meta.description,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ContactPage />
    </>
  );
}
