import { NextResponse } from "next/server";
import { register } from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await register(body.email, body.password);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
