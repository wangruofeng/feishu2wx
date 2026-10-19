# 开发说明

## 常用命令

```bash
# 安装依赖
npm install

# 构建
npm run build

# 测试
npm test

# 提交前检查
npm run pre-commit-check

# CLI
npm run cli -- --help
```

## 启动模式

### 纯前端启动

```bash
npm start
```

仅启动 CRA 开发服务器（默认端口 3000），适合只做排版/预览相关的开发。推送草稿箱等后端 API 不可用。

### 前后端同时启动（Express 后端）

```bash
npm run dev
```

同时启动 CRA 开发服务器（端口 3100）和 Express 后端（端口 3101），CRA 通过 `src/setupProxy.js` 将 `/api` 请求代理到后端。适合开发推送草稿箱等需要后端的功能。

本地 `npm run dev` / `npm run server` 将 Express 后端设为开发模式，AI 聊天和模型目录的 Base URL 允许使用 localhost、回环地址及内网地址（例如 `http://127.0.0.1:11434/v1`）。生产模式和 Cloudflare Pages 继续禁止这些地址；HTTP/HTTPS、凭证等其他校验保持生效。

### 前后端同时启动（Cloudflare Pages 本地模拟）

```bash
npm run cf:dev
```

同时启动 CRA 开发服务器和 Wrangler Pages Dev，由 Wrangler 代理 CRA 并处理 `functions/` 下的 Cloudflare Functions。`CF_DEV=1` 环境变量会跳过 CRA 代理配置，避免与 Wrangler 冲突。适合开发或调试 Cloudflare Functions。

## 变更测试建议

修改渲染逻辑时建议：

1. 使用多种 Markdown 输入测试标题、列表、代码块、表格和引用。
2. 测试从飞书文档粘贴 HTML。
3. 在设置面板中验证主题切换（4 种预设 + 自定义主题色 + 系统暗黑模式自适应）。
4. 验证复制公众号后是否保留内联样式（classic 和 modern 代码块都要测）。
5. 验证专注工作区模式切换（双栏 / 仅编辑 / 仅预览）下编辑区与预览区的显隐。
6. 测试选中部分内容复制 vs 全文复制。
7. 测试 Task List 渲染（`- [x]` 和 `- [ ]`），确认预览和微信输出中复选框正确显示。
8. 测试脚注渲染（`[^1]` + `[^1]: 定义`），确认上标引用、脚注区块和返回链接正确显示。

## 现有测试

发布相关改动执行 `npm run test:publish`（Node/Pages 封面格式与运行时隔离回归），并在前端构建后执行 `npm run cf:check` 验证完整 Pages Functions 打包。

- `src/utils/*.test.js`：渲染与工具逻辑（wechatCopy、markdownRenderer、mdSourceHighlight、htmlToMarkdown、pasteDetection、findReplace、docHistory、savedThemes、imageAttachment、aiChat、aiDiff、settingsBackup、apiBase、helper）。
- `src/App.test.js`：应用级渲染与交互测试（含查找替换、保存主题等组件行为）。
- `src/setupProxy.test.js`：开发代理配置测试。
- `src/components/ai/*.test.js`：AI 面板组件测试（AiChatPanel、AiMessageBubble）。
- AI 回复的围栏代码块和缩进代码块右上角提供「复制」按钮，仅复制该块的纯文本并保留缩进、换行；流式更新时复制当前内容，成功和失败均提供文字反馈。按钮工具栏独立于代码滚动区域，并支持键盘操作与深色主题。
- AI 首段等待期间显示「正在回复」与三点提示，收到正文、推理或修改稿后切换至对应内容，避免空白小气泡；流式解析仅缓冲可能的 `<<<ARTICLE` 前缀，普通短回复即时显示。
- AI 模型迁移工具位于 `src/utils/aiProviderConfig.ts` 与 `AiProviderTransfer.tsx`，Google / 其他三协议目录由 `server/lib/ai-models-handler.ts` 提供，Node 与 Pages 共用；Pages 的聊天和目录请求共用 `functions/lib/ai-request.ts` 的来源、体积和用户凭证校验。目录获取前需刷新云端待保存配置。
- 「获取模型列表」位于模型卡片上方；`src/index.css` 统一单选下拉箭头的 12px 右侧留白及 36px 文字避让区域，模型等自定义下拉触发器同步留白。
- Token 流事件为 `{ type: 'usage', usage: { inputTokens?, outputTokens?, totalTokens?, cacheReadTokens?, cacheWriteTokens?, reasoningTokens? } }`。`server/lib/ai-token-usage.ts` 按累计快照更新，Anthropic 输入包含缓存、Google 输出包含推理；前端 `AiTokenUsage.tsx` 仅在两项齐全时推导缺失总计，统计不与缓存/推理重复相加。
- 回复底部 Token 入口使用 `formatCompactTokenCount()` 按十进制缩写为 K / M / B / T，保留一位小数并省略末尾 `.0`（1000 → 1K，1万 → 10K，100万 → 1M）；悬停和展开明细仍显示精确数字。
- AI 后端测试：`TS_NODE_PROJECT=server/tsconfig.json node -r ts-node/register --test server/lib/ai-handler.test.ts server/lib/ai-token-usage.test.ts server/lib/ai-models-handler.test.ts`；发布前运行 `npm run build` 与 `npm run cf:check`。
- `functions/lib/*.test.ts`：Cloudflare Functions 库测试，用 `npx tsx --test` 运行，不在 jest 套件内。
- `scripts/start-script.test.mjs`：启动脚本约束测试（node:test），不在 jest 套件内，需手动 `node --test scripts/start-script.test.mjs` 运行。
- `scripts/about-motion.test.mjs`：关于页 FAQ 动画的展开/收起、快速反向、减少动态效果、无动画 API 与窗口缩放降级（node:test），运行 `node --test scripts/about-motion.test.mjs`。
- `cli/*.test.mjs`、`cli/lib/*.test.mjs`：CLI 测试（node:test），不在 jest 套件内，需手动 `node --test cli/` 运行。

