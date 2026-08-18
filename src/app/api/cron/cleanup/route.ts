import { NextResponse } from "next/server";
import { deleteExpiredObjects } from "@/lib/server/storage";

// Vercel Cron 调用：清理过期的素材（12h）与生成视频（24h）
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { deleted } = await deleteExpiredObjects();
  return NextResponse.json({ ok: true, deleted });
}
