# WanAI.cloud

新一代 AI 视频生成平台 · wanai.cloud

基于 [MiniMax H3](https://api.minimaxi.com) 模型的在线 AI 视频生成器，支持：

- **文生视频**（Text to Video）
- **图生视频**（Image to Video）：首帧 / 首尾帧
- **参考生视频**（Reference to Video）：图片 / 视频 / 音频多模态参考 + H3 Context-IR 增强

模型适配层已为 [Wan 3.0](#接入-wan-30--seedance-25) / [Seedance 2.5](#接入-wan-30--seedance-25) 预留接口。

## 技术栈

- **前端**：Vite + React + TypeScript + react-router + react-helmet-async
- **后端**：Vercel Serverless Functions（`api/*.js`）+ 本地 dev 服务器（`server/index.cjs`，与 prod 共用模型适配层）
- **模型适配**：Node 22 + `fetch` + `FormData` + `Blob`（无需第三方 SDK）
- **API 协议**：JSON（含 base64 内嵌文件），统一 dev/prod 行为

## 目录结构

```
wanai/
├── api/                  # Vercel Serverless Functions
│   ├── generate.js       # POST /api/generate
│   ├── query.js          # GET /api/query?taskId=xxx
│   └── health.js         # GET /api/health
├── lib/
│   └── models.cjs        # 共享模型适配层（被 api/* 与 server 共用）
├── server/
│   └── index.cjs         # 本地 dev 服务器（仅调试用）
├── src/                  # React 前端
│   ├── components/
│   │   └── AiVideoGenerator.tsx
│   ├── pages/
│   ├── lib/site.ts       # SEO 配置 + 路由元数据
│   └── ...
├── public/               # 静态资源（favicon、og-image、sitemap、robots）
├── index.html
├── .env                  # 含 MINIMAX_API_KEY、FFMPEG_BIN、GA/GSC 占位
└── vite.config.ts
```

## 本地开发

```bash
# 安装依赖
npm install

# 同时启动 vite (5173) 与 dev server (5174)
npm run dev
```

打开 `http://localhost:5173`，Vite 已配置 `/api` 代理到 dev server。

## Vercel 部署

### 1. 准备项目

把仓库推到 GitHub（GitLab / Bitbucket 也可）。

### 2. 在 Vercel 创建项目

- 登录 Vercel → New Project → 选择仓库
- Framework Preset：**Vite**
- Build Command：`npm run build`
- Output Directory：`dist`

### 3. 配置环境变量

在 Vercel → Project Settings → Environment Variables 添加：

| 变量 | 值 | 必填 |
| --- | --- | --- |
| `MINIMAX_API_KEY` | MiniMax 提供的 API key | ✅ |
| `GA4_MEASUREMENT_ID` | Google Analytics 4 ID（如 `G-XXXXXXXXXX`） | 可选 |
| `GSC_VERIFICATION` | Google Search Console 验证码 | 可选 |

### 4. 部署

点 Deploy。Vercel 会自动识别：

- `api/*.js` → 部署为 Serverless Functions
- `dist/` → 静态资源 CDN

### 5. 绑定域名

Vercel → Project Settings → Domains → 添加 `wanai.cloud`（按提示配置 DNS）。

## 已知约束（Vercel 免费版）

- **函数最大执行时长 300 秒**：当前架构已避开——`/api/generate` 立即返回 taskId，前端通过 `/api/query` 轮询。
- **请求体上限 4.5MB**：大文件 base64 后可能超限。Vercel 函数生成时会自动 413。如有更大素材需求，可在 `api/generate.js` 中接入 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) 先上传大文件，再把 Blob URL 传给 adapter。
- **Hobby 计划仅限个人非商业用途**（按 Vercel 服务条款）。

## 接入 Wan 3.0 / Seedance 2.5

`lib/models.cjs` 已预留适配器接口。接入新模型只需要：

1. 实现一个新 adapter：

```js
const wan3 = {
  id: "wan-3.0",
  name: "Wan 3.0",
  capabilities: ["t2v", "i2v"],

  async createTask({ mode, prompt, duration, resolution, ratio, files }, apiKey) {
    // 1. 上传 files 到对应平台拿 file_id / URL
    // 2. 构造请求体，调用平台创建任务端点
    // 3. 返回 externalTaskId
  },

  async queryTask(externalTaskId, apiKey) {
    // 调用平台查询任务端点
    // 返回 { status: "queued" | "running" | "succeeded" | "failed", videoUrl?, error? }
  },
};
```

2. 注册到 `registry`：

```js
const registry = {
  "minimax-h3": minimaxH3,
  "wan-3.0": wan3,
  "seedance-2.5": seedance25,
};
```

3. 在 Vercel 环境变量里加 `WAN_API_KEY`（或对应平台的 key），并在 `lib/models.cjs` 里读取：

```js
const apiKey = process.env.WAN_API_KEY || process.env.MINIMAX_API_KEY;
```

4. 前端 `AiVideoGenerator.tsx` 中把 payload 的 `model` 字段改为 `"wan-3.0"` 即可。前端 UI 无需改动。

## 参考

- MiniMax 视频生成 API：`POST https://api.minimaxi.com/v2/video_generation`
- H3 Context-IR：`POST https://api.minimaxi.com/v2/h3_context_ir`
- MiniMax 文件上传：`POST https://api.minimaxi.com/v1/files/upload`

## License

Private