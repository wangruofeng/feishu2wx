# 设计文档：AI 聊天编辑 Markdown

- 日期：2026-08-29
- 状态：已实现并验证
- 版本目标：v1.26.0
- 功能来源：自 tech-blog 项目「文章详情页 AI 编辑功能」迁移

## 背景与目标

用户在编辑器里写好 Markdown 后，往往需要反复调整措辞、结构、标题。本功能让用户通过**右侧 AI 聊天面板**发指令修改当前文章：AI 流式返回「说明文字 + `<<<ARTICLE … ARTICLE>>>` 标记包裹的完整修改稿」，用户先「查看变更」diff，确认后点「应用修改」整体替换编辑器内容（可 Cmd+Z 撤销、自动存历史文档）。

## 已确认的产品决策

| 决策点 | 结论 |
| --- | --- |
| UI 形态 | 右侧非模态 Drawer（overlay 不拦截点击，可边看预览边对话），fab-group「AI」按钮触发 |
| 供应商配置 | 完整多供应商 CRUD（增删改/启停/多模型/激活切换），存前端 localStorage，随请求体发给后端（BYOK，服务端零存储） |
| 图片多模态 | 迁移：粘贴/拖拽/按钮添加 ≤6 张，canvas 缩到 1600px 内转 base64 |
| 编辑方式 | 聊天式多轮 + 全文替换（沿用 tech-blog 协议），diff 仅用于展示 |

## 架构

```
浏览器 AiChatPanel（fab 按钮 → 右侧 Drawer）
  ├─ localStorage：feishu2wx_ai_config（多供应商+Key）/ feishu2wx_ai_messages（20 条）/ feishu2wx_ai_input_history（10 条）
  ├─ fetch POST /api/ai/chat { source, messages, provider, modelId }（AbortController 可中止）
  │     ↓ SSE: data: {"type":"reasoning"|"delta"|"error", ...}
  ├─ 本地 dev：CRA --setupProxy--> Express :3101（server/routes/ai.ts）
  │     └─ server/lib/ai-handler.ts createAiChatHandler() → fetch 上游 → 归一化 SSE
  └─ cf:dev / 生产：Cloudflare Pages（functions/api/ai/chat.ts）→ 同一 handler
  ├─ createAiStreamParser：<<<ARTICLE 标记状态机 → 回复气泡 / 修改稿
  └─ 应用修改 → App.handleApplyAiArticle → EditorPane.replaceWholeDocument()
                （archiveAndRefresh + 撤销栈 pushHistory + setMarkdown）
```

与 tech-blog 源实现的差异（适配本项目）：

1. 配置从前端 localStorage 随请求体发送（同 `feishu2wx_wechat_config` 的 BYOK 模式），服务端不落盘，**无 GET/PUT /config 端点**
2. 后端双轨复用一份 handler（`server/lib/ai-handler.ts` 工厂模式，参照 `publish-handler.ts`），全用 Web 标准 API（fetch/ReadableStream/TextEncoder），Node/Workers 通用
3. 前端从原生 DOM 改为 React 组件；应用修改走 EditorPane 现有「存档→撤销栈→替换」三段式管道

## 后端（server/lib/ai-handler.ts + 双轨薄壳）

- **端点**：`POST /api/ai/chat`；请求体 `{ source, messages, provider: {baseUrl, apiKey, apiFormat}, modelId }`
- **三种上游 API 格式**：anthropic（`/v1/messages`，system 字段 + x-api-key + anthropic-version）/ chat-completions（system 塞 messages[0]）/ responses（instructions）；`inferApiFormat()` 按 baseURL 纠偏（含 `/anthropic` 即按 anthropic 发）；统一 `stream:true, temperature:0.3, max_tokens:16384`
- **SSE 双层归一化**：`extractUpstreamEvents()` 解析三种格式的 delta（anthropic `content_block_delta`/`thinking_delta`、chat-completions `choices[0].delta.content`/`reasoning_content`、responses `response.*.delta`），格式猜错自动回退尝试另外两种；归一化为 `data: {"type":"reasoning"|"delta"|"error","text"?,"message"?}\n\n`
- **限制**：请求体 16MB、图片 ≤6 张单张 base64 ≤3.5MB、类型白名单 png/jpeg/webp/gif、上游 5 分钟超时、聊天历史服务端截 20 条、仅末条 user 可带图
- **SSRF 防护**：baseUrl 必须 http(s) 且 host 不在黑名单（localhost/127.0.0.1/::1/169.254.169.254）
- **Express 薄壳**（`server/routes/ai.ts`）：`res.on('close')` + `!res.writableEnded` 判断客户端断开联动 abort 上游（注意 Node 16+ 中 `req.on('close')` 在请求体读完后即触发，不能用）；错误 JSON 完整写出后才 end
- **CF 薄壳**（`functions/api/ai/chat.ts`）：复制 draft.ts 的 CORS 白名单/体积/onRequestOptions；`withCorsHeaders` 用 `new Response(response.body,…)` 保留 SSE 流；`context.request.signal` 透传断开