运行测试：

```bash
npm test
```

## 部署

- 构建输出目录：`build/`
- 部署方式：Cloudflare Pages（Git 集成自动部署为主，`npm run cf:deploy` 本地手动备用）
- 详见 [DEPLOY.md](../../DEPLOY.md)

## 文件导入功能

- `EditorPane` 支持导入本地 `.md` 文件。
- 适合导入来自 Cursor、VS Code 等编辑器的 Markdown。

## CLI 功能

仓库内置 `feishu2wx` CLI，用于在命令行完成公众号配置、主题配置、Markdown 渲染和草稿箱推送。

本地运行方式：

```bash
npm run cli -- init
npm run cli -- auth set --app-id <appid> --app-secret <secret>
npm run cli -- auth status
npm run cli -- theme list
npm run cli -- theme set blue
npm run cli -- render article.md --out article.html
npm run cli -- publish article.md --title "文章标题" --cover cover.jpg
```

CLI 只读取用户级 `~/.feishu2wx/config.json`。AppID/AppSecret 仅保存在该目录（权限为仅当前用户），不要放入项目目录或提交到仓库；自动化环境请用 `FEISHU2WX_WECHAT_APP_ID` 与 `FEISHU2WX_WECHAT_APP_SECRET` 覆盖。

`render` 默认把微信公众号兼容 HTML 输出到 stdout；指定 `--out` 会写入文件，`--copy` 会把 HTML 字符串写入系统剪贴板，`--preview` 会生成临时预览页并打开浏览器。

`theme status` 的输出项已对齐网页端会影响渲染/导出的本地持久化配置：`theme`、`font`、`codeBlockStyle`、`imageBorderStyle`、`imageBorderRadius`、`showH1Underline`、`invertH1`、`alignH1Left`、`invertH2`、`alignH2Left`、`showHorizontalRule`、`tableShadow`。

## 智能粘贴检测

粘贴检测逻辑在 `src/utils/pasteDetection.ts` 中实现，`EditorPane` 调用 `shouldConvertPastedHtml()` 判断：

- 飞书/Lark 的 HTML（含 `data-lark`、`larksuite`、`feishu.cn`、`docs.feishu`、`doc.feishu` 标记）会按自定义规则转换为 Markdown。
- HTML 表格（`<table`）会直接转换。
- 渲染后的 Markdown HTML（含 h1-h6、pre、blockquote 等标签）且纯文本不含 Markdown 语法时，会转换。
- 编辑器中的纯 Markdown 会直接使用。
- 其他来源会回退为纯文本处理。
- 用户可在设置面板「编辑体验」分类中关闭「智能粘贴转换」开关。

## 配置注意事项

- 主题预设统一定义在 `src/utils/themePresets.ts`（经典、橙色、蓝色、青绿 4 种，自定义走 `customThemeColor`），入口为右上角设置面板；输出样式分布在 `wechatCopy.ts`（导出内联样式映射，含额外 `light` / `dark` 两种内部主题）与 `styles/themes.css`（预览样式，含 `.theme-custom`），新增或修改主题时两处都要同步。`ThemeSwitcher.tsx` / `SavedThemeMenu.tsx` 为停止挂载后保留的旧组件，不要再往上面加新入口。
- 字体配置分散在两处：`FontSelector.tsx`（UI 下拉）和 `wechatCopy.ts`（导出字体映射）。新增字体时两处都要同步。
- Google Fonts 链接在 `public/index.html` 中预加载，新增 Google Font 需在此添加 `<link>`。
- `patch-package` 在 `postinstall` 时自动运行，用于修补第三方依赖。

## 提交前检查

Husky 会在每次提交前执行检查。

检查内容：

1. `package.json` 中的版本号必须更新。
2. 源码变更时应同步更新文档。

手动执行：

```bash
npm run pre-commit-check
```

必要时跳过：

```bash
git commit --no-verify -m "message"
```

详细说明见 `scripts/PRE_COMMIT_CHECK.md`。

## 版本管理

- 遵循语义化版本规范：`MAJOR.MINOR.PATCH`。
- 版本定义在 `package.json`。
- 常见流程：
  1. 修改代码。
  2. 更新版本号。
  3. 如有需要，同步更新文档。
  4. 运行 `npm run pre-commit-check`。
  5. 提交代码。

### 本地 AI 代理模型目录

参考 A2Make 的目录适配，本地代理（localhost / 127.0.0.1 / IPv6 回环）使用 Chat Completions 或 Responses 协议且仅填写根地址时，模型目录自动请求 `/v1/models`；填写 `/v1` 或完整聊天接口地址也支持。Anthropic / Google 协议保留各自目录路径和原生鉴权，并附带 Bearer 鉴权以兼容本地代理；目录支持返回 OpenAI 格式的 `data` 列表。Google Base URL 也可填写目录地址或完整的 `generateContent` / `streamGenerateContent` 地址。

本地 OpenAI 兼容代理仅填写根地址时，聊天同样自动使用 `/v1/chat/completions` 或 `/v1/responses`，与模型目录的 `/v1/models` 保持一致；显式版本路径、自定义前缀及完整接口地址沿用配置。
