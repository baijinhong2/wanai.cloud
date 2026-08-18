import type { Metadata } from "next";
import PricingPage from "@/views/PricingPage";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("pricing");

export default function Page() {
  return <PricingPage />;
}
