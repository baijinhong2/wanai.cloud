import HomePage from "@/views/HomePage";
import SeoLanding from "@/components/SeoLanding";
import { SEO_CONTENT } from "@/lib/seoContent";
import { fullUrl } from "@/lib/site";

const homeContent = SEO_CONTENT["home"];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "WanAI.cloud AI Video Generator",
    url: fullUrl("/"),
    applicationCategory: "MultimediaApplication",
    description: "Free online AI video generator for text to video, image to video and reference to video.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homeContent.faqItems.map((f) => ({
      "@type": "Question",
      name: f.title,
      acceptedAnswer: { "@type": "Answer", text: f.description },
    })),
  },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomePage>
        <SeoLanding contentKey="home" showHead={false} />
      </HomePage>
    </>
  );
}
