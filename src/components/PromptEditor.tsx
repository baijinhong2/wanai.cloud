"use client";

// === 统一的 Prompt 输入组件（contentEditable，支持 @ 素材引用 chip） ===
// 迁移自 video-stitcher 的 PromptEditor.tsx，去除 i18n 依赖。
// - 基于 contentEditable div（不是 textarea）：视觉与 AI 生视频一致
// - 传 refAssets 时支持 @imageN / @videoN / @audioN / @fileN 引用 chip（带缩略图/图标）
// - 素材按「种类」分别编号（image1、image2、video1…），删除后重排
// - 支持 maxLength 截断、placeholder、中文输入法、粘贴纯文本

import { forwardRef, useEffect, useRef } from "react";
import type { RefAsset } from "../lib/mediaMeta";

export interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  refAssets?: RefAsset[];
  onTriggerMention?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

// ── 素材引用名（按种类分别编号） ─────────────────────────────────────
// 例：@image1、@image2、@video1、@audio1、@file1

// 匹配提示词里的 @kindN token（小写种类 + 数字）
export const MENTION_TOKEN_RE = /@([a-z]+)(\d+)/g;

// 计算每个素材的引用名（不含 @），按数组顺序、同种类依次编号
export function buildMentionMap(assets: RefAsset[]): Map<string, string> {
  const counters: Record<string, number> = {};
  const map = new Map<string, string>();
  for (const a of assets) {
    const n = (counters[a.kind] = (counters[a.kind] || 0) + 1);
    map.set(a.id, `${a.kind}${n}`);
  }
  return map;
}

// 取单个素材的引用名（不含 @），如 "image1"
export function mentionFor(assets: RefAsset[], id: string): string {
  return buildMentionMap(assets).get(id) || "";
}

// 按引用名反查素材，如 "image1" -> RefAsset
export function assetByMention(assets: RefAsset[], mention: string): RefAsset | undefined {
  const counters: Record<string, number> = {};
  for (const a of assets) {
    counters[a.kind] = (counters[a.kind] || 0) + 1;
    if (`${a.kind}${counters[a.kind]}` === mention) return a;
  }
  return undefined;
}

// 素材增删后重映射提示词里的引用：
// - 被删除素材的引用（@image2）直接移除
// - 因删除导致后续同种类素材重编号（@image3 -> @image2）时同步改名
export function remapPromptReferences(prompt: string, oldAssets: RefAsset[], newAssets: RefAsset[]): string {
  const oldMap = buildMentionMap(oldAssets);
  const newMap = buildMentionMap(newAssets);
  const removedNames = new Set<string>();
  const rename: Record<string, string> = {};
  for (const a of oldAssets) {
    const oldName = oldMap.get(a.id)!;
    const newName = newMap.get(a.id);
    if (newName == null) { removedNames.add(oldName); continue; }
    if (oldName !== newName) rename[oldName] = newName;
  }
  if (removedNames.size === 0 && Object.keys(rename).length === 0) return prompt;
  const out = prompt.replace(MENTION_TOKEN_RE, (match) => {
    const name = match.slice(1);
    if (removedNames.has(name)) return "";
    if (rename[name]) return "@" + rename[name];
    return match;
  });
  return out.replace(/ +/g, " ").trim();
}

// 生成一个素材引用 chip 的 DOM 节点（供手动插入使用）
export function createChipElement(asset: RefAsset, mention: string): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.className = "ce-chip";
  chip.contentEditable = "false";
  chip.dataset.mention = mention;
  if (asset.kind === "image" && asset.preview) {
    const img = document.createElement("img");
    img.src = asset.preview;
    img.className = "ce-chip-thumb";
    img.draggable = false;
    chip.appendChild(img);
  } else if (asset.kind === "video") {
    const icon = document.createElement("span");
    icon.className = "ce-chip-icon ce-chip-icon-video";
    icon.textContent = "▶";
    chip.appendChild(icon);
  } else if (asset.kind === "audio") {
    const icon = document.createElement("span");
    icon.className = "ce-chip-icon ce-chip-icon-audio";
    icon.textContent = "♪";
    chip.appendChild(icon);
  } else {
    const icon = document.createElement("span");
    icon.className = "ce-chip-icon ce-chip-icon-file";
    icon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    chip.appendChild(icon);
  }
  const nameSpan = document.createElement("span");
  nameSpan.className = "ce-chip-name";
  nameSpan.textContent = `@${mention}`;
  chip.appendChild(nameSpan);
  return chip;
}

