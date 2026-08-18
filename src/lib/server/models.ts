// src/lib/server/models.ts — 共享模型适配层（MiniMax H3 / 可选 METASO 代理）
import { uploadToStorage } from "./storage";

const VIDEO_API_BASE = process.env.VIDEO_API_BASE || "https://api.minimaxi.com";
const VIDEO_API_KEY = process.env.VIDEO_API_KEY || process.env.MINIMAX_API_KEY;

interface RefFile {
  kind: string;
  role?: string;
  name?: string;
  type?: string;
  buffer: Buffer;
}

interface CreateParams {
  mode: string;
  prompt: string;
  duration?: number;
  resolution?: string;
  ratio?: string;
  files?: RefFile[];
  order?: unknown;
  enhancePrompt?: boolean | string;
}

function translateMentionSyntax(prompt: string) {
  return String(prompt || "").replace(/@(image|video|audio|file)(\d+)/gi, (_m, kind: string, n: string) => {
    return `@${kind.charAt(0).toUpperCase() + kind.slice(1)}${n}`;
  });
}

async function enhancePromptWithContextIR({ content, duration, ratio }: { content: any[]; duration: number; ratio?: string }) {
  const createResp = await fetch(`${VIDEO_API_BASE}/v2/h3_context_ir`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VIDEO_API_KEY}` },
    body: JSON.stringify({ model: "MiniMax-H3", content, duration, ratio }),
  });
  const createText = await createResp.text();
  if (!createResp.ok) throw new Error(`H3-Context-IR 创建失败：${createResp.status}；${createText}`);
  const createData = JSON.parse(createText);
  const irTaskId = createData?.task_id || createData?.data?.task_id;
  if (!irTaskId) throw new Error(`H3-Context-IR 未返回 task_id：${createText}`);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch(`${VIDEO_API_BASE}/v2/query/video_generation/${irTaskId}`, {
      headers: { Authorization: `Bearer ${VIDEO_API_KEY}` },
    });
    if (!r.ok) continue;
    let data: any;
    try { data = JSON.parse(await r.text()); } catch { continue; }
    const task = data?.task;
    if (!task) continue;
    const status = String(task.status || "").toLowerCase();
    if (status === "succeeded") return task?.content?.prompt;
    if (["failed", "cancelled", "expired"].includes(status)) {
      throw new Error(task?.error?.message || `H3-Context-IR 任务失败：${status}`);
    }
  }
  throw new Error("H3-Context-IR 任务超时。");
}

async function createVideoTask({ content, duration, resolution, ratio }: { content: any[]; duration: number; resolution: string; ratio?: string }) {
  const r = await fetch(`${VIDEO_API_BASE}/v2/video_generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VIDEO_API_KEY}` },
    body: JSON.stringify({ model: "MiniMax-H3", content, resolution, duration, ratio }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`视频创建失败：${r.status}；${text}`);
  const data = JSON.parse(text);
  const taskId = data?.task_id || data?.data?.task_id;
  if (!taskId) throw new Error(`视频创建未返回 task_id：${text}`);
  return taskId;
}

async function pollVideoTaskOnce(taskId: string) {
  const r = await fetch(`${VIDEO_API_BASE}/v2/query/video_generation/${taskId}`, {
    headers: { Authorization: `Bearer ${VIDEO_API_KEY}` },
  });
  if (!r.ok) return { status: "running" };
  let data: any;
  try { data = JSON.parse(await r.text()); } catch { return { status: "running" }; }
  const task = data?.task;
  if (!task) return { status: "running" };
  const status = String(task.status || "").toLowerCase();
  if (status === "succeeded") return { status: "succeeded", videoUrl: task?.content?.url };
  if (["failed", "cancelled", "expired"].includes(status)) {
    return { status: "failed", error: task?.error?.message || `任务失败：${status}` };
  }
  return { status: "running" };
}

const minimaxH3 = {
  id: "minimax-h3",
  name: "MiniMax H3",
  capabilities: ["t2v", "i2v", "reference"],

  async createTask({ mode, prompt, duration, resolution, ratio, files = [], order, enhancePrompt }: CreateParams) {
    if (!VIDEO_API_KEY) throw new Error("缺少生视频 API Key（VIDEO_API_KEY / MINIMAX_API_KEY）。");
    const dur = Math.min(15, Math.max(4, Number(duration) || 6));
    const res_ = ["768P", "2K"].includes(String(resolution)) ? String(resolution) : "768P";
    const content: any[] = [{ type: "text", text: String(prompt || "").slice(0, 7000) }];

    if (mode === "firstFrame" || mode === "firstLastFrame") {
      const first = files.find((f) => f.kind === "image" && f.role === "firstFrame");
      if (!first) throw new Error("首帧模式需要 firstFrame 图片。");
      const firstUrl = await uploadToStorage(first.buffer, first.type, first.name);
      content.push({ type: "image_url", image_url: { url: firstUrl }, role: "first_frame" });
      if (mode === "firstLastFrame") {
        const last = files.find((f) => f.kind === "image" && f.role === "lastFrame");
        if (!last) throw new Error("首尾帧模式需要 lastFrame 图片。");
        const lastUrl = await uploadToStorage(last.buffer, last.type, last.name);
        content.push({ type: "image_url", image_url: { url: lastUrl }, role: "last_frame" });
      }
      return await createVideoTask({ content, duration: dur, resolution: res_, ratio: "adaptive" });
    }

    if (mode === "reference") {
      const images = files.filter((f) => f.kind === "image");
      const videos = files.filter((f) => f.kind === "video");
      const audios = files.filter((f) => f.kind === "audio");
      if (images.length + videos.length + audios.length === 0) {
        throw new Error("参考生视频至少需要一个素材（图片 / 视频 / 音频）。");
      }
      if (audios.length > 0 && images.length === 0 && videos.length === 0) {
        throw new Error("参考音频必须搭配至少一个图片或视频。");
      }
      const translated = translateMentionSyntax(String(prompt || ""));
      content[0] = { type: "text", text: translated.slice(0, 7000) };
      for (const img of images) {
        const url = await uploadToStorage(img.buffer, img.type, img.name);
        content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
      }
      for (const v of videos) {
        const url = await uploadToStorage(v.buffer, v.type, v.name);
        content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
      }
      for (const a of audios) {
        const url = await uploadToStorage(a.buffer, a.type, a.name);
        content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" });
      }
      const shouldEnhance = enhancePrompt === true || enhancePrompt === "true" || enhancePrompt === "1";
      if (shouldEnhance) {
        try {
          const enhanced = await enhancePromptWithContextIR({ content, duration: dur, ratio });
          content[0] = { type: "text", text: String(enhanced).slice(0, 7000) };
        } catch (e: any) {
          console.warn("[H3-Context-IR] failed, fallback to raw prompt:", e.message);
        }
      }
      return await createVideoTask({ content, duration: dur, resolution: res_, ratio: ratio || "adaptive" });
    }

    const T2V_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
    const ratio2 = T2V_RATIOS.includes(String(ratio)) ? String(ratio) : "16:9";
    return await createVideoTask({ content, duration: dur, resolution: res_, ratio: ratio2 });
  },

  async queryTask(taskId: string) {
    return pollVideoTaskOnce(taskId);
  },
};

// ── Wan 3.0（阿里云百炼 / DashScope）适配器 ────────────────────────────
const WAN_API_KEY = process.env.DASHSCOPE_API_KEY;
const WAN_WORKSPACE = process.env.DASHSCOPE_WORKSPACE_ID;
const WAN_REGION = process.env.DASHSCOPE_REGION || "cn-beijing";
const WAN_ENDPOINT = WAN_WORKSPACE ? `https://${WAN_WORKSPACE}.${WAN_REGION}.maas.aliyuncs.com` : "";

