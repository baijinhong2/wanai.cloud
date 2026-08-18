"use client";

import { type ReactNode } from "react";
import { useAuth } from "../lib/auth";

// 登录后隐藏（用于 SEO 落地内容：未登录/爬虫可见，登录用户隐藏）
export default function HideWhenAuthed({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return null;
  return <>{children}</>;
}
