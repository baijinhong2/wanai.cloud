"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AssetKind, RefAsset, detectKind, formatSize, genId, getMediaMeta, validateAsset } from "../lib/mediaMeta";
import { MODELS, getModel, buildAccept, type ModelId, type Resolution, type Ratio } from "../lib/modelConfig";
import { PromptEditor, mentionFor, createChipElement, remapPromptReferences, extractPromptText } from "../components/PromptEditor";
import { authFetch, useAuth } from "../lib/auth";
import { computeCredits, sumVideoSeconds } from "../lib/credits";
import { useI18n } from "../lib/i18n";
import { SAMPLE_VIDEOS, shuffle, type SampleVideo } from "../lib/samples";
import type { GenMode } from "../lib/site";

// ── 类型 ────────────────────────────────────────────────────────────────
type SubMode = "firstFrame" | "firstLastFrame";
type VideoResultStatus = "generating" | "success" | "error";

interface SubmittedAsset { kind: AssetKind; name: string; preview?: string; }

interface VideoResult {
  id: string;
  status: VideoResultStatus;
  videoUrl?: string;
  error?: string;
  mode: GenMode;
  subMode?: SubMode;
  model?: ModelId;
  resolution: Resolution;
  duration: number;
  ratio: Ratio;
  prompt: string;
  assets: SubmittedAsset[];
}

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_TIMES = 180;

// 全局：同时只允许播放一个生成结果视频（播放新视频时自动暂停上一个）
let playingVideo: HTMLVideoElement | null = null;

interface Props { mode: GenMode; onModeChange?: (m: GenMode) => void; showHeader?: boolean; defaultModel?: ModelId; }