export const PromptEditor = forwardRef<HTMLDivElement, PromptEditorProps>(function PromptEditor(
  { value, onChange, placeholder, refAssets, onTriggerMention, onBlur, maxLength, minHeight = 144, maxHeight = 320, className },
  ref,
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const composing = useRef(false);
  const useChips = !!refAssets;

  useEffect(() => {
    if (typeof ref === "function") ref(innerRef.current);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = innerRef.current;
  }, [ref]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || composing.current) return;
    if (value === "" && !useChips) {
      el.innerHTML = "";
      return;
    }
    const current = useChips ? extractPromptText(el) : el.innerText.replace(/\n$/, "");
    if (current === value) return;
    if (useChips) {
      const sel = window.getSelection();
      const savedOffset = sel && sel.rangeCount ? getTextOffsetFromSelection(el, sel) : null;
      el.innerHTML = renderPromptHtml(value, refAssets!);
      if (savedOffset !== null) restoreSelectionByOffset(el, savedOffset);
    } else {
      el.innerText = value;
    }
  }, [value, refAssets, useChips]);

  function handleInput() {
    if (composing.current) return;
    const el = innerRef.current;
    if (!el) return;
    let text = useChips ? extractPromptText(el) : el.innerText.replace(/\n$/, "");
    if (maxLength && text.length > maxLength) {
      text = text.slice(0, maxLength);
      if (useChips) el.innerHTML = renderPromptHtml(text, refAssets!);
      else el.innerText = text;
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    onChange(text);
    if (useChips) onTriggerMention?.();
  }

  function handleCompositionStart() { composing.current = true; }
  function handleCompositionEnd() { composing.current = false; handleInput(); }

  return (
    <div
      ref={innerRef}
      className={`ce-prompt${className ? ` ${className}` : ""}`}
      contentEditable
      suppressContentEditableWarning
      style={{ minHeight, maxHeight }}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyUp={() => { if (useChips) onTriggerMention?.(); }}
      onClick={() => { if (useChips) onTriggerMention?.(); }}
      onBlur={onBlur}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        if (document.queryCommandSupported?.("insertText")) {
          document.execCommand("insertText", false, text);
        } else {
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return;
          const r = sel.getRangeAt(0);
          r.deleteContents();
          r.insertNode(document.createTextNode(text));
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
        handleInput();
      }}
      data-placeholder={placeholder}
    />
  );
});

// ── chip 渲染 helpers ─────────────────────────────────────────────────

// 把 DOM 还原成纯文本（含 @imageN 引用占位）
export function extractPromptText(root: HTMLElement): string {
  let result = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.dataset.mention) {
      result += `@${el.dataset.mention}`;
      return;
    }
    if (el.tagName === "BR") {
      result += "\n";
      return;
    }
    for (const child of el.childNodes) walk(child);
  };
  walk(root);
  return result;
}

// 获取光标在 root 里的字符 offset
export function getCaretOffset(root: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function renderPromptHtml(value: string, refAssets: RefAsset[]): string {
  if (!value) return "";
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return value
    .split(/(@[a-z]+\d+)/g)
    .map((part) => {
      const m = part.match(/^@([a-z]+)(\d+)$/);
      if (m) {
        const mention = m[1] + m[2];
        const a = assetByMention(refAssets, mention);
        if (a) {
          let inner = "";
          if (a.kind === "image" && a.preview) {
            inner = `<img class="ce-chip-thumb" src="${escape(a.preview)}" draggable="false" alt="" />`;
          } else if (a.kind === "video") {
            inner = `<span class="ce-chip-icon ce-chip-icon-video">▶</span>`;
          } else if (a.kind === "audio") {
            inner = `<span class="ce-chip-icon ce-chip-icon-audio">♪</span>`;
          } else {
            inner = `<span class="ce-chip-icon ce-chip-icon-file"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>`;
          }
          const display = escape(`@${mention}`);
          return `<span class="ce-chip" data-mention="${mention}" contenteditable="false">${inner}<span class="ce-chip-name">${display}</span></span>`;
        }
        // 素材已被删除且未同步清理：不渲染（由 remapPromptReferences 兜底）
        return "";
      }
      return escape(part).replace(/\n/g, "<br>");
    })
    .join("");
}

function getTextOffsetFromSelection(root: HTMLElement, sel: Selection): number | null {
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function restoreSelectionByOffset(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let remaining = offset;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node as Text;
    const len = t.length;
    if (remaining <= len) {
      const r = document.createRange();
      r.setStart(t, remaining);
      r.collapse(true);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(r); }
      return;
    }
    remaining -= len;
  }
  const r = document.createRange();
  r.selectNodeContents(root);
  r.collapse(false);
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(r); }
}
