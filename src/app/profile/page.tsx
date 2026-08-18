import type { Metadata } from "next";
import ProfilePage from "@/views/ProfilePage";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...toolMetadata("profile"),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ProfilePage />;
}
