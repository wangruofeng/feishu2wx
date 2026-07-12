# CLAUDE.md

本文件只保留 Claude 在本仓库中工作时必须知道的最小上下文。详细说明请查看拆分后的文档。

## 项目概览

`feishu2wx` 是一个 React 应用，用于将飞书文档转换成微信公众号文章格式。用户可以粘贴飞书 HTML 或直接编写 Markdown，然后预览并复制公众号编辑器，也可以配置公众号凭证后直接推送到微信草稿箱。

## 核心数据流

```text
Feishu HTML Paste → convertHtmlToMarkdown() → Markdown State
                                              ↓
                              renderMarkdown() → HTML Preview
                                              ↓
                              formatForWeChat() → Inline-styled HTML → Clipboard / 文件下载（导出）

推送流程（需后端）：
  前端 localStorage → POST /api/publish/draft { appId, appSecret, ... }
                      ↓
         Express server / Cloudflare Functions → 微信 API（access_token → 并发上传图片(最多4个) → 创建草稿）
```

关键职责：

- `src/utils/htmlToMarkdown.ts`：飞书 HTML 转 Markdown
- `src/utils/markdownRenderer.ts`：Markdown 转预览 HTML
- `src/utils/wechatCopy.ts`：将预览 HTML 转为微信公众号兼容的内联样式 HTML 并复制；`exportHtmlToFile()` 将同一份 HTML 包裹为完整文档触发浏览器下载
- `src/utils/publishApi.ts`：推送草稿箱 API + localStorage 凭证管理
- `src/utils/helper.ts`：工具函数（内容感知 WebP 检测，检查文件签名 RIFF/WEBP 和 HTTP Content-Type，不依赖 URL 后缀）
- `src/utils/helper.test.js`：helper 工具函数单元测试
- `functions/api/publish/draft.ts`：Cloudflare Function，代理微信草稿箱 API
- `server/lib/wechat-worker.ts`：微信 API 封装（access_token、图片上传（WebP 上传前归一化为 PNG/GIF，MIME type 正确设置，优先用 HTTP 响应头检测类型）、创建草稿）
- `src/components/ui/Button.tsx`：统一按钮组件，所有 `<button>` 应从该组件导入，通过 `variant` 映射原始 CSS 类名

## 必须知道的约束

