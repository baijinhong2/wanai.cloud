import type { Metadata } from "next";
import Script from "next/script";
import "../index.css";
import AppShell from "@/components/AppShell";
import { getPageMeta, SITE, fullUrl } from "@/lib/site";

const home = getPageMeta("home", "en");

const ga4Id = SITE.ga4MeasurementId;
const gscCode = SITE.gscVerification;
const hasGa4 = Boolean(ga4Id && ga4Id !== "G-XXXXXXXXXX" && ga4Id.startsWith("G-"));
const hasGsc = Boolean(gscCode && gscCode !== "google-site-verification-placeholder" && !gscCode.includes("placeholder"));

export const metadata: Metadata = {
  metadataBase: new URL(SITE.domain),
  title: home.title,
  description: home.description,
  keywords: home.keywords,
  alternates: { canonical: "/" },
  openGraph: {
    title: home.title,
    description: home.description,
    url: SITE.domain,
    siteName: SITE.name,
    type: "website",
    images: [{ url: fullUrl("/og-image.png"), width: 2172, height: 724, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: home.title,
    description: home.description,
    images: [fullUrl("/og-image.png")],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  ...(hasGsc ? { verification: { google: gscCode } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {hasGa4 && (
          <>
            <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
            <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');` }} />
          </>
        )}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
