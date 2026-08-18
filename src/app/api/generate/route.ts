import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/helpers";
import { query } from "@/lib/server/db";
import { getAdapter, encodeTaskId } from "@/lib/server/models";

function decodeDataUrl(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!m) throw new Error("无效的 dataUrl（必须形如 data:image/png;base64,…）");
  return { type: m[1], buffer: Buffer.from(m[2], "base64") };
}

function detectKind(type?: string, name?: string) {
  if (type) {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
  }
  const ext = (name || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["mp3", "wav"].includes(ext)) return "audio";
  return "image";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const modelId = body.model || "minimax-h3";
    const adapter = getAdapter(modelId);
    const uid = (user as any).id;
    const creditsCost = Math.max(0.1, Number(body.credits) || 0);

    // 1. 查余额
    const balRes = await query("select balance from wanai_credits where user_id = $1", [uid]);
    if ((balRes.rows[0]?.balance ?? 0) < creditsCost) {
      return NextResponse.json({ error: "积分不足，请充值后再试" }, { status: 402 });
    }

    // 2. 解码文件
    const filesIn = Array.isArray(body.files) ? body.files : [];
    const files = filesIn.map((f: any) => {
      const { type, buffer } = decodeDataUrl(f.dataUrl);
      return { kind: f.kind || detectKind(type, f.name), role: f.role, name: f.name, type, buffer };
    });

    // 3. 创建外部任务
    const externalTaskId = await adapter.createTask({
      mode: body.mode,
      prompt: body.prompt,
      duration: body.duration,
      resolution: body.resolution,
      ratio: body.ratio,
      files,
      order: body.order,
      enhancePrompt: body.enhancePrompt,
    });

    // 4. 扣积分
    const creditRes = await query(
      "update wanai_credits set balance = balance - $1, updated_at = now() where user_id = $2 and balance >= $1 returning balance",
      [creditsCost, uid]
    );
    if (creditRes.rows.length === 0) {
      return NextResponse.json({ error: "积分不足，请充值后再试" }, { status: 402 });
    }

    // 5. 落任务历史
    const taskRes = await query(
      "insert into wanai_generation_tasks (user_id, external_task_id, mode, sub_mode, prompt, resolution, duration, ratio, status, credits_cost) values ($1,$2,$3,$4,$5,$6,$7,$8,'queued',$9) returning id",
      [uid, externalTaskId, body.genMode || body.mode || null, body.subMode || null, body.prompt || null, body.resolution || null, body.duration || null, body.ratio || null, creditsCost]
    );
    const dbTaskId = taskRes.rows[0].id;

    // 6. 写积分消耗记录
    await query(
      "insert into wanai_credit_records (user_id, credits_used, type, related_task_id, description) values ($1,$2,'generate',$3,$4)",
      [uid, creditsCost, dbTaskId, `生成视频（${modelId}）`]
    );

    return NextResponse.json({ taskId: encodeTaskId(modelId, externalTaskId), status: "queued" });
  } catch (err: any) {
    return NextResponse.json({ error: err && err.message ? err.message : "AI 生视频失败。" }, { status: 500 });
  }
}