- 核心排版是前端项目，主要改动集中在 `src/`；推送草稿箱功能涉及 `functions/`（Cloudflare Functions）和 `server/lib/`（共享逻辑）
- 微信公众号输出必须依赖内联样式，不能假设外部 CSS 生效
- 代码块、列表、图片、表格、视频是高风险区域，改动后要重点验证
- Task List（`- [x]` / `- [ ]`）通过 DOM 后处理实现（非 markdown-it 插件），在 `markdownRenderer.ts` 的 `renderMarkdown()` 中处理
- 脚注通过 `markdown-it-footnote` 插件支持，样式分散在 `PreviewPane.css`（预览）和 `wechatCopy.ts`（微信输出）
- frontmatter 元数据卡片中数组字段默认渲染为标签徽章（`frontmatter-tags`），但 `ai_summary` 字段渲染为无序列表（`frontmatter-summary-list`），均定义在 `markdownRenderer.ts` 的 `renderFrontMatterPreview()` 和 `PreviewPane.css`
- 图片有 alt 时渲染为 `<figure>`（含 `<figcaption>`），无 alt 时为裸 `<img>`；微信输出的图片上下间距由外层块统一控制，不应在 `<img>` 上设置上下 margin
- WebP 图片在服务端上传微信 API 前归一化：静态 WebP 转 PNG，动态 WebP 转 GIF，以兼容微信正文图上传并保留动图；前端 `convertWebpToPng()` 保留为备用工具函数
- `src/data/example.ts` 为默认示例文档，其中演示图片应使用自托管链接（如 `img.wangruofeng007.com`）避免外链失效
- 图片查看器（`ImageViewer`）支持点击放大预览，键盘左右切换所有图片，通过 `PreviewPane` 收集预览区图片列表传入
- `modern` 代码块样式的共享参数在 `src/utils/codeBlockStyles.ts`
- Mermaid 代码块（` ```mermaid `）通过两阶段渲染：`renderMarkdown()` 同步产出 `<div class="mermaid" data-mermaid-source>` 占位（非 `<pre>`，避免被 `convertSvgImagesToPng` 的 `svg.closest('pre,code')` 跳过和 `applyThemeStyles` 当代码块重建）；`renderMermaidBlocks()` 异步用 `mermaid.render()`（动态 `import('mermaid')`）把占位替换为内联 `<svg>`，在 `App.tsx` 的渲染 effect 中 `await` 后 `setHtml`；复制/导出管线经 `convertSvgImagesToPng` 自动把 SVG 栅格化为 PNG，无需改动 `wechatCopy.ts`
- 编辑器 Markdown 源码语法高亮（textarea overlay 模式）：`src/utils/mdSourceHighlight.ts` 提供行扫描 tokenizer（`tokenizeMarkdown`）与预设配色方案（github/dracula/monokai/none，`getMdSyntaxCssVars` 注入 `--md-tok-*` CSS 变量）；`EditorPane.tsx` 在 `.markdown-editor` 下方叠加 `.md-highlight-layer`（文字透明仅 caret 可见，层随 textarea `onScroll` 的 `transform` 同步位移）；配色方案经 `syntaxTheme` 状态（localStorage 键 `feishu2wx_syntaxTheme`）在「通用」组配置，高亮层字体度量须与 `.markdown-editor` 严格一致
- `==text==` 高亮语法：`markdownRenderer.ts` 的自定义 `mark` 规则解析为 `<mark>` 标签，与 `htmlToMarkdown.ts` 飞书高亮输入端配合
- 引用块三项独立配置：背景（`blockquoteBackgroundMode`）、边框色（`blockquoteColorMode`）、间距（`blockquoteHeightMode`），以及正文对齐（`textAlignMode`），预览层、微信输出层（`wechatCopy.ts`）与 CLI（`cli/lib/config.cjs` + `render-pipeline.cjs`）都要同步处理；CLI 中旧 `showBlockquoteBg` 兼容映射为 `blockquoteBackgroundMode` 的布尔形式，同时传时新选项优先
- CLI（`cli/index.js`，commander）支持 `init` / `auth` / `theme` / `render` / `publish` 五类命令；一组通用的主题排版覆盖选项由 `addThemeOptions()` 注入到 `render`/`publish`/`theme set`（在 `--help` 中折叠为提示行，仍可解析）。命令速查与配置优先级见 [cli/README.md](cli/README.md)
- 设计 token 定义在 `src/styles/tokens.css`，UI 框架层的颜色、字体、间距、圆角等应使用 `var(--*)` 引用；暗黑主题通过 `.theme-dark` 覆盖 token 值实现
- 主题配置分散在三处（`ThemeSwitcher.tsx`、`wechatCopy.ts`、`styles/themes.css`），ThemeSwitcher 深色模式色值在 `ThemeSwitcher.css` 中独立控制，不通过 CSS 变量继承
- 字体配置分散在两处（`FontSelector.tsx`、`wechatCopy.ts`），改字体时两处都要同步
- 配置与显示状态保存在 localStorage 中（键名前缀 `feishu2wx_`）
- 公众号 AppID/AppSecret 通过前端 `publishApi.ts` 保存在 localStorage（键 `feishu2wx_wechat_config`），推送时随请求体发送到后端，不经过任何服务端存储
- 快捷键：`EditorPane.tsx` 管理编辑区快捷键（Cmd+B 加粗切换、Cmd+I 斜体切换、Cmd+U 下划线切换、Cmd+K 链接、Cmd+Z 撤销、Cmd+Shift+Z 重做），`App.tsx` 管理全局快捷键（Option+E 编辑/预览切换）；所有快捷键在 `ShortcutsDrawer` 组件中展示
- 文章大纲：`EditorPane.tsx` 底部工具栏右侧大纲按钮，解析 Markdown 中的 H1-H3 标题（跳过 frontmatter 与代码块），点击大纲项滚动 textarea 定位到对应标题
- 文章首尾模板：`App.tsx` 管理 `headerTemplate`/`footerTemplate` 状态（localStorage 键 `feishu2wx_headerTemplate`/`feishu2wx_footerTemplate`），推送/复制时自动拼接到正文前后（frontmatter 之后、正文之前 / 正文之后），设置面板可配置
- 推送标题/封面自动读取：`App.tsx` 的 `articleTitle` 优先从 frontmatter `title` 字段读取（fallback 到 H1），`articleCover` 从 frontmatter `cover` 字段读取
- 导出 HTML：`App.tsx` 顶栏「导出」按钮复用复制/推送同款管线（`convertSvgImagesToPng` → `formatForWeChat`），再通过 `wechatCopy.ts` 的 `exportHtmlToFile()` 把内联样式 HTML 包裹成完整文档下载；文件名取 `articleTitle`
- 经典主题主色调为 `#000000e6`（90% 不透明黑），配置分散在三处（`ThemeSwitcher.tsx`、`wechatCopy.ts`、`styles/themes.css`）
- 提交前会运行 Husky 检查：
  - `package.json` 版本号必须更新
  - 源码变更通常需要同步更新文档

