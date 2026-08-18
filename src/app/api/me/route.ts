import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/helpers";
import { query } from "@/lib/server/db";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const uid = (user as any).id;
  const c = await query("select balance from wanai_credits where user_id = $1", [uid]);
  return NextResponse.json({ user, credits: { balance: c.rows[0]?.balance ?? 0 } });
}