// ── 主组件 ──────────────────────────────────────────────────────────────
export default function AiVideoGenerator({ mode, onModeChange, showHeader = true, defaultModel = "minimax-h3" }: Props) {
  const { requireAuth, refreshCredits, user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<GenMode>(mode);
  const [subMode, setSubMode] = useState<SubMode>("firstFrame");

  const defaultCfg = getModel(defaultModel);
  const [model, setModel] = useState<ModelId>(defaultModel);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<Resolution>(defaultCfg.defaultResolution);
  const [ratio, setRatio] = useState<Ratio>(defaultCfg.defaultRatio);
  const [duration, setDuration] = useState<number>(defaultCfg.defaultDuration);

  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null);

  const [refAssets, setRefAssets] = useState<RefAsset[]>([]);
  const [refError, setRefError] = useState<string | null>(null);

  const [results, setResults] = useState<VideoResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentModel = getModel(model);
  const assetTypes = currentModel.assets.types;
  const typeMap = new Map(assetTypes.map((t) => [t.kind, t]));

  useEffect(() => {
    return () => {
      for (const a of refAssets) if (a.preview) URL.revokeObjectURL(a.preview);
      if (firstFramePreview) URL.revokeObjectURL(firstFramePreview);
      if (lastFramePreview) URL.revokeObjectURL(lastFramePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 刷新后从后端恢复生成历史（成功/失败的任务），只加载一次
  const historyLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    authFetch("/api/history")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const restored: VideoResult[] = (data.tasks || [])
          .filter((t: any) => t.status === "succeeded" || t.status === "failed")
          .map((t: any): VideoResult => ({
            id: `db-${t.id}`,
            status: t.status === "succeeded" ? "success" : "error",
            videoUrl: t.video_url || undefined,
            error: t.error || undefined,
            mode: (["text-to-video", "image-to-video", "reference-to-video"].includes(t.mode) ? t.mode : "text-to-video") as GenMode,
            subMode: (t.sub_mode === "firstLastFrame" || t.sub_mode === "firstFrame" ? t.sub_mode : undefined) as SubMode | undefined,
            model: (["minimax-h3", "wan-3.0", "seedance-2.5"].includes(t.model) ? t.model : undefined) as ModelId | undefined,
            resolution: t.resolution as Resolution,
            duration: Number(t.duration) || 0,
            ratio: t.ratio as Ratio,
            prompt: t.prompt || "",
            assets: (Array.isArray(t.assets)
              ? t.assets.map((a: any) => ({ kind: (a.kind === "video" || a.kind === "audio" || a.kind === "image" ? a.kind : "image") as AssetKind, name: a.name || "" }))
              : []),
          }));
        if (restored.length > 0) setResults((prev) => [...restored, ...prev]);
      })
      .catch(() => {});
  }, [user]);

  function changeTab(m: GenMode) { setTab(m); if (onModeChange) onModeChange(m); }
  function changeSubMode(s: SubMode) { setSubMode(s); if (onModeChange) onModeChange("image-to-video"); }

  // 切换模型：把分辨率/比例/时长收敛到新模型支持范围
  function handleModelChange(id: ModelId) {
    setModel(id);
    const cfg = getModel(id);
    if (!cfg.resolutions.includes(resolution)) setResolution(cfg.defaultResolution);
    if (ratio === "auto" ? !cfg.ratios.includes("auto") : !cfg.ratios.includes(ratio)) setRatio(cfg.defaultRatio);
    if (duration < cfg.durationMin || duration > cfg.durationMax) setDuration(cfg.defaultDuration);
    // 清掉新模型不支持的已上传参考素材
    setRefAssets((prev) => {
      const supported = new Set(cfg.assets.types.map((t) => t.kind));
      const kept = prev.filter((a) => supported.has(a.kind));
      for (const a of prev) if (!supported.has(a.kind) && a.preview) URL.revokeObjectURL(a.preview);
      return kept;
    });
  }

  function makeAsset(file: File, kind: AssetKind, duration?: number): RefAsset {
    const hasPreview = kind === "image" || kind === "video" || kind === "audio";
    return { id: genId(), file, kind, preview: hasPreview ? URL.createObjectURL(file) : undefined, name: file.name, size: file.size, duration };
  }
  function pushRefError(msg: string) { setRefError((cur) => (cur ? `${cur} · ${msg}` : msg)); }

  async function processFiles(files: File[]) {
    setRefError(null);
    const accepted: RefAsset[] = [];
    const rejected: string[] = [];

    for (const f of files) {
      const kind = detectKind(f);
      const typeCfg = kind ? typeMap.get(kind) : undefined;
      if (!kind || !typeCfg) { rejected.push(t("gen.rejectType", { name: f.name })); continue; }

      const rules = {
        maxSize: typeCfg.maxSizeMB * 1024 * 1024,
        minSeconds: typeCfg.minSeconds,
        maxSeconds: typeCfg.maxSeconds,
      };

      if (kind === "image") {
        const v = validateAsset(f, { kind, formatOk: true }, rules);
        if (v.ok) accepted.push(makeAsset(f, kind)); else rejected.push(t(v.errorKey, v.errorParams));
        continue;
      }
      try {
        const meta = await getMediaMeta(f, kind);
        const v = validateAsset(f, meta, rules);
        if (v.ok) accepted.push(makeAsset(f, kind, meta.duration)); else rejected.push(t(v.errorKey, v.errorParams));
      } catch { rejected.push(t("gen.rejectRead", { name: f.name })); }
    }

    if (accepted.length > 0) {
      // 数量上限校验放在同步代码里（基于当前已上传素材），确保超限能给出明确提示
      const counts: Record<string, number> = {};
      for (const a of refAssets) counts[a.kind] = (counts[a.kind] || 0) + 1;
      let total = refAssets.length;
      const toAdd: RefAsset[] = [];
      for (const a of accepted) {
        const tc = typeMap.get(a.kind);
        if (!tc) { rejected.push(t("gen.rejectType", { name: a.name })); continue; }
        if (total >= currentModel.assets.total) { rejected.push(t("gen.limitTotal", { name: a.name, max: currentModel.assets.total })); continue; }
        const c = counts[a.kind] || 0;
        if (c >= tc.maxCount) { rejected.push(t("gen.limitKind", { name: a.name, kind: t(`gen.kind.${a.kind}`), max: tc.maxCount })); continue; }
        counts[a.kind] = c + 1; total++;
        toAdd.push(a);
      }
      if (toAdd.length > 0) setRefAssets((prev) => [...prev, ...toAdd]);
    }
    if (rejected.length > 0) pushRefError(rejected.join(" · "));
  }

  function pickRefAssets(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processFiles(files);
    e.target.value = "";
  }
  function pickFirstFrame(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (firstFramePreview) URL.revokeObjectURL(firstFramePreview);
    setFirstFrame(f); setFirstFramePreview(f ? URL.createObjectURL(f) : null); e.target.value = "";
  }
  function pickLastFrame(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (lastFramePreview) URL.revokeObjectURL(lastFramePreview);
    setLastFrame(f); setLastFramePreview(f ? URL.createObjectURL(f) : null); e.target.value = "";
  }
  function removeRefAsset(id: string) {
    const removed = refAssets.find((a) => a.id === id);
    const remaining = refAssets.filter((a) => a.id !== id);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    setRefAssets(remaining);
    // 删除素材后：重排同种类素材序号，并同步清理/改名提示词里的 @引用
    setPrompt((p) => remapPromptReferences(p, refAssets, remaining));
  }

  const promptRef = useRef<HTMLDivElement | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const mentionAtRef = useRef<{ atNode: Text; atOffset: number } | null>(null);

  function closeMention() {
    setMentionOpen(false);
    setMentionPos(null);
    mentionAtRef.current = null;
  }

  // @ 触发检测：光标前是 @ 且后面是字母/数字（如 @、@image、@image1）时弹出素材选择
  function checkMentionTrigger() {
    const root = promptRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { closeMention(); return; }
    const range = sel.getRangeAt(0);
    if (!range.collapsed) { closeMention(); return; }
    if (!root.contains(range.startContainer)) { closeMention(); return; }
    const node = range.startContainer as Text;
    if (node.nodeType !== Node.TEXT_NODE) { closeMention(); return; }
    const before = (node.textContent || "").slice(0, range.startOffset);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) { closeMention(); return; }
    const after = before.slice(atIdx + 1);
    if (!/^[a-z0-9]{0,12}$/i.test(after)) { closeMention(); return; }
    mentionAtRef.current = { atNode: node, atOffset: atIdx };
    const rect = range.getBoundingClientRect();
    const wrapRect = root.getBoundingClientRect();
    setMentionPos({ top: rect.bottom - wrapRect.top + 6, left: rect.left - wrapRect.left });
    setMentionOpen(true);
  }

  // 选择素材：把 @部分 替换成 chip
  function pickMention(assetId: string) {
    const root = promptRef.current;
    const locked = mentionAtRef.current;
    if (!root) return;
    let atNode: Text | null = locked?.atNode ?? null;
    if (!atNode || !root.contains(atNode)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && sel.getRangeAt(0).startContainer.nodeType === Node.TEXT_NODE) {
        atNode = sel.getRangeAt(0).startContainer as Text;
      }
    }
    if (!atNode) { closeMention(); return; }
    const asset = refAssets.find((a) => a.id === assetId);
    const mention = mentionFor(refAssets, assetId);
    if (!asset || !mention) { closeMention(); return; }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { closeMention(); return; }
    const curRange = sel.getRangeAt(0);
    const curOffsetInText = atNode === curRange.startContainer ? curRange.startOffset : atNode.length;
    const fromOffset = locked?.atOffset ?? 0;
    const range = document.createRange();
    range.setStart(atNode, fromOffset);
    range.setEnd(atNode, curOffsetInText);
    range.deleteContents();

    const chip = createChipElement(asset, mention);
    const space = document.createTextNode("\u200B");
    range.insertNode(space);
    space.parentNode?.insertBefore(chip, space);
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    closeMention();
    setPrompt(extractPromptText(root));
    root.focus();
  }

  // 点击素材 chip 的「引用」按钮：在光标处直接插入 @imageN chip
  function insertMentionAtCursor(assetId: string) {
    const root = promptRef.current;
    if (!root) return;
    const asset = refAssets.find((a) => a.id === assetId);
    const mention = mentionFor(refAssets, assetId);
    if (!asset || !mention) return;
    root.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) {
      range.selectNodeContents(root);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const chip = createChipElement(asset, mention);
    const space = document.createTextNode("\u200B");
    range.deleteContents();
    range.insertNode(space);
    space.parentNode?.insertBefore(chip, space);
    range.setStartAfter(space);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    setPrompt(extractPromptText(root));
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error(t("gen.fileReadFail")));
      r.readAsDataURL(file);
    });
  }

  const currentMode = tab;

  // 实时计算本次生成消耗的积分（随素材 / 配置 / 模型变化）
  function calcCredits(): number {
    const refVideoSeconds = tab === "reference-to-video"
      ? sumVideoSeconds(refAssets.filter((a) => a.kind === "video"))
      : 0;
    return computeCredits(currentModel.billing, resolution, duration, refVideoSeconds);
  }

  function buildPayload(currentPrompt: string, currentSubMode: SubMode, assetsToSend: RefAsset[] | { firstFrame: File | null; lastFrame: File | null }) {
    const isRef = currentMode === "reference-to-video";
    if (isRef) {
      return {
        model, mode: "reference", prompt: currentPrompt, duration, resolution,
        ratio: ratio === "auto" ? "adaptive" : ratio,
        credits: calcCredits(), genMode: currentMode,
        order: (assetsToSend as RefAsset[]).map((a) => a.kind),
        files: (assetsToSend as RefAsset[]).map((a) => ({ kind: a.kind, name: a.name, dataUrl: (a as RefAsset & { __dataUrl?: string }).__dataUrl })),
      };
    }
    const frames = assetsToSend as { firstFrame: File | null; lastFrame: File | null };
    const isImage = currentMode === "image-to-video";
    return {
      model,
      mode: isImage ? currentSubMode : "text-to-video",
      prompt: currentPrompt,
      duration,
      resolution,
      ratio: isImage ? "adaptive" : (ratio === "auto" ? "16:9" : ratio),
      credits: calcCredits(), genMode: currentMode,
      files: [
        frames.firstFrame ? { kind: "image", role: "firstFrame", name: frames.firstFrame.name, dataUrl: (frames.firstFrame as File & { __dataUrl?: string }).__dataUrl } : null,
        currentSubMode === "firstLastFrame" && frames.lastFrame ? { kind: "image", role: "lastFrame", name: frames.lastFrame.name, dataUrl: (frames.lastFrame as File & { __dataUrl?: string }).__dataUrl } : null,
      ].filter(Boolean),
    };
  }

  async function preparePayloadAndBuild(usePrompt: string, useSubMode: SubMode, assetsOrFrames: RefAsset[] | { firstFrame: File | null; lastFrame: File | null }): Promise<Record<string, unknown>> {
    if (Array.isArray(assetsOrFrames)) {
      for (const a of assetsOrFrames) (a as RefAsset & { __dataUrl?: string }).__dataUrl = await fileToDataUrl(a.file);
    } else {
      const fr = assetsOrFrames;
      if (fr.firstFrame) (fr.firstFrame as File & { __dataUrl?: string }).__dataUrl = await fileToDataUrl(fr.firstFrame);
      if (fr.lastFrame) (fr.lastFrame as File & { __dataUrl?: string }).__dataUrl = await fileToDataUrl(fr.lastFrame);
    }
    const payload = buildPayload(usePrompt, useSubMode, assetsOrFrames);
    const size = new Blob([JSON.stringify(payload)]).size;
    if (size > 4.5 * 1024 * 1024) throw new Error(t("gen.fileTooLarge", { size: (size / 1024 / 1024).toFixed(1) }));
    return payload as Record<string, unknown>;
  }

  async function submitAndPoll(localId: string, payload: Record<string, unknown>) {
    const submitRes = await authFetch("/api/generate", { method: "POST", body: JSON.stringify(payload) });
    const submitText = await submitRes.text();
    if (!submitRes.ok) {
      let msg = submitText || t("gen.submitFail", { code: submitRes.status });
      try { msg = JSON.parse(submitText).error || msg; } catch { /* keep raw */ }
      throw new Error(msg);
    }
    const { taskId: serverTaskId } = JSON.parse(submitText);
    if (!serverTaskId) throw new Error(t("gen.noTaskId"));
    // 扣费已完成，立即刷新头部剩余积分
    await refreshCredits();
    for (let i = 0; i < POLL_MAX_TIMES; i += 1) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const qRes = await authFetch(`/api/query?taskId=${encodeURIComponent(serverTaskId)}`);
        if (!qRes.ok) continue;
        const qData = JSON.parse(await qRes.text());
        if (qData.status === "succeeded") { setResults((prev) => prev.map((r) => (r.id === localId ? { ...r, status: "success", videoUrl: qData.videoUrl } : r))); return; }
        if (qData.status === "failed") { setResults((prev) => prev.map((r) => (r.id === localId ? { ...r, status: "error", error: qData.error || t("gen.taskFailed") } : r))); return; }
      } catch { /* 继续 */ }
    }
    setResults((prev) => prev.map((r) => (r.id === localId ? { ...r, status: "error", error: t("gen.taskTimeout") } : r)));
  }

  function validateBeforeSubmit(): string | null {
    if (!prompt.trim()) return t("gen.needPrompt");
    if (currentMode === "image-to-video") {
      if (!firstFrame) return t("gen.needFirstFrame");
      if (subMode === "firstLastFrame" && !lastFrame) return t("gen.needLastFrame");
    }
    if (currentMode === "reference-to-video") {
      if (refAssets.length === 0) return t("gen.needRef");
      const hasAudio = refAssets.some((a) => a.kind === "audio");
      const hasVisual = refAssets.some((a) => a.kind === "image" || a.kind === "video");
      if (hasAudio && !hasVisual) return t("gen.refAudioNeedVisual");
    }
    return null;
  }

  function buildSubmittedAssets(): SubmittedAsset[] {
    if (currentMode === "image-to-video") {
      return firstFrame
        ? [{ kind: "image" as const, name: firstFrame.name, preview: firstFramePreview ?? undefined },
          ...(subMode === "firstLastFrame" && lastFrame ? [{ kind: "image" as const, name: lastFrame.name, preview: lastFramePreview ?? undefined }] : [])]
        : [];
    }
    if (currentMode === "reference-to-video") return refAssets.map((a) => ({ kind: a.kind, name: a.name, preview: a.preview }));
    return [];
  }

  async function handleGenerate() {
    if (submitting) return;
    if (!requireAuth()) return;
    const errMsg = validateBeforeSubmit();
    if (errMsg) { setError(errMsg); return; }
    setError(null);
    const localId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setResults((prev) => [
      { id: localId, status: "generating", mode: currentMode, subMode: currentMode === "image-to-video" ? subMode : undefined, model, resolution, duration, ratio, prompt, assets: buildSubmittedAssets() },
      ...prev,
    ]);
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 300);
    try {
      const assetsOrFrames = currentMode === "reference-to-video" ? refAssets : { firstFrame, lastFrame };
      const payload = await preparePayloadAndBuild(prompt, subMode, assetsOrFrames);
      await submitAndPoll(localId, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("gen.genFail");
      setResults((prev) => prev.map((r) => (r.id === localId ? { ...r, status: "error", error: msg } : r)));
    }
  }

  async function handleRetry(id: string) {
    const target = results.find((r) => r.id === id);
    if (!target) return;
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status: "generating" as const, error: undefined } : r)));
    try {
      const assetsOrFrames = target.mode === "reference-to-video" ? refAssets : { firstFrame, lastFrame };
      const payload = await preparePayloadAndBuild(target.prompt, (target.subMode || subMode), assetsOrFrames);
      await submitAndPoll(id, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("gen.genFail");
      setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status: "error" as const, error: msg } : r)));
    }
  }

  function deleteResult(id: string) { setResults((prev) => prev.filter((r) => r.id !== id)); }

  const ratioLabel = tab === "image-to-video" ? t("gen.auto") : (ratio === "auto" ? t("gen.auto") : ratio);

  return (
    <div className="gen">
      <div className="gen-body">
        {/* 左：配置 */}
        <div className="gen-config">
          {showHeader && (
            <div className="gen-tabs" role="tablist">
              <button role="tab" aria-selected={tab === "reference-to-video"} className={`gen-tab ${tab === "reference-to-video" ? "active" : ""}`} onClick={() => changeTab("reference-to-video")}>{t("gen.tab.ref")}</button>
              <button role="tab" aria-selected={tab === "image-to-video"} className={`gen-tab ${tab === "image-to-video" ? "active" : ""}`} onClick={() => changeTab("image-to-video")}>{t("gen.tab.image")}</button>
              <button role="tab" aria-selected={tab === "text-to-video"} className={`gen-tab ${tab === "text-to-video" ? "active" : ""}`} onClick={() => changeTab("text-to-video")}>{t("gen.tab.text")}</button>
            </div>
          )}
          {!showHeader && (
            <div className="gen-config-head">
              <h3 className="gen-config-title">{t(`nav.${tab}`)}</h3>
            </div>
          )}

          {/* 模型选择器 */}
          <ModelDropdown value={model} onChange={handleModelChange} />

          {/* 素材上传（放在提示词上面） */}
          {tab === "image-to-video" && (
            <>
              <div className="gen-subtabs">
                <button className={`gen-subtab ${subMode === "firstFrame" ? "active" : ""}`} onClick={() => changeSubMode("firstFrame")}>{t("gen.firstFrame")}</button>
                <button className={`gen-subtab ${subMode === "firstLastFrame" ? "active" : ""}`} onClick={() => changeSubMode("firstLastFrame")}>{t("gen.firstLastFrame")}</button>
              </div>
              <div className={`gen-frame-row ${subMode === "firstLastFrame" ? "is-two" : "is-one"}`}>
                <FrameUploader label={t("gen.firstFrameLabel")} preview={firstFramePreview} onPick={pickFirstFrame} onClear={() => { if (firstFramePreview) URL.revokeObjectURL(firstFramePreview); setFirstFrame(null); setFirstFramePreview(null); }} />
                {subMode === "firstLastFrame" && (
                  <FrameUploader label={t("gen.lastFrameLabel")} preview={lastFramePreview} onPick={pickLastFrame} onClear={() => { if (lastFramePreview) URL.revokeObjectURL(lastFramePreview); setLastFrame(null); setLastFramePreview(null); }} />
                )}
              </div>
            </>
          )}

          {tab === "reference-to-video" && (
            <div className="gen-row">
              <div className="gen-row-head">
                <span className="gen-label">{t("gen.refAssets")}</span>
                <span className="gen-hint-row">{refAssets.length}/{currentModel.assets.total}</span>
              </div>
              <label className="gen-dropzone">
                <Icon name="upload" size={22} />
                <span className="gen-dropzone-title">{t("gen.uploadRef")}</span>
                <small>{t("gen.uploadRefSub")}</small>
                <input type="file" hidden multiple accept={buildAccept(assetTypes)} onChange={pickRefAssets} />
              </label>
              {refAssets.length > 0 && (
                <div className="gen-assets">
                  {refAssets.map((a) => (
                    <AssetChip key={a.id} asset={a} mention={mentionFor(refAssets, a.id)} onInsert={insertMentionAtCursor} onRemove={removeRefAsset} />
                  ))}
                </div>
              )}
              {refError && <p className="gen-warn">{refError}</p>}
              <div className="gen-counts">
                {assetTypes.map((type) => {
                  const count = refAssets.filter((a) => a.kind === type.kind).length;
                  return (
                    <span key={type.kind} className="gen-count"><Icon name={type.kind} size={13} /> {t(`gen.kind.${type.kind}`)} {count}/{type.maxCount}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 提示词（可输入并显示 @ 素材引用） */}
          <div className="gen-row">
            <div className="gen-row-head">
              <label className="gen-label">{t("gen.prompt")}</label>
            </div>
            <div className="gen-prompt-wrap">
              <PromptEditor
                ref={promptRef}
                value={prompt}
                onChange={setPrompt}
                refAssets={tab === "reference-to-video" ? refAssets : undefined}
                onTriggerMention={checkMentionTrigger}
                onBlur={() => setTimeout(closeMention, 150)}
                placeholder={
                  tab === "reference-to-video"
                    ? t("gen.placeholder.ref")
                    : tab === "image-to-video"
                      ? t("gen.placeholder.image")
                      : t("gen.placeholder.text")
                }
                maxLength={currentModel.promptMaxLength}
                minHeight={110}
                maxHeight={320}
              />
              {tab === "reference-to-video" && mentionOpen && refAssets.length > 0 && mentionPos && (
                <div className="gen-mention" style={{ top: mentionPos.top, left: mentionPos.left }}>
                  <MentionPicker assets={refAssets} onPick={pickMention} onClose={closeMention} />
                </div>
              )}
            </div>
            <div className="gen-char-count">{prompt.length} / {currentModel.promptMaxLength}</div>
          </div>

          {/* 底部操作栏：参数选择 + 生成按钮 + 错误提示（sticky 始终在视口底部可见） */}
          <div className="gen-bottom">
            <ParamsDropdown
              model={currentModel}
              resolution={resolution} duration={duration} ratio={ratio} ratioLocked={tab === "image-to-video"}
              onResolution={setResolution} onDuration={setDuration} onRatio={setRatio}
            />
            <button className="gen-submit" disabled={submitting} onClick={handleGenerate}>
              <Icon name="sparkles" />
              <span>{t("gen.generate")} · {calcCredits()} {t("gen.credits")}</span>
            </button>
            {error && <p className="gen-error">{error}</p>}
          </div>
        </div>

        {/* 右：结果 / Sample */}
        <div className="gen-output">
          <div className="gen-output-head">
            <h3>{t("gen.results")}</h3>
            {results.length === 0 && <span className="gen-sample-badge">{t("gen.sample")}</span>}
          </div>
          {results.length === 0 ? (
            <SampleGallery />
          ) : (
            <div className="gen-results">
              {results.map((r) => (
                <ResultItem key={r.id} result={r} onRetry={() => handleRetry(r.id)} onDelete={() => deleteResult(r.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 自定义下拉：模型选择器 ────────────────────────────────────────────
function ModelDropdown({ value, onChange }: { value: ModelId; onChange: (id: ModelId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = getModel(value);

  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className="dd dd-down" ref={ref}>
      <button type="button" className="dd-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <img src={current.logo} className="dd-logo" alt="" />
        <span className="dd-value">{current.name}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="dd-menu" role="listbox">
          {MODELS.map((m) => (
            <button key={m.id} type="button" className={`dd-option ${m.id === value ? "is-active" : ""}`} onClick={() => { onChange(m.id); setOpen(false); }}>
              <img src={m.logo} className="dd-logo" alt="" />
              <span className="dd-option-main">
                <span className="dd-option-name">{m.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 自定义下拉：参数设置（分辨率 / 时长 / 比例） ────────────────────────
function ParamsDropdown({ model, resolution, duration, ratio, ratioLocked, onResolution, onDuration, onRatio }: {
  model: ReturnType<typeof getModel>;
  resolution: Resolution; duration: number; ratio: Ratio; ratioLocked: boolean;
  onResolution: (r: Resolution) => void; onDuration: (d: number) => void; onRatio: (r: Ratio) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ratioLabel = ratioLocked ? t("gen.auto") : (ratio === "auto" ? t("gen.auto") : ratio);

  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className="dd" ref={ref}>
      <button type="button" className="dd-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="settings" size={14} />
        <span className="dd-value">{resolution} · {duration}s · {ratioLabel}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="dd-panel" role="dialog">
          <div className="dd-panel-group">
            <span className="dd-panel-label">{t("gen.resolution")}</span>
            <div className="dd-segmented">
              {model.resolutions.map((r) => (
                <button key={r} type="button" className={`dd-segment ${resolution === r ? "active" : ""}`} onClick={() => onResolution(r)}>{r}</button>
              ))}
            </div>
          </div>
          <div className="dd-panel-group">
            <span className="dd-panel-label">{t("gen.duration", { duration })}</span>
            <input type="range" min={model.durationMin} max={model.durationMax} step={1} value={duration} onChange={(e) => onDuration(Number(e.target.value))} className="dd-slider" />
            <div className="dd-slider-scale"><span>{model.durationMin}s</span><span>{model.durationMax}s</span></div>
          </div>
          <div className="dd-panel-group">
            <span className="dd-panel-label">{t("gen.ratio")}</span>
            {ratioLocked ? (
              <p className="dd-locked">{t("gen.ratioLocked")}</p>
            ) : (
              <div className="dd-segmented dd-segmented-wide">
                {model.ratios.map((r) => (
                  <button key={r} type="button" className={`dd-segment ${ratio === r ? "active" : ""}`} onClick={() => onRatio(r)}>{r === "auto" ? t("gen.auto") : r}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sample 画廊 ────────────────────────────────────────────────────────
function SampleGallery() {
  const { t } = useI18n();
  const [samples, setSamples] = useState<SampleVideo[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // 挂载后随机取 10 个（不按模型/画面比例排序），放在 effect 里避免 SSR 水合不一致
  useEffect(() => {
    setSamples(shuffle(SAMPLE_VIDEOS).slice(0, 10));
    setActiveIdx(0);
  }, []);

  // 示例视频自动轮播：每 6 秒切换到下一个，循环播放
  useEffect(() => {
    if (samples.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((i) => (i + 1) % samples.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeIdx, samples.length]);

  if (samples.length === 0) return null;

  const active = samples[activeIdx] || samples[0];

  return (
    <div className="gen-sample">
      <div className="gen-sample-hero">
        <video
          key={active.id}
          className="gen-sample-hero-video"
          src={active.src}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
      </div>
      <div className="gen-sample-row">
        <button type="button" className="gen-sample-arrow" aria-label={t("gen.prev")} onClick={() => setActiveIdx((i) => (i - 1 + samples.length) % samples.length)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <div className="gen-sample-thumbs">
          {samples.map((s, i) => (
            <button key={s.id} type="button" className={`gen-sample-thumb-item ${i === activeIdx ? "is-active" : ""}`} onClick={() => setActiveIdx(i)}>
              <video className="gen-sample-thumb-img" src={`${s.src}#t=0.001`} muted playsInline preload="metadata" />
            </button>
          ))}
        </div>
        <button type="button" className="gen-sample-arrow" aria-label={t("gen.next")} onClick={() => setActiveIdx((i) => (i + 1) % samples.length)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}

// ── 结果卡片 ────────────────────────────────────────────────────────────
function ResultItem({ result, onRetry, onDelete }: { result: VideoResult; onRetry: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const isGenerating = result.status === "generating";
  const isError = result.status === "error";
  const isSuccess = result.status === "success";
  const typeLabel = result.mode === "reference-to-video" ? t("gen.typeLabel.ref") : result.mode === "image-to-video" ? (result.subMode === "firstLastFrame" ? t("gen.typeLabel.firstLast") : t("gen.typeLabel.first")) : t("gen.typeLabel.text");
  return (
    <div className={`gen-item ${isError ? "is-error" : ""} ${isGenerating ? "is-generating" : ""}`}>
      <div className="gen-item-top">
        <span className={`gen-item-pill ${isError ? "is-error" : ""} ${isGenerating ? "is-generating" : ""}`}>{typeLabel}</span>
        {isGenerating && <span className="gen-item-status">{t("gen.generating")}</span>}
        {isError && <span className="gen-item-status is-error">{t("gen.failed")}{result.error || ""}</span>}
        {isError && (
          <div className="gen-item-actions">
            <button className="gen-icon-btn" onClick={onRetry} title={t("gen.retry")}><Icon name="rotate" /></button>
            <button className="gen-icon-btn" onClick={onDelete} title={t("gen.delete")}><Icon name="trash" /></button>
          </div>
        )}
      </div>
      <div className="gen-item-input">
        {result.assets.length > 0 ? (
          <div className="gen-item-assets">
            {result.assets.map((a, i) => (
              <div key={i} className={`gen-item-asset gen-item-asset-${a.kind}`} title={a.name}>
                {a.kind === "image" && a.preview ? <img src={a.preview} alt={a.name} /> : <Icon name={a.kind} />}
                <span className="gen-item-asset-name">{a.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="gen-item-noassets">{t("gen.textOnly")}</div>
        )}
        <p className="gen-item-prompt" title={result.prompt}>{result.prompt}</p>
      </div>
      <div className="gen-item-player" style={{ aspectRatio: "4 / 3" }}>
        {isGenerating && <div className="gen-item-loading"><div className="gen-spinner" /><span>{t("gen.generatingVideo")}</span></div>}
        {isError && <div className="gen-item-error"><Icon name="alert" /><span>{t("gen.generateFailed")}</span></div>}
        {isSuccess && result.videoUrl && <VideoPlayer src={result.videoUrl} />}
      </div>
      <div className="gen-item-foot">
        <div className="gen-item-config">
          {result.model && <span className="gen-config-pill">{getModel(result.model).name}</span>}
          <span className="gen-config-pill">{result.resolution}</span>
          <span className="gen-config-pill">{result.duration}s</span>
          <span className="gen-config-pill">{result.ratio === "auto" ? t("gen.auto") : result.ratio}</span>
        </div>
        {isSuccess && result.videoUrl && (
          <button className="gen-download" onClick={() => downloadVideo(result.videoUrl!, `ai-video-${result.id}.mp4`)}>
            <Icon name="download" size={14} /> {t("gen.download")}
          </button>
        )}
      </div>
      {isSuccess && result.videoUrl && (
        <p className="gen-item-hint">{t("gen.expireHint")}</p>
      )}
    </div>
  );
}

// ── 视频播放器 ──────────────────────────────────────────────────────────
function VideoPlayer({ src }: { src: string }) {
  return (
    <div className="gen-video">
      <video
        src={src}
        playsInline
        preload="metadata"
        controls
        onPlay={(e) => {
          const v = e.currentTarget;
          if (playingVideo && playingVideo !== v) playingVideo.pause();
          playingVideo = v;
        }}
        onPause={(e) => {
          if (playingVideo === e.currentTarget) playingVideo = null;
        }}
      />
    </div>
  );
}

// ── 首帧 / 尾帧上传 ─────────────────────────────────────────────────────
function FrameUploader({ label, preview, onPick, onClear }: {
  label: string; preview: string | null; onPick: (e: ChangeEvent<HTMLInputElement>) => void; onClear: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="gen-frame-cell">
      {preview ? (
        <div className="gen-frame-preview">
          <img src={preview} alt={label} />
          <button type="button" className="gen-frame-clear" onClick={onClear} title={t("gen.clear")}><Icon name="close" size={14} /></button>
        </div>
      ) : (
        <label className="gen-frame-empty">
          <Icon name="image" size={28} />
          <span>{label}</span>
          <small>{t("gen.clickUpload")}</small>
          <input type="file" hidden accept="image/*" onChange={onPick} />
        </label>
      )}
    </div>
  );
}

// ── 参考素材卡片（图片 / 视频 / 音频） ──────────────────────────────────
function formatDuration(sec?: number): string {
  if (sec == null || !Number.isFinite(sec)) return "";
  const s = Math.round(sec * 10) / 10;
  return `${s}s`;
}

function AssetChip({ asset, mention, onInsert, onRemove }: {
  asset: RefAsset; mention: string; onInsert: (id: string) => void; onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [asset.preview]);

  // 卸载 / 切换素材时确保停止播放
  useEffect(() => {
    return () => { mediaRef.current?.pause(); };
  }, []);

  const playable = (asset.kind === "video" || asset.kind === "audio") && !!asset.preview;

  return (
    <div className={`gen-asset-card gen-asset-card-${asset.kind}`}>
      <button type="button" className="gen-asset-remove" onClick={() => onRemove(asset.id)} title={t("gen.delete")} aria-label={t("gen.delete")}>
        <Icon name="trash" size={14} />
      </button>
      <div className="gen-asset-card-media">
        {asset.kind === "image" && asset.preview && <img src={asset.preview} alt="" />}
        {asset.kind === "video" && asset.preview && (
          <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={asset.preview} preload="metadata" playsInline />
        )}
        {asset.kind === "audio" && (
          <>
            <div className="gen-asset-audio-pattern" aria-hidden="true">
              <Icon name="audio" size={36} />
            </div>
            {asset.preview && <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={asset.preview} preload="metadata" />}
          </>
        )}
        {playable && (
          <button type="button" className="gen-asset-play" onClick={togglePlay} aria-label={playing ? t("gen.pause") : t("gen.play")}>
            {playing ? <Icon name="pause" size={20} /> : <Icon name="play" size={20} />}
          </button>
        )}
        {(asset.kind === "video" || asset.kind === "audio") && asset.duration != null && (
          <span className="gen-asset-duration">{formatDuration(asset.duration)}</span>
        )}
      </div>
      <div className="gen-asset-card-foot">
        <span className="gen-asset-tag">@{mention}</span>
        <div className="gen-asset-card-actions">
          <button type="button" className="gen-asset-insert" onClick={() => onInsert(asset.id)} title={t("gen.insertTitle")}>{t("gen.insert")}</button>
        </div>
      </div>
    </div>
  );
}

// ── 下载视频 ────────────────────────────────────────────────────────────
async function downloadVideo(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.target = "_self";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}

// ── @ 素材引用弹层 ─────────────────────────────────────────────────────
function MentionPicker({ assets, onPick, onClose }: {
  assets: RefAsset[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const KIND_LABEL: Record<AssetKind, string> = { image: t("gen.kind.image"), video: t("gen.kind.video"), audio: t("gen.kind.audio"), file: t("gen.kind.file") };
  const groups: { kind: AssetKind; label: string }[] = [];
  const seen = new Set<AssetKind>();
  for (const a of assets) {
    if (seen.has(a.kind)) continue;
    seen.add(a.kind);
    groups.push({ kind: a.kind, label: KIND_LABEL[a.kind] || a.kind });
  }
  return (
    <div className="gen-mention-list" role="listbox">
      {groups.map((g) => {
        const items = assets.filter((a) => a.kind === g.kind);
        return (
          <div key={g.kind} className="gen-mention-group">
            <div className="gen-mention-group-label">{g.label}</div>
            {items.map((a) => (
              <button key={a.id} type="button" className="gen-mention-item" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(a.id)}>
                <span className={`gen-mention-thumb gen-mention-thumb-${a.kind}`}>
                  {a.kind === "image" && a.preview ? <img src={a.preview} alt="" /> : <Icon name={a.kind} size={14} />}
                </span>
                <span className="gen-mention-name">{a.name}</span>
                <span className="gen-mention-tag">@{mentionFor(assets, a.id)}</span>
              </button>
            ))}
          </div>
        );
      })}
      <button type="button" className="gen-mention-close" onClick={onClose} aria-label={t("gen.close")}><Icon name="close" size={12} /></button>
    </div>
  );
}

// ── 内联 SVG 图标 ───────────────────────────────────────────────────────
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "play": return <svg {...common}><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" /></svg>;
    case "pause": return <svg {...common}><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" /></svg>;
    case "download": return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
    case "upload": return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
    case "trash": return <svg {...common}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    case "sparkles": return <svg {...common}><path d="M12 3l1.9 5.8L20 10.7l-5.8 1.9L12 18.4l-2.2-5.8L4 10.7l6.1-1.9z" fill="currentColor" stroke="none" /><path d="M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z" fill="currentColor" stroke="none" /></svg>;
    case "image": return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
    case "video": return <svg {...common}><rect x="2" y="6" width="14" height="12" rx="2" /><polygon points="22 8 16 12 22 16 22 8" /></svg>;
    case "audio": return <svg {...common}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    case "file": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case "close": return <svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "rotate": return <svg {...common}><polyline points="1 4 1 10 7 10" /><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" /></svg>;
    case "alert": return <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
    case "chevronDown": return <svg {...common}><polyline points="6 9 12 15 18 9" /></svg>;
    case "chevronLeft": return <svg {...common}><polyline points="15 18 9 12 15 6" /></svg>;
    case "chevronRight": return <svg {...common}><polyline points="9 18 15 12 9 6" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case "help": return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    default: return null;
  }
}