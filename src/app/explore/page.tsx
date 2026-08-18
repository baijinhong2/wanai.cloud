import type { Metadata } from "next";
import ExplorePage from "@/views/ExplorePage";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("explore");

export default function Page() {
  return <ExplorePage />;
}
