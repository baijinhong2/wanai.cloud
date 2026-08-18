// 素材 metadata + 裁剪工具（迁移自 video-stitcher 的 mediaMeta.ts，去除 i18n 依赖）
// 服务于 AI 生视频：客户端校验格式/大小/时长/分辨率，视频/音频 > 15s 时提供在线裁剪。

export type AssetKind = "image" | "video" | "audio" | "file";

export interface MediaMeta {
  kind: AssetKind;
  formatOk: boolean;
  duration?: number;
  width?: number;
  height?: number;
}

export interface RefAsset {
  id: string;
  file: File;
  kind: AssetKind;
  preview?: string;
  name: string;
  size: number;
  duration?: number;
}

export const ALLOWED_FORMATS: Record<AssetKind, { mimes: string[]; exts: string[]; label: string }> = {
  image: { mimes: ["image/jpeg", "image/png", "image/webp"], exts: ["jpg", "jpeg", "png", "webp"], label: "JPEG/PNG/WebP" },
  video: { mimes: ["video/mp4", "video/quicktime", "video/webm"], exts: ["mp4", "mov", "webm"], label: "MP4/MOV" },
  audio: { mimes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"], exts: ["mp3", "wav"], label: "MP3/WAV" },
  file: { mimes: [], exts: [], label: "文件" },
};

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function detectKind(file: File): AssetKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export async function getMediaMeta(file: File, kind: AssetKind): Promise<MediaMeta> {
  const allowed = ALLOWED_FORMATS[kind];
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const formatOk = kind === "file" ? true : allowed.mimes.includes(file.type) || allowed.exts.includes(ext);

  if (kind === "image" || kind === "file") return { kind, formatOk };

  return new Promise<MediaMeta>((resolve) => {
    const isVideo = kind === "video";
    const el = document.createElement(isVideo ? "video" : "audio") as HTMLVideoElement | HTMLAudioElement;
    el.preload = "metadata";
    el.muted = true;
    const url = URL.createObjectURL(file);
    el.src = url;

    let done = false;
    const finish = (meta: MediaMeta) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      try { el.remove(); } catch { /* ignore */ }
      resolve(meta);
    };
    const timer = setTimeout(() => finish({ kind, formatOk }), 5000);

    el.addEventListener("loadedmetadata", () => {
      const dur = (el as HTMLAudioElement & { duration: number }).duration;
      const meta: MediaMeta = { kind, formatOk, duration: isFinite(dur) ? dur : undefined };
      if (isVideo) {
        const v = el as HTMLVideoElement;
        meta.width = v.videoWidth;
        meta.height = v.videoHeight;
      }
      finish(meta);
    });
    el.addEventListener("error", () => finish({ kind, formatOk }));
  });
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; errorKey: string; errorParams?: Record<string, string | number> };

// 素材校验规则（由模型配置传入）
export interface AssetRules {
  maxSize: number;       // 字节
  minSeconds?: number;   // 视频/音频最小时长（秒）
  maxSeconds?: number;   // 视频/音频最大时长（秒）
}

export function validateAsset(file: File, meta: MediaMeta, rules: AssetRules): ValidateResult {
  if (!meta.formatOk) {
    const ext = (file.name.split(".").pop() || "?").toUpperCase();
    return { ok: false, errorKey: "gen.mediaFormat", errorParams: { name: file.name, ext, formats: ALLOWED_FORMATS[meta.kind].label } };
  }
  if (file.size > rules.maxSize) {
    return { ok: false, errorKey: "gen.mediaSize", errorParams: { name: file.name, size: formatSize(file.size), max: formatSize(rules.maxSize) } };
  }
  if (meta.duration !== undefined) {
    if (rules.minSeconds && meta.duration < rules.minSeconds) {
      return { ok: false, errorKey: "gen.mediaShort", errorParams: { name: file.name, duration: meta.duration.toFixed(1), min: rules.minSeconds } };
    }
    if (rules.maxSeconds && meta.duration > rules.maxSeconds) {
      return { ok: false, errorKey: "gen.mediaLong", errorParams: { name: file.name, duration: meta.duration.toFixed(1), max: rules.maxSeconds } };
    }
  }
  return { ok: true };
}

