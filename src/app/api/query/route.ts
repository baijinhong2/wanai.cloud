import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/helpers";
import { query } from "@/lib/server/db";
import { getAdapter, decodeTaskId } from "@/lib/server/models";
import { uploadVideoFromUrl } from "@/lib/server/storage";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const taskId = new URL(req.url).searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });

    const { modelId, externalTaskId } = decodeTaskId(String(taskId));
    const adapter = getAdapter(modelId);
    const result = await adapter.queryTask(externalTaskId);

    let finalUrl = result.videoUrl;

    if (result.status === "succeeded" && result.videoUrl) {
      // 视频转存到 Supabase（24h 保留），避免重复转存
      const existing = await query(
        "select video_url from wanai_generation_tasks where external_task_id = $1",
        [externalTaskId]
      );
      const existingUrl = existing.rows[0]?.video_url;
      if (existingUrl && existingUrl.includes("/storage/v1/object/public/")) {
        finalUrl = existingUrl;
      } else {
        try {
          finalUrl = await uploadVideoFromUrl(result.videoUrl);
        } catch (e: any) {
          console.warn("[storage] 视频转存失败，回退原始链接：", e?.message);
          finalUrl = result.videoUrl;
        }
      }
      await query(
        "update wanai_generation_tasks set status='succeeded', video_url=$1, error=null, updated_at=now() where external_task_id=$2",
        [finalUrl, externalTaskId]
      ).catch(() => {});
    } else if (result.status === "failed") {
      await query(
        "update wanai_generation_tasks set status='failed', error=$1, updated_at=now() where external_task_id=$2",
        [result.error || null, externalTaskId]
      ).catch(() => {});
    }

    return NextResponse.json({ taskId, ...result, videoUrl: finalUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err && err.message ? err.message : "查询任务失败。" }, { status: 500 });
  }
}
