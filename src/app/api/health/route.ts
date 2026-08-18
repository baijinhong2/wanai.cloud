import { NextResponse } from "next/server";
import { registry } from "@/lib/server/models";

export async function GET() {
  return NextResponse.json({
    ok: true,
    models: Object.keys(registry),
    hasApiKey: Boolean(process.env.MINIMAX_API_KEY),
    hasDb: Boolean(process.env.DATABASE_URL),
  });
}
