import type { Metadata } from "next";
import RefundPage from "@/views/RefundPage";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("refund");

export default function Page() {
  return <RefundPage />;
}
