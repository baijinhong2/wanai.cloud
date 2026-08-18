// src/lib/server/geo.ts — 从请求识别国家（生产走 Vercel 头，本地无则返回 null）
export function getCountryCode(headers: Headers) {
  const c = (headers.get("x-vercel-ip-country") || "").toString().trim().toUpperCase();
  return c || null;
}
