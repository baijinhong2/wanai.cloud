import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/helpers";
import { query } from "@/lib/server/db";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const uid = (user as any).id;
  const [membership, credits, tasks] = await Promise.all([
    query("select plan, started_at, expires_at from wanai_memberships where user_id = $1 order by created_at desc limit 1", [uid]),
    query("select balance from wanai_credits where user_id = $1", [uid]),
    query("select count(*)::int as total from wanai_generation_tasks where user_id = $1", [uid]),
  ]);

  return NextResponse.json({
    user,
    membership: membership.rows[0] || { plan: "free", started_at: null, expires_at: null },
    credits: { balance: credits.rows[0]?.balance ?? 0 },
    stats: { totalGenerations: tasks.rows[0]?.total ?? 0 },
  });
}
