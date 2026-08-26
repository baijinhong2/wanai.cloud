"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export default function AuthModal() {
  const { authOpen, authMode, closeAuth, openAuth, login, register, sendCode } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 打开弹窗或切换登录/注册时：重置验证码、确认密码、勾选状态与错误提示
  useEffect(() => {
    if (!authOpen) return;
    setConfirmPassword("");
    setCode("");
    setAgreed(false);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(0);
  }, [authOpen, authMode]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (!authOpen) return null;

  const isLogin = authMode === "login";

  async function handleSendCode() {
    if (cooldown > 0 || sending) return;
    const em = email.trim();
    if (!EMAIL_RE.test(em)) { setError(t("auth.emailInvalid")); return; }
    setSending(true);
    setError(null);
    const err = await sendCode(em);
    setSending(false);
    if (err) { setError(err); return; }
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const em = email.trim();
    if (!EMAIL_RE.test(em)) {
      setError(t("auth.emailInvalid"));
      return;
    }
    if (!isLogin && password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (!isLogin && !agreed) {
      setError(t("auth.agreeRequired"));
      return;
    }
    if (!isLogin) {
      const c = code.trim();
      if (!CODE_RE.test(c)) { setError(t("auth.codeRequired")); return; }
      setSubmitting(true);
      const err = await register(em, password, c);
      setSubmitting(false);
      if (err) setError(err);
    } else {
      setSubmitting(true);
      const err = await login(em, password);
      setSubmitting(false);
      if (err) setError(err);
    }
  }

  return (
    <div className="auth-modal-backdrop" onClick={closeAuth}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label={isLogin ? t("auth.login") : t("auth.register")} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={closeAuth} aria-label={t("gen.close")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="auth-modal-brand">
          <span className="auth-modal-logo">W</span>
        </div>
        <h3 className="auth-modal-title">{isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}</h3>
        <p className="auth-modal-sub">{isLogin ? t("auth.loginSub") : t("auth.registerSub")}</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>{t("auth.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.placeholderEmail")}
              autoFocus
              autoComplete="email"
            />
          </label>
          <label className="auth-field">
            <span>{t("auth.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.placeholderPassword")}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </label>
          {!isLogin && (
            <label className="auth-field">
              <span>{t("auth.confirmPassword")}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("auth.placeholderConfirmPassword")}
                autoComplete="new-password"
              />
            </label>
          )}
          {!isLogin && (
            <label className="auth-field">
              <span>{t("auth.verifyCode")}</span>
              <div className="auth-code-row">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("auth.placeholderCode")}
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="auth-code-btn"
                  disabled={cooldown > 0 || sending}
                  onClick={handleSendCode}
                >
                  {sending ? "…" : cooldown > 0 ? t("auth.codeCooldown").replace("{s}", String(cooldown)) : t("auth.sendCode")}
                </button>
              </div>
            </label>
          )}
          {!isLogin && (
            <label className="auth-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-required="true" />
              <span>
                {t("auth.agreePrefix")}{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">{t("auth.agreeTerms")}</Link>
                {" "}{t("auth.agreeAnd")}{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">{t("auth.agreePrivacy")}</Link>
              </span>
            </label>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? t("auth.submitting") : isLogin ? t("auth.login") : t("auth.register")}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}
          <button type="button" onClick={() => openAuth(isLogin ? "register" : "login")}>
            {isLogin ? t("auth.switchToRegister") : t("auth.switchToLogin")}
          </button>
        </p>
      </div>
    </div>
  );
}
