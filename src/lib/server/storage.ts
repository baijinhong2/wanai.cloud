// src/lib/server/storage.ts — Supabase Storage 文件上传（返回公网 URL）+ 过期清理
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "wanai-assets";

// 保留时长：素材 12 小时，生成视频 24 小时
const TTL_MS: Record<string, number> = {
  asset: 12 * 3600 * 1000,
  video: 24 * 3600 * 1000,
};

function extFromType(type?: string, name?: string) {
  if (type) {
    const t = String(type).toLowerCase();
    if (t.includes("png")) return "png";
    if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
    if (t.includes("webp")) return "webp";
    if (t.includes("gif")) return "gif";
    if (t.includes("mp4")) return "mp4";
    if (t.includes("webm")) return "webm";
    if (t.includes("quicktime") || t.includes("mov")) return "mov";
    if (t.includes("mpeg")) return "mp3";
    if (t.includes("mp3")) return "mp3";
    if (t.includes("wav")) return "wav";
    if (t.includes("ogg")) return "ogg";
  }
  const ext = String(name || "").split(".").pop() || "";
  return /^[a-zA-Z0-9]{1,5}$/.test(ext) ? ext : "bin";
}

export type StorageKind = "asset" | "video";

export async function uploadToStorage(buffer: Buffer, type?: string, name?: string, kind: StorageKind = "asset") {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("缺少 Supabase Storage 配置（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）");
  }
  const ext = extFromType(type, name);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
  const path = `${env}/${kind}/${filename}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": type || "application/octet-stream",
    },
    body: buffer as unknown as BodyInit,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Supabase Storage 上传失败：HTTP ${r.status}；${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// 把第三方 CDN 的视频下载并转存到 Supabase（24h 保留）
export async function uploadVideoFromUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`下载视频失败：HTTP ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  return uploadToStorage(buffer, "video/mp4", "generated.mp4", "video");
}

// 清理过期对象（素材 12h / 视频 24h），供定时任务调用
export async function deleteExpiredObjects(): Promise<{ deleted: number }> {
  if (!SUPABASE_URL || !SERVICE_KEY) return { deleted: 0 };
  const now = Date.now();
  let deleted = 0;

  for (const env of ["dev", "prod"]) {
    const listResp = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix: `${env}/`, limit: 1000 }),
    });
    if (!listResp.ok) continue;
    const items = (await listResp.json().catch(() => [])) as { name: string }[];
    const expired: string[] = [];
    for (const item of items) {
      const parts = item.name.split("/");
      const kind = parts[1];
      const filename = parts[parts.length - 1];
      const ts = parseInt(filename.split("-")[0], 10);
      const ttl = TTL_MS[kind];
      if (!ts || !ttl) continue;
      if (now - ts > ttl) expired.push(item.name);
    }
    if (expired.length) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: expired }),
      });
      deleted += expired.length;
    }
  }

  return { deleted };
}