## 详细文档

- 架构与渲染细节：[docs/claude/architecture.md](docs/claude/architecture.md)
- 开发命令、测试、部署与提交流程：[docs/claude/development.md](docs/claude/development.md)
- 部署说明（GitHub Pages + Cloudflare Pages）：[DEPLOY.md](DEPLOY.md)
- CLI 命令速查与配置：[cli/README.md](cli/README.md)


## 行为准则

减少 LLM 编码常见错误的指导原则。按需与项目特定指令合并。

**取舍原则：** 这些准则偏向谨慎而非速度。对于简单任务，自行判断即可。

### 1. 编码前先思考

**不要想当然。不要掩饰困惑。主动呈现取舍。**

实施前：
- 明确陈述你的假设。如果不确定，就问。
- 如果存在多种理解，全部列出来——不要默默选择。
- 如果有更简单的方案，说出来。必要时提出反对意见。
- 如果有不清楚的地方，停下来。指出困惑之处，然后提问。

### 2. 简单优先

**用最少的代码解决问题。不做任何推测性设计。**

- 不添加超出需求的功能。
- 不为单次使用的代码创建抽象。
- 不添加未经请求的"灵活性"或"可配置性"。
- 不为不可能发生的场景编写错误处理。
- 如果你写了 200 行而实际 50 行就能搞定，重写。

问问自己："资深工程师会认为这过于复杂吗？"如果是，简化它。

### 3. 精准修改

**只改必须改的。只清理自己造成的残留。**

编辑现有代码时：
- 不要"顺手改进"相邻的代码、注释或格式。
- 不要重构正常工作的代码。
- 匹配现有风格，即使你会用不同的方式。
- 如果你注意到无关的死代码，提一下——不要删除它。

当你的修改产生了废弃代码：
- 删除因你的修改而变得未使用的 import/变量/函数。
- 不要删除之前就存在的死代码，除非被要求。

检验标准：每一行修改都应该能直接追溯到用户的需求。

### 4. 目标驱动执行

**定义成功标准。循环直到验证通过。**

将任务转化为可验证的目标：
- "添加校验" → "为无效输入编写测试，然后让测试通过"
- "修复 bug" → "编写能复现 bug 的测试，然后让测试通过"
- "重构 X" → "确保重构前后测试都通过"

对于多步骤任务，先列出简要计划：
```
1. [步骤] → 验证：[检查方式]
2. [步骤] → 验证：[检查方式]
3. [步骤] → 验证：[检查方式]
```

强成功标准让你能独立迭代。弱标准（"让它能跑"）需要不断确认。

---

**这些准则生效的标志：** diff 中不必要的变更更少、因过度复杂导致的重写更少、澄清问题在实施之前提出而非犯错之后。
