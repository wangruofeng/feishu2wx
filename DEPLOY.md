# Cloudflare Pages 部署指南

本指南将帮助您将项目部署到 Cloudflare Pages（前端静态资源 + 后端 Functions 一体部署）。

## 📋 前置条件

1. 项目已推送到 GitHub 仓库
2. 拥有 Cloudflare 账号
3. Node.js 和 npm 已安装

## 🚀 部署方式

### 方式一：Cloudflare Git 集成自动部署（推荐）

在 Cloudflare 控制台将 Pages 项目连接到 GitHub 仓库，每次推送到 `main` 分支时自动构建部署，
无需在 GitHub 仓库中保存 Cloudflare API Token。

#### 步骤 1：创建 Pages 项目

1. 进入 Cloudflare 控制台 **Workers & Pages → Create → Pages → Connect to Git**
2. 选择 GitHub 仓库并授权
3. 配置构建：

```text
Build command: npm install --legacy-peer-deps && npm run build
Build output directory: build
```

4. 在 **Settings → Variables** 中配置环境变量：

```text
SKIP_DEPENDENCY_INSTALL=1
NODE_VERSION=22
PUBLIC_URL=/
ALLOWED_ORIGINS=https://feishu2wx.wangruofeng007.com
```

由于项目使用 CRA 5 和 TypeScript 5，建议关闭 Cloudflare 的自动依赖安装，并使用仓库中的兼容安装配置
（`npm install --legacy-peer-deps`）。

仓库根目录的 `functions/` 会由 Cloudflare Pages Git 集成部署为 Pages Functions。
Functions 使用独立的 `functions/tsconfig.json`，避免受到前端 CRA 的 ES5 TypeScript 配置影响。

#### 步骤 2：绑定自定义域名

在 Cloudflare 控制台进入 **Workers & Pages → feishu2wx → Custom domains → Set up a domain**，添加：

```
feishu2wx.wangruofeng007.com
```

由于该域名已托管在 Cloudflare，确认后 Cloudflare 会自动创建或更新对应的 DNS 记录。

生产访问地址为：

```
https://feishu2wx.wangruofeng007.com/
```

Cloudflare 专用构建必须从域名根路径 `/` 加载静态资源，因此必须设置 `PUBLIC_URL=/`。

#### 步骤 3：推送代码

```bash
git add .
git commit -m "更新内容"
git push origin main
```

推送后在 Cloudflare 控制台 **Workers & Pages → feishu2wx → Deployments** 查看构建与部署状态。

### 方式二：本地手动部署（备用）

```bash
npm run cf:deploy
```

该命令会以 `PUBLIC_URL=/` 构建并用 `wrangler pages deploy` 发布到 `feishu2wx` 项目。

> **注意**：请不要与 Git 集成同时使用，避免一次推送产生两次部署。`npm run cf:deploy`
> 仅作为本地手动发布备用入口。

## ⚠️ 不要设置 REACT_APP_API_URL

**不要**在 Cloudflare Pages 环境变量中把 `REACT_APP_API_URL` 指向 `*.pages.dev` 地址：部署在自定义域名上时，
这会让 `/api/auth/session` 等请求跨域发往 pages.dev，浏览器不会携带会话 cookie，登录状态永远检测不到。
Cloudflare 部署正确做法是**不设置** `REACT_APP_API_URL`（同源相对路径）。前端 `src/utils/apiBase.ts`
已对「配置域名与页面同域」或「自定义域名上误配 pages.dev」两种情况回退为同源相对路径，
但环境变量本身仍应保持干净。

## 🔑 GitHub 登录与云端 AI 配置

若启用跨设备保存 AI 供应商配置，需要在 Pages 项目中配置 KV binding `AI_CONFIGS_KV`，并创建以下加密 Secret：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`AI_CONFIG_ENCRYPTION_KEY`、`AUTH_SESSION_SIGNING_KEY`。GitHub OAuth 回调地址固定为 `https://feishu2wx.wangruofeng007.com/api/auth/github/callback`。Secret 不得写入 `wrangler.toml` 或 Git；本地 Pages 调试使用未提交的 `.dev.vars`。部署后应验证 GitHub 登录、云端配置读取不返回 API Key、以及已登录 AI 对话。

若 GitHub 授权回调失败，重新发起登录获取新的授权码；授权码不可复用。授权码或 OAuth App 凭据不匹配会返回可读的 400 提示（不用 502，避免 Pages 替换错误正文）；回调返回“登录服务配置无效”时，检查上述 Secret 是否配置在 **Production** 环境，且两项随机密钥均为独立的 32 字节 base64url 值。授权码交换使用标准表单编码并显式传入同一回调 URL；交换与用户信息请求都必须携带 User-Agent 请求头（GitHub 边缘对无 UA 的 api.github.com 请求返回 403 纯文本拦截页，曾因此被误报为网络异常）。用户信息返回非 2xx 时回调返回带 HTTP 状态码的 400 提示，Workers Logs 中 `[auth]` 日志记录状态与响应体片段；仅真正的网络异常返回 503。登录成功后回调重定向到 `/?ai_login=1`，前端据此自动重开 AI 面板与模型设置弹窗；若登录后仍显示未登录，检查 `/api/auth/session` 请求是否与页面同域（跨域不携带会话 cookie）。

## 🗄️ 静态资源缓存

静态资源缓存由 `public/_headers` 控制：`/static/*`（文件名含内容哈希）返回
`Cache-Control: public, max-age=31536000, immutable`，Cloudflare Pages 会自动发布该文件，无需控制台配置。

## 🧪 本地测试 Cloudflare 模式

```bash
npm run cf:dev
```

这会在本地同时启动前端开发和 Cloudflare Functions 模拟环境。

## 🏗️ 架构说明

- `functions/api/publish/draft.ts` — Cloudflare Function，处理推送到微信草稿箱
- `server/lib/wechat-pages.ts` — Cloudflare Function 使用的微信 API 封装，不依赖 Node 原生图片处理库
- `server/lib/wechat-worker.ts` — Node/CLI 使用的微信 API 封装，支持通过 `sharp` 做 WebP 归一化
- `server/lib/publish-handler.ts` — HTTP handler，前端提交的凭证（appId/appSecret）直接用于调用微信 API
- 用户公众号凭证仅保存在浏览器 localStorage，不经过服务端存储

## 📝 重要提示

- Cloudflare Pages 部署包含完整的前后端功能
- 更换自定义域名时，需同步更新 `functions/api/` 下 `DEFAULT_ALLOWED_ORIGINS`、Cloudflare 环境变量 `ALLOWED_ORIGINS`、GitHub OAuth 回调地址与 `public/` 中的 SEO 绝对地址
- Cloudflare Pages Functions 暂不支持正文 WebP 图片归一化；推送前请先将 WebP 转为 PNG/GIF，本地 Node/CLI 模式不受影响
- 多用户使用：每个用户在前端输入自己的公众号凭证即可，凭证保存在浏览器本地，互不干扰
