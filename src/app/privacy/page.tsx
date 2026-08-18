import type { Metadata } from "next";
import PrivacyPage from "@/views/PrivacyPage";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("privacy");

export default function Page() {
  return <PrivacyPage />;
}
