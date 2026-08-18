import { NextResponse } from "next/server";
import { login } from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await login(body.email, body.password);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json(result);
}
