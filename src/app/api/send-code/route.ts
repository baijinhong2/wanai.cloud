import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_MS = 5 * 60 * 1000; // 验证码 5 分钟有效
const COOLDOWN_MS = 60 * 1000; // 同一邮箱 60 秒内只能发一次
const MAX_PER_EMAIL_PER_DAY = 10; // 单邮箱每日上限，防滥用

// 生成 6 位数字验证码
function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[send-code] RESEND_API_KEY 未配置");
    return NextResponse.json({ error: "邮件服务未配置，请联系 support@wanai.cloud" }, { status: 500 });
  }

  try {
    // 1. 限流：60 秒内不能重复发
    const recent = await query(
      "select created_at from wanai_verify_codes where email = $1 order by created_at desc limit 1",
      [email]
    );
    if (recent.rows.length > 0) {
      const last = new Date((recent.rows[0] as any).created_at).getTime();
      if (Date.now() - last < COOLDOWN_MS) {
        const wait = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
        return NextResponse.json({ error: `发送过于频繁，请 ${wait} 秒后再试` }, { status: 429 });
      }
    }

    // 2. 单日上限
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayCount = await query(
      "select count(*)::int as n from wanai_verify_codes where email = $1 and created_at >= $2",
      [email, dayStart]
    );
    if ((dayCount.rows[0] as any).n >= MAX_PER_EMAIL_PER_DAY) {
      return NextResponse.json({ error: "今日发送次数已达上限，请明天再试" }, { status: 429 });
    }

    // 3. 生成验证码并入库（把该邮箱旧的未用验证码标记为已用）
    const code = genCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await query("update wanai_verify_codes set used = true where email = $1 and used = false", [email]);
    await query(
      "insert into wanai_verify_codes (email, code, expires_at) values ($1, $2, $3)",
      [email, code, expiresAt]
    );

    // 4. 调 Resend 发信
    const from = process.env.RESEND_FROM || "WanAI.cloud <no-reply@wanai.cloud>";
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `[WanAI.cloud] Your verification code is ${code}`,
        html: `
          <div style="font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0d1117;color:#e6edf3;border-radius:12px;">
            <div style="text-align:center;margin-bottom:20px;">
              <span style="font-size:20px;font-weight:800;background:linear-gradient(90deg,#5B3FD9,#22D3EE);-webkit-background-clip:text;background-clip:text;color:transparent;">WanAI.cloud</span>
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:24px;text-align:center;">
              <p style="margin:0 0 12px;font-size:15px;color:#8b949e;">Your email verification code is</p>
              <p style="margin:0 0 16px;font-size:34px;font-weight:800;letter-spacing:8px;color:#22D3EE;">${code}</p>
              <p style="margin:0;font-size:13px;color:#8b949e;">This code is valid for 5 minutes. Do not share it with anyone.</p>
            </div>
            <p style="text-align:center;font-size:12px;color:#484f58;margin-top:20px;">If you did not request this email, you can safely ignore it.</p>
          </div>
        `,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[send-code] Resend error:", resp.status, text);
      return NextResponse.json({ error: "验证码发送失败，请稍后重试或联系 support@wanai.cloud" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "验证码已发送，请查收邮箱" });
  } catch (err: any) {
    console.error("[send-code] error:", err && err.message);
    return NextResponse.json({ error: "验证码发送失败，请稍后重试" }, { status: 500 });
  }
}
