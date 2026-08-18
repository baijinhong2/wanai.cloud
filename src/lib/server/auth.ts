// src/lib/server/auth.ts — 邮箱 + 密码认证（Supabase Postgres 存储，无状态签名 token）
import crypto from "crypto";
import { query } from "./db";

const SECRET = process.env.AUTH_SECRET || "wanai-dev-secret-change-me";
const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000; // 30 天
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function signToken(uid: string) {
  const payload = { uid, exp: Date.now() + TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string | null | undefined) {
  if (!token || typeof token !== "string") return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload: any;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (!payload || !payload.uid) return null;
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export async function register(email: string, password: string) {
  const e = normalizeEmail(email);
  if (!EMAIL_RE.test(e)) return { error: "请输入有效的邮箱地址" };
  if (!password || String(password).length < 6) return { error: "密码至少 6 位" };

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const nickname = e.split("@")[0];

  try {
    const ins = await query(
      "insert into wanai_users (email, password_salt, password_hash, nickname) values ($1,$2,$3,$4) returning id",
      [e, salt, hash, nickname]
    );
    const userId = (ins.rows[0] as any).id;
    await query("insert into wanai_memberships (user_id, plan) values ($1,'free')", [userId]);
    await query("insert into wanai_credits (user_id, balance) values ($1,30)", [userId]);
    return { token: signToken(userId), user: { id: userId, email: e, nickname } };
  } catch (err: any) {
    if (err && err.code === "23505") return { error: "该邮箱已注册，请直接登录" };
    console.error("[auth] register error:", err && err.message);
    return { error: "注册失败，请稍后重试" };
  }
}

export async function login(email: string, password: string) {
  const e = normalizeEmail(email);
  const r = await query(
    "select id, email, nickname, password_salt, password_hash from wanai_users where email = $1",
    [e]
  );
  const u = r.rows[0] as any;
  if (!u) return { error: "该邮箱尚未注册" };
  if (hashPassword(password, u.password_salt) !== u.password_hash) return { error: "邮箱或密码不正确" };
  return { token: signToken(u.id), user: { id: u.id, email: u.email, nickname: u.nickname } };
}

export async function getUserByToken(token: string | null | undefined) {
  const payload = verifyToken(token);
  if (!payload) return null;
  const r = await query("select id, email, nickname from wanai_users where id = $1", [payload.uid]);
  return r.rows[0] || null;
}

export function logout() {}

export { hashPassword, verifyToken };
