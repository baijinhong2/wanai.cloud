"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "../lib/i18n";

// 图形滑块验证：上方为图形缺口区域，下方为滑动条（手指在下方拖动，不遮挡上方图形）
// 拖动滑块让拼图对准缺口即通过（纯前端 UI 校验）
const PS = 46;         // 拼图块 / 滑块手柄尺寸
const PH = 140;        // 上方图形区域高度
const TOLERANCE = 6;   // 对齐容差 px

function makeGraphic(): string {
  const W = 300;
  const H = 140;
  const colors = ["#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#e879f9"];
  let shapes = "";
  for (let i = 0; i < 26; i++) {
    const c = colors[(Math.random() * colors.length) | 0];
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const o = (0.3 + Math.random() * 0.6).toFixed(2);
    const kind = i % 3;
    if (kind === 0) {
      const r = 6 + Math.random() * 22;
      shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${o}"/>`;
    } else if (kind === 1) {
      const w = 16 + Math.random() * 60;
      const h = 10 + Math.random() * 34;
      shapes += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${c}" opacity="${o}" transform="rotate(${(Math.random() * 40 - 20).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
    } else {
      shapes += `<path d="M${cx.toFixed(1)} ${cy.toFixed(1)} l${(10 + Math.random() * 30).toFixed(1)} ${(10 + Math.random() * 26).toFixed(1)} l${(-20 - Math.random() * 30).toFixed(1)} ${(6 + Math.random() * 20).toFixed(1)} z" fill="${c}" opacity="${o}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#241c45"/><stop offset="1" stop-color="#14102b"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><g>${shapes}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function SlideCaptcha({ onChange }: { onChange: (verified: boolean) => void }) {
  const { t } = useI18n();
  const puzzleRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [graphic, setGraphic] = useState<string>(() => makeGraphic());
  const [notch, setNotch] = useState(() => ({ rx: 0.2 + Math.random() * 0.55, ry: 0.1 + Math.random() * 0.7 }));
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [verified, setVerified] = useState(false);
  const [failed, setFailed] = useState(false);

  const xRef = useRef(0);
  const notchXRef = useRef(0);
  const maxXRef = useRef(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startPieceRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const maxX = Math.max(0, w - PS);
  const notchX = Math.round(notch.rx * maxX);
  const notchY = Math.round(notch.ry * (PH - PS));
  notchXRef.current = notchX;
  maxXRef.current = maxX;

  useLayoutEffect(() => {
    const el = puzzleRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!draggingRef.current) return;
      const nx = Math.max(0, Math.min(maxXRef.current, startPieceRef.current + (e.clientX - startXRef.current)));
      xRef.current = nx;
      setX(nx);
    }
    function end() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      if (Math.abs(xRef.current - notchXRef.current) <= TOLERANCE) {
        xRef.current = notchXRef.current;
        setX(notchXRef.current);
        setVerified(true);
        setFailed(false);
        onChangeRef.current(true);
      } else {
        xRef.current = 0;
        setX(0);
        setNotch({ rx: 0.2 + Math.random() * 0.55, ry: 0.1 + Math.random() * 0.7 });
        setGraphic(makeGraphic());
        setVerified(false);
        setFailed(true);
        onChangeRef.current(false);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (verified) return;
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startPieceRef.current = xRef.current;
    setDragging(true);
    setFailed(false);
  }

  const bgSize = w > 0 ? `${w}px ${PH}px` : undefined;
  const pieceStyle: CSSProperties = {
    left: x,
    top: notchY,
    width: PS,
    height: PS,
    backgroundImage: graphic,
    backgroundSize: bgSize,
    backgroundPosition: `-${notchX}px -${notchY}px`,
  };

  return (
    <div className="sc-captcha">
      <div ref={puzzleRef} className={`sc-puzzle${verified ? " sc-puzzle--ok" : ""}${failed ? " sc-puzzle--fail" : ""}`}>
        <div className="sc-puzzle-bg" style={{ backgroundImage: graphic, backgroundSize: bgSize }} />
        {!verified && <div className="sc-notch" style={{ left: notchX, top: notchY, width: PS, height: PS }} />}
        {!verified && <div className="sc-piece" style={pieceStyle} />}
        {verified && <div className="sc-puzzle-ok">✓</div>}
      </div>

      <div className={`sc-slider${verified ? " sc-slider--ok" : ""}${failed ? " sc-slider--fail" : ""}`}>
        <div className="sc-slider-fill" style={{ width: x + PS }} />
        <div
          className="sc-slider-handle"
          style={{ left: x }}
          onPointerDown={onPointerDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={verified ? 100 : Math.round((x / Math.max(1, maxX)) * 100)}
          aria-label={t("auth.captchaTip")}
        >
          {verified ? "✓" : "→"}
        </div>
        <div className={`sc-slider-hint${dragging || verified ? " sc-slider-hint--hidden" : ""}`}>{t("auth.captchaTip")}</div>
      </div>

      <div className={`sc-msg${verified ? " sc-msg--ok" : failed ? " sc-msg--fail" : ""}`}>
        {verified ? t("auth.captchaVerified") : failed ? t("auth.captchaFailed") : ""}
      </div>
    </div>
  );
}
