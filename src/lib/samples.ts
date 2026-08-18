// 示例视频（按模型分类，素材见 public/samples/<模型>/）
import { getModel, type ModelId } from "./modelConfig";

export interface SampleVideo {
  id: string;
  model: ModelId;
  src: string;
}

// 模型显示名（用于视频左上角的胶囊标签）
export function modelName(model: ModelId): string {
  return getModel(model).name;
}

// Fisher–Yates 洗牌（返回新数组，不改变原数组）
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  // ── Wan 3.0 ──────────────────────────────────────────────
  { id: "wan-aio-t1", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t1.mp4" },
  { id: "wan-aio-t2", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t2.mp4" },
  { id: "wan-aio-t3", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t3.mp4" },
  { id: "wan-aio-t11", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t11.mp4" },
  { id: "wan-aio-t12", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t12.mp4" },
  { id: "wan-aio-t13", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t13.mp4" },
  { id: "wan-aio-t17", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t17.mp4" },
  { id: "wan-aio-t20", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t20.mp4" },
  { id: "wan-aio-t21", model: "wan-3.0", src: "/samples/wan-3.0/wan_aio_t21.mp4" },
  { id: "wan-flf-t2", model: "wan-3.0", src: "/samples/wan-3.0/wan_flf_t2.mp4" },
  { id: "wan-flf-t3", model: "wan-3.0", src: "/samples/wan-3.0/wan_flf_t3.mp4" },
  { id: "wan-flf-t5", model: "wan-3.0", src: "/samples/wan-3.0/wan_flf_t5.mp4" },
  { id: "wan-flf-t11", model: "wan-3.0", src: "/samples/wan-3.0/wan_flf_t11.mp4" },

  // ── MiniMax H3 ───────────────────────────────────────────
  { id: "h3-2k-demo", model: "minimax-h3", src: "/samples/minimax-h3/h3-2k-demo-1785469105396.mp4" },
  { id: "h3-ad-ecommerce", model: "minimax-h3", src: "/samples/minimax-h3/h3-ad-ecommerce-1785469105396.mp4" },
  { id: "h3-dynamic-poster", model: "minimax-h3", src: "/samples/minimax-h3/h3-dynamic-poster-1785469105396.mp4" },
  { id: "h3-game-ui", model: "minimax-h3", src: "/samples/minimax-h3/h3-game-ui-1785469105396.mp4" },
  { id: "h3-generated-result", model: "minimax-h3", src: "/samples/minimax-h3/h3-generated-result-1785469105396.mp4" },
  { id: "h3-movie-intro", model: "minimax-h3", src: "/samples/minimax-h3/h3-movie-intro-1785469105396.mp4" },
  { id: "h3-stereo-demo", model: "minimax-h3", src: "/samples/minimax-h3/h3-stereo-demo-1785469105396.mp4" },

  // ── Seedance 2.5 ─────────────────────────────────────────
  { id: "sd25-08", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-08-src.mp4" },
  { id: "sd25-12", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-12-src.mp4" },
  { id: "sd25-14", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-14-src-cn.mp4" },
  { id: "sd25-15", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-15-src.mp4" },
  { id: "sd25-16", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-16-src.mp4" },
  { id: "sd25-20", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-20-src.mp4" },
  { id: "sd25-31", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-31-src.mp4" },
  { id: "sd25-33", model: "seedance-2.5", src: "/samples/seedance-2.5/tpl-sd25-33-src.mp4" },
];
