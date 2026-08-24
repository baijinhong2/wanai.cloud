"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import SlideCaptcha from "./SlideCaptcha";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthModal() {
  const { authOpen, authMode, closeAuth, openAuth, login, register } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 打开弹窗或切换登录/注册时：重置验证码、确认密码、勾选状态与错误提示
  useEffect(() => {
    if (!authOpen) return;
    setCaptchaVerified(false);
    setConfirmPassword("");
    setAgreed(false);
    setError(null);
  }, [authOpen, authMode]);

  if (!authOpen) return null;

  const isLogin = authMode === "login";

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
    if (!captchaVerified) {
      setError(t("auth.captchaRequired"));
      return;
    }
    if (!isLogin && !agreed) {
      setError(t("auth.agreeRequired"));
      return;
    }

    setSubmitting(true);
    const err = isLogin ? await login(em, password) : await register(em, password);
    setSubmitting(false);
    if (err) setError(err);
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
          <SlideCaptcha key={authMode} onChange={setCaptchaVerified} />
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
