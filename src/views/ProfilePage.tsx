"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

type RecordTab = "recharge" | "credits";

interface ProfileData {
  user?: { id: string; email: string; nickname: string };
  membership: { plan: string; started_at: string | null; expires_at: string | null };
  credits: { balance: number };
  stats: { totalGenerations: number };
}

function formatDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [recordTab, setRecordTab] = useState<RecordTab>("recharge");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [records, setRecords] = useState<unknown[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const email = user?.email || "";
  const nickname = profile?.user?.nickname || email.split("@")[0] || t("profile.user");
  const initial = (nickname.charAt(0) || "U").toUpperCase();
  const plan = profile?.membership?.plan || "free";
  const planLabel = plan === "free" ? t("profile.planFree") : plan.charAt(0).toUpperCase() + plan.slice(1);
  const balance = profile?.credits?.balance ?? 0;

  useEffect(() => {
    authFetch("/api/profile")
      .then(async (r) => { if (r.ok) setProfile(await r.json()); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setRecordsLoading(true);
    authFetch(`/api/records?type=${recordTab}`)
      .then(async (r) => {
        if (r.ok) setRecords((await r.json()).records || []);
        else setRecords([]);
      })
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [recordTab]);

  return (
    <>
      <main className="tool-main">
        <div className="profile">
          {/* 顶部：头像 + 昵称 + 邮箱 */}
          <div className="profile-head">
            <div className="profile-avatar">{initial}</div>
            <div className="profile-head-info">
              <h1>{nickname}</h1>
              <p className="profile-email">{email}</p>
            </div>
            <button type="button" className="profile-logout" onClick={logout}>{t("profile.logout")}</button>
          </div>

          {/* 会员信息板块 */}
          <div className="profile-card">
            <div className="profile-row">
              <span className="profile-row-label">{t("profile.membership")}</span>
              <span className="profile-row-value">{planLabel}</span>
            </div>
            <div className="profile-row">
              <span className="profile-row-label">{t("profile.credits")}</span>
              <span className="profile-row-value">{balance}</span>
            </div>
            <Link href="/pricing" className="profile-upgrade">{t("profile.upgrade")}</Link>
          </div>

          {/* 记录板块 */}
          <div className="profile-card">
            <div className="profile-tabs">
              <button type="button" className={`profile-tab ${recordTab === "recharge" ? "active" : ""}`} onClick={() => setRecordTab("recharge")}>{t("profile.tabRecharge")}</button>
              <button type="button" className={`profile-tab ${recordTab === "credits" ? "active" : ""}`} onClick={() => setRecordTab("credits")}>{t("profile.tabCredits")}</button>
            </div>
            <div className="profile-records">
              {recordsLoading ? (
                <p className="profile-record-empty">{t("profile.loading")}</p>
              ) : records.length === 0 ? (
                <p className="profile-record-empty">{recordTab === "recharge" ? t("profile.emptyRecharge") : t("profile.emptyCredits")}</p>
              ) : recordTab === "recharge" ? (
                records.map((r, i) => (
                  <div key={i} className="profile-record-item">
                    <div className="profile-record-main">
                      <span className="profile-record-title">{t("profile.rechargeItem", { credits: String((r as any).credits) })}</span>
                      <span className="profile-record-date">{formatDate((r as any).created_at)}</span>
                    </div>
                    <span className="profile-record-amount is-plus">¥{(r as any).amount}</span>
                  </div>
                ))
              ) : (
                records.map((r, i) => (
                  <div key={i} className="profile-record-item">
                    <div className="profile-record-main">
                      <span className="profile-record-title">{(r as any).description || t("profile.consumeFallback")}</span>
                      <span className="profile-record-date">{formatDate((r as any).created_at)}</span>
                    </div>
                    <span className="profile-record-amount">-{(r as any).credits_used} 积分</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
