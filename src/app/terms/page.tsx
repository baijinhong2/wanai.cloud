import type { Metadata } from "next";
import TermsPage from "@/views/TermsPage";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("terms");

export default function Page() {
  return <TermsPage />;
}
