// src/lib/server/helpers.ts — Route Handler 公共辅助
import { getUserByToken } from "./auth";

export function bearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return auth;
}

export async function requireUser(req: Request) {
  return getUserByToken(bearerToken(req));
}