## system prompt（适配公众号场景）

从 tech-blog 改三点：场景改为「公众号文章排版工具 Markdown」；frontmatter 可选（「若文章含 YAML frontmatter，则从第一行 --- 开始」）；图片链接是 http/https URL 不改写（原版是 `./imgs/` 相对路径）。其余规则保留：先一两句说明修改→完整源码不省略→未要求修改的内容原样保留→纯提问直接回答→结合图片理解→简体中文。

## 前端（src/utils + src/components/ai/）

| 文件 | 职责 |
| --- | --- |
| `utils/aiChat.ts` | 类型（AiChatMessage/AiProvider/AiProviderSettings/AiImage）、markers、localStorage 读写（quota 超限丢最旧重试、持久化剔除 images）、`readAiSseStream`（SSE 逐行解析）、`createAiStreamParser`（reply→article→done 状态机，处理标记被 chunk 拆断）、`streamAiChat`（fetch `/api/ai/chat`，API_BASE 同 publishApi） |
| `utils/aiDiff.ts` | 行级 LCS diff（Uint16Array dp；n*m>250k 退化逐行对齐）+ hunk 聚合 |
| `utils/aiMarkdown.ts` | 聊天气泡独立轻量 markdown-it（html:false + link_open 注入 _blank），不复用 renderMarkdown（其依赖 DOM 后处理/frontmatter 卡/mermaid） |
| `utils/aiImages.ts` | `readImageFileAsAiImage`：createImageBitmap → 1600px canvas → jpeg 0.86（小 png 保持）→ base64；FileReader 兜底；SVG 经 img 光栅化为 PNG（<1024px 放大到 1024，上游不收 svg） |
| `components/ai/AiChatPanel.tsx` | Drawer 主组件：消息列表/composer/模型下拉/设置入口；state 收敛在面板内（messages/live/streaming/abortRef/pendingImages）；Esc 层级（停止→关设置→关面板）；滚动 nearBottom<80px 才跟随 |
| `components/ai/AiMessageBubble.tsx` | 气泡：reasoning（live 展开/完成折叠）、图片缩略、Markdown 正文、「正在生成修改稿…」、应用修改+复制按钮、「查看变更」diff |
| `components/ai/AiProviderSettings.tsx` | 供应商 CRUD 居中模态弹窗（左栏浅灰供应商列表：线性图标+状态点+白色选中卡片；右栏表单：大名称+铅笔行内编辑+启用徽章、高输入框、API Key 眼睛切换、分组卡片式模型列表），onChange 即持久化 |

关键状态流：

- 发送时快照 `requestSource = markdown`；history 过滤 error 消息，assistant 只回传说明文字（`content || '（已提供修改稿）'`）防 token 膨胀
- 流式态 `live: {reply, reasoning, articleStarted}` 结束后回填末条 assistant（content/article/truncated=有稿无结束标记/error）
- 应用修改：`requestSource !== markdown` 时 confirm（AI 处理期间文章被手改）；确认后 `onApplyArticle` → `EditorPane.replaceWholeDocument`（forwardRef + useImperativeHandle 暴露）
- GitHub Pages 静态部署（无后端）降级：fetch 网络错误或 404/405 → 专属提示文案

## 验证记录（2026-08-29）

- Jest：`aiChat.test.js`（15 例：标记状态机含 chunk 拆断/缺结束标记、normalize 回退链、quota 降级、输入历史）+ `aiDiff.test.js`（8 例）全绿；全量 130 例通过
- 后端 curl：参数校验 400、SSRF 黑名单 400、上游不可达 502、真实 GLM-5.3-Flash 流式（reasoning 59 事件 + delta 31 事件，协议标记完整）
- Playwright 端到端：面板开合、模型下拉、真实流式对话、diff 展示（- 旧行 / + 新行）、应用修改（编辑器+预览更新）、Cmd+Z 撤销、历史文档存档、刷新后聊天恢复、供应商增删、停止生成（Esc）、暗黑主题

## 已知边界

- GitHub Pages 部署无 /api 后端，AI 功能不可用（有降级提示）；Cloudflare Pages 与本地 dev 正常
- 推理型模型长时间（数分钟）无 token 时连接可能被 Cloudflare 边缘驱逐，error 事件有兜底文案
- 聊天历史持久化含 article + requestSource 双全文，靠 20 条上限 + quota 丢最旧控制体积
