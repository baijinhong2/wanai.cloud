"use client";

import { useEffect, useRef, useState } from "react";
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

function VideoCard({ item }: { item: SampleVideo }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  return (
    <div
      className="explore-card"
      onMouseEnter={() => { ref.current?.play().catch(() => {}); }}
      onMouseLeave={() => { const v = ref.current; if (v) { v.pause(); v.currentTime = 0; } }}
    >
      <video ref={ref} src={item.src} muted loop playsInline preload="metadata" />
      <div className="explore-card-overlay" />
      <span className="model-pill">{modelName(item.model)}</span>
    </div>
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
                <VideoCard key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
