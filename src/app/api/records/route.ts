import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/helpers";
import { query } from "@/lib/server/db";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const uid = (user as any).id;
  const type = new URL(req.url).searchParams.get("type") === "credits" ? "credits" : "recharge";

  if (type === "recharge") {
    const r = await query(
      "select amount, credits, method, status, created_at from wanai_recharge_records where user_id = $1 order by created_at desc limit 50",
      [uid]
    );
    return NextResponse.json({ records: r.rows });
  }
  const r = await query(
    "select credits_used, type, description, created_at from wanai_credit_records where user_id = $1 order by created_at desc limit 50",
    [uid]
  );
  return NextResponse.json({ records: r.rows });
}
