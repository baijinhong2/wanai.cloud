"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "../lib/i18n";
import { SAMPLE_VIDEOS, modelName, shuffle, type SampleVideo } from "../lib/samples";

function splitColumns<T>(items: T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push(item));
  return cols;
}

function useColumnCount() {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const mqLg = window.matchMedia("(max-width: 980px)");
    const mqSm = window.matchMedia("(max-width: 640px)");
    // 移动端 / 平板双列，桌面三列
    const update = () => setCount(mqSm.matches ? 2 : mqLg.matches ? 2 : 3);
    update();
    mqLg.addEventListener("change", update);
    mqSm.addEventListener("change", update);
    return () => {
      mqLg.removeEventListener("change", update);
      mqSm.removeEventListener("change", update);
    };
  }, []);
  return count;
}

function VideoCard({ item, onOpen }: { item: SampleVideo; onOpen: (item: SampleVideo) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  return (
    <button
      type="button"
      className="explore-card explore-card-btn"
      onClick={() => onOpen(item)}
      onMouseEnter={() => { ref.current?.play().catch(() => {}); }}
      onMouseLeave={() => { const v = ref.current; if (v) { v.pause(); v.currentTime = 0; } }}
      aria-label={`${modelName(item.model)} · ${item.id}`}
    >
      <video ref={ref} src={item.src} muted loop playsInline preload="metadata" />
      <div className="explore-card-overlay" />
      <span className="model-pill">{modelName(item.model)}</span>
    </button>
  );
}

export default function ExplorePage() {
  const { t } = useI18n();
  // 初始用固定顺序（SSR 可见），挂载后随机打乱（不按模型、不按画面比例）
  const [items, setItems] = useState<SampleVideo[]>(SAMPLE_VIDEOS);
  useEffect(() => {
    setItems(shuffle(SAMPLE_VIDEOS));
  }, []);
  const columns = splitColumns(items, useColumnCount());

  const [active, setActive] = useState<SampleVideo | null>(null);

  // Esc 关闭弹窗 + 打开时锁定背景滚动
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  return (
    <main className="tool-main">
      <section className="explore">
        <div className="explore-head">
          <h1>{t("explore.title")}</h1>
          <p>{t("explore.subtitle")}</p>
        </div>

        <div className="explore-grid">
          {columns.map((col, i) => (
            <div className="explore-col" key={i}>
              {col.map((item) => (
                <VideoCard key={item.id} item={item} onOpen={setActive} />
              ))}
            </div>
          ))}
        </div>
      </section>

      {active && (
        <div className="explore-modal-backdrop" onClick={() => setActive(null)}>
          <div className="explore-modal" role="dialog" aria-modal="true" aria-label={modelName(active.model)} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="explore-modal-close" onClick={() => setActive(null)} aria-label={t("gen.close")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="explore-modal-media">
              <video src={active.src} controls autoPlay playsInline />
              <span className="model-pill">{modelName(active.model)}</span>
            </div>
            <div className="explore-modal-foot">
              <p className="explore-modal-hint">{t("explore.sameStyleHint")}</p>
              <Link href={`/image-to-video?model=${active.model}`} className="explore-modal-cta" onClick={() => setActive(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                {t("explore.sameStyle")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