// 把前端 @imageN / @videoN / @audioN 引用翻译成 Wan 的「图N / 视频N / 音频N」
function translateWanMentionSyntax(prompt: string) {
  return String(prompt || "")
    .replace(/@image(\d+)/gi, "图$1")
    .replace(/@video(\d+)/gi, "视频$1")
    .replace(/@audio(\d+)/gi, "音频$1");
}

// Wan 分辨率：前端直接传 480P / 720P / 1080P，透传即可；非法值回退 720P
function mapWanResolution(resolution?: string) {
  const supported = ["480P", "720P", "1080P"];
  return supported.includes(String(resolution)) ? String(resolution) : "720P";
}

// Wan 比例：auto → adaptive，21:9 不支持则回退 adaptive
function mapWanRatio(ratio?: string) {
  const supported = ["16:9", "4:3", "1:1", "3:4", "9:16"];
  return supported.includes(String(ratio)) ? String(ratio) : "adaptive";
}

const wan3 = {
  id: "wan-3.0",
  name: "Wan 3.0",
  capabilities: ["t2v", "i2v", "reference"],

  async createTask({ mode, prompt, duration, resolution, ratio, files = [] }: CreateParams) {
    if (!WAN_API_KEY || !WAN_ENDPOINT) {
      throw new Error("缺少 Wan 3.0 配置（DASHSCOPE_API_KEY / DASHSCOPE_WORKSPACE_ID）。");
    }
    const dur = Math.min(30, Math.max(2, Math.round(Number(duration) || 5)));
    const media: { type: string; url: string }[] = [];

    if (mode === "firstFrame" || mode === "firstLastFrame") {
      const first = files.find((f) => f.kind === "image" && f.role === "firstFrame");
      if (!first) throw new Error("首帧模式需要 firstFrame 图片。");
      media.push({ type: "first_frame", url: await uploadToStorage(first.buffer, first.type, first.name) });
      if (mode === "firstLastFrame") {
        const last = files.find((f) => f.kind === "image" && f.role === "lastFrame");
        if (!last) throw new Error("首尾帧模式需要 lastFrame 图片。");
        media.push({ type: "last_frame", url: await uploadToStorage(last.buffer, last.type, last.name) });
      }
    } else if (mode === "reference") {
      for (const img of files.filter((f) => f.kind === "image")) {
        media.push({ type: "reference_image", url: await uploadToStorage(img.buffer, img.type, img.name) });
      }
      for (const v of files.filter((f) => f.kind === "video")) {
        media.push({ type: "reference_video", url: await uploadToStorage(v.buffer, v.type, v.name) });
      }
      for (const a of files.filter((f) => f.kind === "audio")) {
        media.push({ type: "reference_audio", url: await uploadToStorage(a.buffer, a.type, a.name) });
      }
    }

    const input: Record<string, unknown> = { prompt: translateWanMentionSyntax(String(prompt || "")).slice(0, 20000) };
    if (media.length) input.media = media;

    const r = await fetch(`${WAN_ENDPOINT}/api/v1/services/aigc/video-generation/video-synthesis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WAN_API_KEY}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wan3.0-video",
        input,
        parameters: {
          resolution: mapWanResolution(resolution),
          ratio: mapWanRatio(ratio),
          duration: dur,
          watermark: false,
        },
      }),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`Wan 3.0 任务创建失败：HTTP ${r.status}；${text}`);
    const data = JSON.parse(text);
    const taskId = data?.output?.task_id;
    if (!taskId) throw new Error(`Wan 3.0 未返回 task_id：${text}`);
    return taskId;
  },

  async queryTask(taskId: string) {
    if (!WAN_API_KEY || !WAN_ENDPOINT) {
      throw new Error("缺少 Wan 3.0 配置（DASHSCOPE_API_KEY / DASHSCOPE_WORKSPACE_ID）。");
    }
    const r = await fetch(`${WAN_ENDPOINT}/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${WAN_API_KEY}` },
    });
    if (!r.ok) return { status: "running" };
    let data: any;
    try { data = JSON.parse(await r.text()); } catch { return { status: "running" }; }
    const out = data?.output;
    if (!out) return { status: "running" };
    const status = String(out.task_status || "").toUpperCase();
    if (status === "SUCCEEDED") return { status: "succeeded", videoUrl: out.video_url };
    if (status === "FAILED" || status === "CANCELED") {
      return { status: "failed", error: out.message || out.code || `任务失败：${status}` };
    }
    if (status === "UNKNOWN") return { status: "failed", error: "任务不存在或已过期。" };
    return { status: "running" };
  },
};

const registry: Record<string, any> = {
  "minimax-h3": minimaxH3,
  "wan-3.0": wan3,
  // seedance 2.5 暂走 wan3.0 接口（前端不告知用户）
  "seedance-2.5": wan3,
};

export function getAdapter(id: string) {
  return registry[id] || minimaxH3;
}

export function encodeTaskId(modelId: string, externalTaskId: string) {
  return `${modelId}:${externalTaskId}`;
}
export function decodeTaskId(taskId: string) {
  const idx = String(taskId).indexOf(":");
  if (idx === -1) return { modelId: "minimax-h3", externalTaskId: taskId };
  return { modelId: taskId.slice(0, idx), externalTaskId: taskId.slice(idx + 1) };
}

export { registry };
