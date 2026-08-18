import seoMeta from "./seo-meta.json";

// 站点全局配置（单一数据源，SEO / 路由 / 统计共用）
export const SITE = {
  name: "WanAI.cloud",
  brand: "WanAI.cloud",
  domain: "https://wanai.cloud",
  tagline: "新一代 AI 视频生成平台",
  email: "support@wanai.cloud",
  ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || "G-XXXXXXXXXX", // 真实值放 .env（部署时配 Vercel 环境变量）
  gscVerification: process.env.GSC_VERIFICATION || "google-site-verification-placeholder", // 真实值放 .env
  social: {
    twitter: "https://x.com/wanaicloud",
    github: "https://github.com/wanaicloud",
  },
};

export type GenMode = "text-to-video" | "image-to-video" | "reference-to-video";

// 功能页菜单（左侧栏）
export const TOOL_MENU: Array<{
  mode: GenMode;
  path: string;
  label: string;
  short: string;
  desc: string;
  keywords: string;
}> = [
  {
    mode: "image-to-video",
    path: "/image-to-video",
    label: "图生视频",
    short: "Image to Video",
    desc: "上传首帧 / 首尾帧图片，让静态画面动起来。",
    keywords: "wan 3.0 AI video, image to video, first frame to video, minimax H3 video, 图生视频",
  },
  {
    mode: "reference-to-video",
    path: "/reference-to-video",
    label: "参考生视频",
    short: "Reference to Video",
    desc: "上传参考图片 / 视频 / 音频，多模态参考生成视频。",
    keywords: "minimax H3 video, reference to video, seedance 2.5, 参考生视频, 多模态视频生成",
  },
  {
    mode: "text-to-video",
    path: "/text-to-video",
    label: "文生视频",
    short: "Text to Video",
    desc: "输入提示词，一键生成高清 AI 视频。",
    keywords: "wan 3.0, AI video generator, text to video, minimax H3, H3 文生视频",
  },
];

// 页面 SEO 元数据（TDK：英文按 SEO 提示词生成，其他语言为英文的忠实翻译）
export type PageMetaL10n = { title: string; description: string; keywords: string };
export type PageMetaEntry = { path: string; en: PageMetaL10n; zh: PageMetaL10n };

export const PAGE_META: Record<string, PageMetaEntry> = seoMeta as Record<string, PageMetaEntry>;

// 根据当前语言返回纯净的 TDK（英文版全英文、中文版全中文）
export function getPageMeta(
  key: string,
  lang: "en" | "zh",
): { path: string; title: string; description: string; keywords: string } {
  const entry = PAGE_META[key];
  const l = entry[lang] ?? entry.en;
  return { path: entry.path, title: l.title, description: l.description, keywords: l.keywords };
}

export const fullUrl = (path: string) => `${SITE.domain}${path}`;
