# 设计文档：GitHub 登录与加密 AI 配置

- 日期：2026-08-29
- 状态：待实现
- 生产回调地址：`https://feishu2wx.wangruofeng007.com/api/auth/github/callback`

## 目标

通过 GitHub 身份登录，让用户跨设备保存 AI 供应商配置，同时确保模型 API Key 不再保存或返回到浏览器。

## 范围与非目标

- 范围：GitHub OAuth App 身份登录、Cloudflare Pages Function 会话、KV 中的加密配置、云端供应商 CRUD、已登录 AI 调用。
- 保留：未登录用户可继续使用现有本地 BYOK 流程。
- 非目标：访问 GitHub 仓库、同步聊天记录/附件、自动迁移旧 localStorage Key、GitHub Pages 静态部署支持、服务端长期保存用户文章。

## 威胁模型与控制

| 资产 / 边界 | 风险 | 控制 |
| --- | --- | --- |
| GitHub OAuth 回调 | CSRF / 回调伪造 | 单次随机 state，短时 `HttpOnly; Secure; SameSite=Lax` Cookie，常量时间比较。 |
| 浏览器会话 | 会话窃取 / XSS | HMAC 签名会话 Cookie；不放入 localStorage；Cookie 为 HttpOnly、Secure、SameSite=Lax。 |
| 模型 API Key | 浏览器读取、KV 泄露 | AES-256-GCM 加密后再写 KV；密钥仅为 Cloudflare Secret；Key 永不在读取 API 响应中出现。 |
| 用户配置 API | 越权访问 | 每个请求从已验证 Cookie 取得 GitHub user ID；KV key 按此 user ID 作用域，客户端不得指定 owner。 |
| GitHub / 模型上游 | SSRF、过宽权限 | GitHub URL 固定为官方 OAuth / user endpoint；OAuth 仅取身份所需最小 scope；模型上游延续既有 SSRF 校验。 |

## 云端配置

### Cloudflare 绑定

```toml
[[kv_namespaces]]
binding = "AI_CONFIGS_KV"
id = "<由部署者配置>"
```

### Secrets

| 名称 | 用途 |
| --- | --- |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | OAuth code 交换密钥 |
| `AI_CONFIG_ENCRYPTION_KEY` | 32 字节 base64url AES-GCM 密钥 |
| `AUTH_SESSION_SIGNING_KEY` | 32 字节 base64url HMAC-SHA-256 密钥 |

本地仅在 `.dev.vars` 中配置；该文件不提交。

## 数据与加密

KV key：`ai-config:v1:<github-user-id>`。

KV value：

```ts
type EncryptedConfig = {
  v: 1;
  iv: string;         // base64url, 96-bit random nonce
  ciphertext: string; // base64url, AES-GCM 密文 + tag
};
```

明文只包含供应商配置（含 API Key）与当前选中项；用户身份、聊天记录和附件不写入该对象。AES-GCM 的附加认证数据为 `ai-config:v1:<github-user-id>`，防止密文跨用户替换。

## API 合约

| 路由 | 认证 | 行为 |
| --- | --- | --- |
| `GET /api/auth/github` | 否 | 生成 state Cookie，重定向 GitHub。 |
| `GET /api/auth/github/callback` | state | 交换 code、读取 GitHub 用户、写会话 Cookie、重定向 `/`。 |
| `GET /api/auth/session` | 可选 | 返回 `{ user: { login, avatarUrl } }` 或 `{ user: null }`。 |
| `POST /api/auth/logout` | 是 | 清除会话 Cookie。 |
| `GET /api/ai/config` | 是 | 返回无 Key 的供应商元数据与当前选中项。 |
| `PUT /api/ai/config` | 是 | 接收完整配置（可含新 Key）；服务端合并旧 Key 与空 Key 字段，再加密持久化。 |
| `DELETE /api/ai/config` | 是 | 删除当前用户的全部云端 AI 配置。 |
| `POST /api/ai/chat` | 已登录时是 | 已登录模式只接收 `providerId` / `modelId`，服务端按用户配置取 Key；未登录时维持现有 BYOK 请求。 |

认证失败统一返回 `401 { error: '请先登录 GitHub。' }`，权限不足不暴露资源存在性。

## 前端体验

1. 设置页显示「使用 GitHub 登录」；登录后显示头像、账号与退出按钮。
2. 登录后的供应商保存为云端配置。编辑 API Key 输入框为空时表示“保留已有 Key”；用户可显式清空/删除该供应商。
3. 云端读取永远不返回 API Key，UI 仅显示“已保存”。
4. 未登录时继续沿用本地设置。登录后不自动迁移本地 Key，提示用户重新保存配置。

## 验收

- OAuth state 缺失、错误或过期时拒绝回调，且不创建会话。
- KV 密文不包含可读 API Key；错误用户无法读取或使用另一用户配置。
- 会话 Cookie 不含 API Key，且带 HttpOnly/Secure/SameSite 属性。
- 云端配置读取不返回 Key；更新空 Key 不覆盖已存 Key。
- 已登录聊天请求不接收浏览器提交的 `apiKey`，并使用受当前用户限制的服务器配置。
- 未登录本地 BYOK 与现有图片/文本附件流程回归通过。

## 部署前人工步骤

1. 在 GitHub 创建 OAuth App，填入上述回调地址和最小 scope。
2. 创建 Cloudflare KV Namespace 并绑定为 `AI_CONFIGS_KV`。
3. 在 Pages 生产与预览环境配置四个 Secret；部署后再进行真实 OAuth 验证。
