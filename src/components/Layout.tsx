"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE, TOOL_MENU } from "../lib/site";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

// 顶部导航
export function Header({ variant = "full", onToggleMobileMenu }: { variant?: "full" | "app"; onToggleMobileMenu?: () => void }) {
  const { user, credits, logout, openAuth } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const logoTo = user ? "/explore" : "/";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <header className={`site-header ${variant === "app" ? "site-header-app" : ""}`}>
      <div className="site-header-inner">
        {variant === "app" && (
          <button type="button" className="header-menu-btn" onClick={onToggleMobileMenu} aria-label={t("nav.openMenu")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
        )}
        {variant === "full" && (
          <Link href={logoTo} className="brand brand-wordmark" aria-label={user ? t("nav.brandExplore") : t("nav.brandHome")}>
            <img src="/logo-full.png" alt="WanAI.cloud" className="brand-wordmark-img" />
          </Link>
        )}

        {variant === "full" && (
          <nav className="site-nav" aria-label={t("lang.switch")}>
            <Link href="/explore" className={pathname === "/explore" ? "active" : ""}>{t("nav.explore")}</Link>
            {TOOL_MENU.map((m) => (
              <Link key={m.mode} href={m.path} className={pathname === m.path ? "active" : ""}>
                {t(`nav.${m.mode}`)}
              </Link>
            ))}
            <Link href="/pricing" className={pathname === "/pricing" ? "active" : ""}>{t("nav.pricing")}</Link>
          </nav>
        )}

        <div className="header-auth">
          <LanguageSwitcher />
          {variant === "app" && (user ? (
            <Link href="/pricing" className="header-premium-btn" title={t("profile.credits")} aria-label={t("profile.credits")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.2 9.6c0-1.1 1.3-1.8 2.8-1.8s2.8.7 2.8 1.8-1.3 1.8-2.8 1.8-2.8.7-2.8 1.8 1.3 1.8 2.8 1.8 2.8-.7 2.8-1.8" /></svg>
              <span>{credits ?? "…"}</span>
            </Link>
          ) : (
            <Link href="/pricing" className="header-premium-btn header-upgrade-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5 7 12l5-6.5L17 12l4-4.5-1.6 11.5H4.6L3 7.5z" /></svg>
              <span>{t("header.upgrade")}</span>
            </Link>
          ))}
          {user ? (
            <div className="header-user" ref={userMenuRef}>
              <button type="button" className="header-avatar" onClick={() => setUserMenuOpen((v) => !v)} aria-label={t("nav.userMenu")}>
                {user.email.charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="header-user-menu">
                  <div className="header-user-menu-email">{user.email}</div>
                  <Link href="/profile" className="header-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
                    {t("auth.profile")}
                  </Link>
                  <button type="button" className="header-user-menu-item" onClick={logout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    {t("auth.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button type="button" className="header-auth-btn" onClick={() => openAuth("login")}>{t("auth.login")}</button>
              <button type="button" className="header-auth-btn header-auth-btn-primary" onClick={() => openAuth("register")}>{t("auth.register")}</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// 页脚
export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col footer-brand">
          <div className="brand">
            <img src="/logo-full.png" alt="WanAI.cloud" className="brand-wordmark-img" />
          </div>
          <p className="footer-tagline">{t("footer.tagline")}</p>
        </div>

        <nav className="footer-col" aria-label={t("footer.products")}>
          <h4>{t("footer.products")}</h4>
          <ul>
            {TOOL_MENU.map((m) => (
              <li key={m.mode}><Link href={m.path}>{t(`nav.${m.mode}`)}</Link></li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-label={t("footer.models")}>
          <h4>{t("footer.models")}</h4>
          <ul>
            <li><Link href="/wan3-ai-video-generator">{t("footer.modelWan3")}</Link></li>
            <li><Link href="/minimaxh3-ai-video-generator">{t("footer.modelMinimaxH3")}</Link></li>
          </ul>
        </nav>

        <nav className="footer-col" aria-label={t("footer.company")}>
          <h4>{t("footer.company")}</h4>
          <ul>
            <li><Link href="/about">{t("footer.about")}</Link></li>
            <li><Link href="/contact">{t("footer.contact")}</Link></li>
            <li><Link href="/pricing">{t("footer.pricing")}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} {SITE.name}. {t("footer.rights")}</span>
        <span className="footer-links">
          <Link href="/privacy">{t("footer.privacy")}</Link>
          <Link href="/terms">{t("footer.terms")}</Link>
        </span>
      </div>
    </footer>
  );
}

// 功能页左侧菜单
function ToolIcon({ name }: { name: string }) {
  const common = {
    width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "text-to-video":
      return (
        <svg {...common}>
          <path d="M3 7h8" />
          <path d="M3 11h9" />
          <path d="M3 15h7" />
          <polygon points="15 8.5 20 12 15 15.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "image-to-video":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polygon points="9 8.5 9 15.5 15 12" fill="currentColor" stroke="none" />
        </svg>
      );
    case "reference-to-video":
      return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></svg>;
    case "explore":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
    case "home":
      return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case "pricing":
      return <svg {...common}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
    default:
      return null;
  }
}

export function Sidebar({ collapsed = false, onToggle, mobileOpen = false, onCloseMobile }: { collapsed?: boolean; onToggle?: () => void; mobileOpen?: boolean; onCloseMobile?: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const logoTo = user ? "/explore" : "/";

  return (
    <aside className={`tool-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`} aria-label={t("nav.functionMenu")}>
      <div className="tool-sidebar-head">
        <Link href={logoTo} className="tool-sidebar-brand" aria-label="WanAI.cloud" title="WanAI.cloud" onClick={onCloseMobile}>
          <img src="/logo-full.png" alt="WanAI.cloud" className="tool-sidebar-brand-img" />
        </Link>
        <button
          type="button"
          className="tool-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
          title={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
        </button>
      </div>

      <ul>
        <li>
          <Link href="/explore" className={`tool-side-link ${pathname === "/explore" ? "active" : ""}`} onClick={onCloseMobile}>
            <span className="tool-side-icon"><ToolIcon name="explore" /></span>
            <span className="tool-side-label">{t("nav.explore")}</span>
          </Link>
        </li>
        {TOOL_MENU.map((m) => (
          <li key={m.mode}>
            <Link href={m.path} className={`tool-side-link ${pathname === m.path ? "active" : ""}`} onClick={onCloseMobile}>
              <span className="tool-side-icon"><ToolIcon name={m.mode} /></span>
              <span className="tool-side-label">{t(`nav.${m.mode}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="tool-sidebar-bottom">
        <Link href="/" className={`tool-side-link ${pathname === "/" ? "active" : ""}`} onClick={onCloseMobile}>
          <span className="tool-side-icon"><ToolIcon name="home" /></span>
          <span className="tool-side-label">{t("nav.home")}</span>
        </Link>
        <Link href="/pricing" className={`tool-side-link tool-side-pricing ${pathname === "/pricing" ? "active" : ""}`} onClick={onCloseMobile}>
          <span className="tool-side-icon"><ToolIcon name="pricing" /></span>
          <span className="tool-side-label">{t("nav.pricing")}</span>
        </Link>
      </div>
    </aside>
  );
}

// 移动端底部菜单（explore / create / upgrade / profile）
const CREATE_MODES = ["image-to-video", "reference-to-video", "text-to-video"] as const;

export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const createActive = CREATE_MODES.some((m) => pathname === `/${m}`);

  return (
    <nav className="mobile-tabbar" aria-label={t("nav.functionMenu")}>
      <Link href="/explore" className={`mobile-tab-item ${pathname === "/explore" ? "is-active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
        <span>{t("nav.explore")}</span>
      </Link>

      <Link href="/image-to-video" className={`mobile-tab-item ${createActive ? "is-active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        <span>{t("nav.create")}</span>
      </Link>

      <Link href="/pricing" className={`mobile-tab-item mobile-tab-upgrade ${pathname === "/pricing" ? "is-active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5 7 12l5-6.5L17 12l4-4.5-1.6 11.5H4.6L3 7.5z" /></svg>
        <span>{t("nav.upgrade")}</span>
      </Link>

      <Link href="/profile" className={`mobile-tab-item ${pathname === "/profile" ? "is-active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
        <span>{t("nav.profile")}</span>
      </Link>
    </nav>
  );
}

// 工具页顶部模式切换 tab（image / reference / text 三个页面互切）
const TOOL_MODES = [
  { path: "/image-to-video", key: "image-to-video" },
  { path: "/reference-to-video", key: "reference-to-video" },
  { path: "/text-to-video", key: "text-to-video" },
] as const;

export function ToolModeTabs() {
  const { t } = useI18n();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // 切换 tab 时自动横向滚动，让当前 tab 完整可见（尽量居中）
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>(".tool-mode-tab.is-active");
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const target = nav.scrollLeft + (activeRect.left - navRect.left) - (nav.clientWidth - activeRect.width) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [pathname]);

  return (
    <nav ref={navRef} className="tool-mode-tabs" aria-label={t("nav.functionMenu")}>
      {TOOL_MODES.map((m) => (
        <Link key={m.path} href={m.path} className={`tool-mode-tab ${pathname === m.path ? "is-active" : ""}`}>
          {t(`nav.${m.key}`)}
        </Link>
      ))}
    </nav>
  );
}
