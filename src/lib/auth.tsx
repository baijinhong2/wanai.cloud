"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "wanai_token";

export interface AuthUser {
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  credits: number | null;
  refreshCredits: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, code?: string) => Promise<string | null>;
  sendCode: (email: string) => Promise<string | null>;
  logout: () => Promise<void>;
  requireAuth: () => boolean;
  authOpen: boolean;
  authMode: "login" | "register";
  openAuth: (mode?: "login" | "register") => void;
  closeAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 带 token 的 fetch，供登录态相关请求使用
export function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...options, headers });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const refreshCredits = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setCredits(null); return; }
    try {
      const r = await authFetch("/api/me");
      if (r.ok) {
        const data = await r.json();
        setUser(data.user);
        setCredits(data.credits?.balance ?? 0);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setCredits(null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    authFetch("/api/me")
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setUser(data.user);
          setCredits(data.credits?.balance ?? 0);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await authFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return data.error || "登录失败";
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setAuthOpen(false);
    refreshCredits();
    return null;
  }, [refreshCredits]);

  const register = useCallback(async (email: string, password: string, code?: string) => {
    const r = await authFetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password, code }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return data.error || "注册失败";
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setAuthOpen(false);
    refreshCredits();
    return null;
  }, [refreshCredits]);

  const sendCode = useCallback(async (email: string) => {
    const r = await authFetch("/api/send-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return data.error || "验证码发送失败";
    return null;
  }, []);

  const logout = useCallback(async () => {
    try { await authFetch("/api/logout", { method: "POST" }); } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setCredits(null);
    router.push("/explore");
  }, [router]);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setAuthMode("login");
    setAuthOpen(true);
    return false;
  }, [user]);

  const openAuth = useCallback((mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, credits, refreshCredits, login, register, sendCode, logout, requireAuth, authOpen, authMode, openAuth, closeAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
