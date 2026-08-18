import type { ModelBilling, Resolution } from "./modelConfig";

// 积分消耗（每秒基础积分由模型 + 分辨率决定）：
//   minimax-h3：768P 4.5 积分/s、2K 7 积分/s；上传参考视频额外 +4 / +6.5 积分/s
//   wan 3.0 / seedance 2.5：480P 12、720P 22、1080P 45 积分/s；参考图/视频/音频均不额外收费
export function computeCredits(
  billing: ModelBilling,
  resolution: Resolution,
  duration: number,
  referenceVideoSeconds = 0
): number {
  const dur = Math.max(1, Number(duration) || 1);
  const base = billing.basePerSecond[resolution] ?? 0;
  let total = base * dur;
  if (referenceVideoSeconds > 0) {
    const extra = billing.referenceVideoPerSecond?.[resolution] ?? 0;
    total += extra * referenceVideoSeconds;
  }
  // 不自动进位，保留小数，仅清理浮点误差到 1 位小数
  return Math.round(total * 10) / 10;
}

// 累加参考视频总时长：每个视频向上取整到整数秒（不足 1 秒按 1 秒）
export function sumVideoSeconds(videos: { duration?: number }[]): number {
  let total = 0;
  for (const v of videos) {
    const d = Number(v.duration) || 0;
    total += Math.max(1, Math.ceil(d));
  }
  return total;
}
