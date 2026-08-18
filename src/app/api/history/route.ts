import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/helpers";
import { query } from "@/lib/server/db";

// 生成历史（刷新页面后用于恢复结果列表）
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const uid = (user as any).id;
  const r = await query(
    "select id, model, mode, sub_mode, prompt, resolution, duration, ratio, status, video_url, error, credits_cost, created_at from wanai_generation_tasks where user_id = $1 order by created_at desc limit 50",
    [uid]
  );
  return NextResponse.json({ tasks: r.rows });
}
