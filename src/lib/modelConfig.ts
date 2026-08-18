// 模型配置（数据驱动）
// 接入新模型：只需在 MODELS 里新增一个配置对象即可，
// 提示词长度 / 素材种类与数量 / 分辨率 / 比例 / 时长 全部由配置驱动，UI 与校验逻辑自动适配。

import type { AssetKind } from "./mediaMeta";

export type Resolution = "480P" | "720P" | "768P" | "1080P" | "2K";
export type Ratio = "auto" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export type ModelId = "minimax-h3" | "wan-3.0" | "seedance-2.5";

// 单个素材类型的约束
export interface AssetTypeConfig {
  kind: AssetKind;
  label: string;          // 显示名（图片 / 视频 / 音频）
  maxCount: number;       // 数量上限
  maxSizeMB: number;      // 单个大小上限（MB）
  minSeconds?: number;    // 视频/音频最小时长（秒）
  maxSeconds?: number;    // 视频/音频最大时长（秒）
  accept: string;         // input accept 片段
}

export interface ModelBilling {
  // 每秒基础积分（按分辨率）
  basePerSecond: Partial<Record<Resolution, number>>;
  // 参考视频附加费（按分辨率，缺省视为 0 = 不额外收费）
  referenceVideoPerSecond?: Partial<Record<Resolution, number>>;
}

export interface ModelConfig {
  id: ModelId;
  name: string;
  logo: string;           // 下拉里的小图标（模型 logo 路径）
  desc: string;
  billing: ModelBilling;  // 计费规则（按分辨率的每秒积分 + 参考视频附加费）

  // 提示词
  promptMaxLength: number;

  // 配置项：分辨率
  resolutions: Resolution[];
  defaultResolution: Resolution;

  // 配置项：画面比例
  ratios: Ratio[];
  defaultRatio: Ratio;

  // 配置项：时长（秒）
  durationMin: number;
  durationMax: number;
  defaultDuration: number;

  // 参考素材（参考生视频模式）
  assets: {
    total: number;             // 总量上限
    types: AssetTypeConfig[];  // 支持的素材种类
  };
}

export const MODELS: ModelConfig[] = [
  {
    id: "minimax-h3",
    name: "MiniMax H3",
    logo: "/logos/minimax.png",
    desc: "文 / 图 / 参考多模态生视频",
    billing: {
      basePerSecond: { "768P": 4.5, "2K": 7 },
      referenceVideoPerSecond: { "768P": 4, "2K": 6.5 },
    },
    promptMaxLength: 7000,
    resolutions: ["768P", "2K"],
    defaultResolution: "768P",
    ratios: ["auto", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
    defaultRatio: "16:9",
    durationMin: 4,
    durationMax: 15,
    defaultDuration: 4,
    assets: {
      total: 12,
      types: [
        { kind: "image", label: "图片", maxCount: 9, maxSizeMB: 30, accept: "image/*" },
        { kind: "video", label: "视频", maxCount: 3, maxSizeMB: 50, minSeconds: 2, maxSeconds: 15, accept: "video/*" },
        { kind: "audio", label: "音频", maxCount: 3, maxSizeMB: 15, minSeconds: 2, maxSeconds: 15, accept: "audio/*" },
      ],
    },
  },
  {
    id: "wan-3.0",
    name: "Wan 3.0",
    logo: "/logos/wan.png",
    desc: "阿里通义万相 3.0",
    billing: {
      basePerSecond: { "480P": 12, "720P": 22, "1080P": 45 },
      referenceVideoPerSecond: {},
    },
    promptMaxLength: 20000,
    resolutions: ["480P", "720P", "1080P"],
    defaultResolution: "480P",
    ratios: ["auto", "16:9", "4:3", "1:1", "3:4", "9:16"],
    defaultRatio: "auto",
    durationMin: 2,
    durationMax: 30,
    defaultDuration: 4,
    assets: {
      total: 20,
      types: [
        { kind: "image", label: "图片", maxCount: 10, maxSizeMB: 20, accept: "image/*" },
        { kind: "video", label: "视频", maxCount: 5, maxSizeMB: 100, minSeconds: 1, maxSeconds: 15, accept: "video/*" },
        { kind: "audio", label: "音频", maxCount: 5, maxSizeMB: 15, minSeconds: 1, maxSeconds: 15, accept: "audio/*" },
      ],
    },
  },
  {
    id: "seedance-2.5",
    name: "Seedance 2.5",
    logo: "/logos/seedance.png",
    desc: "字节 Seedance 2.5",
    billing: {
      basePerSecond: { "480P": 12, "720P": 22, "1080P": 45 },
      referenceVideoPerSecond: {},
    },
    promptMaxLength: 20000,
    resolutions: ["480P", "720P", "1080P"],
    defaultResolution: "480P",
    ratios: ["auto", "16:9", "4:3", "1:1", "3:4", "9:16"],
    defaultRatio: "auto",
    durationMin: 2,
    durationMax: 30,
    defaultDuration: 4,
    assets: {
      total: 20,
      types: [
        { kind: "image", label: "图片", maxCount: 10, maxSizeMB: 20, accept: "image/*" },
        { kind: "video", label: "视频", maxCount: 5, maxSizeMB: 100, minSeconds: 1, maxSeconds: 15, accept: "video/*" },
        { kind: "audio", label: "音频", maxCount: 5, maxSizeMB: 15, minSeconds: 1, maxSeconds: 15, accept: "audio/*" },
      ],
    },
  },
];

export function getModel(id: ModelId): ModelConfig {
  return MODELS.find((m) => m.id === id) || MODELS[0];
}

// 由素材类型列表生成 input accept 串
export function buildAccept(types: AssetTypeConfig[]): string {
  return types.map((t) => t.accept).join(",");
}
