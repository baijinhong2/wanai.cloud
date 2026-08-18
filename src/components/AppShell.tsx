"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { I18nProvider } from "../lib/i18n";
import { AuthProvider, useAuth } from "../lib/auth";
import { Header, Footer, Sidebar, MobileTabBar } from "./Layout";
import LanguageBanner from "./LanguageBanner";
import AuthModal from "./AuthModal";

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`app ${isHome ? "app-home" : "app-shell"}${!isHome && sidebarCollapsed ? " is-collapsed" : ""}`}>
      {!isHome && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      )}
      {!isHome && mobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <div className="app-body">
        <LanguageBanner />
        <Header variant={isHome ? "full" : "app"} onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)} />
        <div className="app-main">{children}</div>
        {(isHome || !user) && <Footer />}
      </div>
      <MobileTabBar />
      <AuthModal />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <Shell>{children}</Shell>
      </AuthProvider>
    </I18nProvider>
  );
}
