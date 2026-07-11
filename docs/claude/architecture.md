# 架构说明

## 项目概览

`feishu2wx` 是一个纯前端 React 应用，用于将飞书（Lark）文档转换为微信公众号文章格式。用户可以粘贴飞书文档中的 HTML，或直接编写 Markdown，然后预览并将排版后的内容复制公众号编辑器。

## 数据流

```text
Feishu HTML Paste → convertHtmlToMarkdown() → Markdown State
                                              ↓
                              renderMarkdown() → HTML Preview
                                              ↓
                              formatForWeChat() → Inline-styled HTML → Clipboard / 文件下载（导出）
```

1. 输入：用户在 `EditorPane` 中粘贴 HTML，或直接输入 Markdown，或导入本地 `.md` 文件。
2. 转换：`htmlToMarkdown.ts` 使用飞书专用规则将粘贴的 HTML 转为 Markdown。
3. 渲染：`markdownRenderer.ts` 使用 highlight.js 进行语法高亮，并把 Markdown 渲染成 HTML。
4. 输出：`wechatCopy.ts` 将预览 HTML 转换为微信公众号兼容的内联样式 HTML，复制到剪贴板或通过 `exportHtmlToFile()` 包裹成完整 HTML 文档下载。

## 核心工具模块

### `src/utils/htmlToMarkdown.ts`

- 使用 Turndown + GFM 插件将 HTML 转为 Markdown。
- 处理飞书特有的代码块与高亮标记（`==text==`）。
- 移除 `<script>`、`<style>` 和 HTML 注释。

### `src/utils/markdownRenderer.ts`

- 使用 markdown-it 将 Markdown 渲染为 HTML，维护两个实例（classic / modern 代码块样式），均加载 `markdown-it-footnote` 脚注插件。
- 使用 highlight.js 和 Atom One Dark 主题做语法高亮。
- 自动检测语言，失败时回退到默认语言。
- 在网页预览中将 YAML front matter（`---...---`）展示为元数据卡片，复制和推送到公众号时会剥离该预览专用节点。卡片内数组字段默认渲染为标签徽章（`frontmatter-tags`），但 `ai_summary` 字段渲染为无序列表（`frontmatter-summary-list`）。
- `.md` 文件名链接会被还原为纯文本，避免被 linkify 错误处理。
- 链接自动添加 `target="_blank"`。
- 图片带 alt 文本时，预览层渲染为 `<figure class="img-figure">` + `<figcaption>`；导出到微信时会降级为更稳妥的 `section.wechat-image-wrapper + img + p.img-caption`。无 alt 时预览层仍渲染为裸 `<img>`。
- 水平分割线渲染受 `showHorizontalRule` 控制：关闭时 `<hr>` 渲染为空字符串，开启时渲染为 `<hr class="custom-hr">`。通过导出的 `setShowHorizontalRule()` / `getShowHorizontalRule()` 控制。
- Task List 后处理：检测 `<li>` 中的 `[x]` / `[ ]` 前缀，替换为 `<span class="task-checkbox">`（☑/☐）和 `task-list-item` 类。支持 `<li>text` 和 `<li><p>text</p>` 两种 DOM 结构。
- 脚注由 `markdown-it-footnote` 插件处理，生成 `sup.footnote-ref`（正文引用）、`hr.footnotes-sep`（分隔线）、`section.footnotes > ol.footnotes-list > li.footnote-item`（脚注区块）、`a.footnote-backref`（返回链接）。

### `src/utils/wechatCopy.ts`

- 将预览 HTML 转为微信公众号兼容的内联样式 HTML。
- 通过内置的 highlight.js 类名到内联样式的映射保留代码块语法高亮。
- 保留 modern 代码块左上角的圆点头部，并用 `<br>` + `&nbsp;` 序列化缩进。
- 三级剪贴板回退策略：(1) Clipboard API + ClipboardItem → (2) execCommand + contenteditable div → (3) textarea 回退。
- 智能复制：检测预览区是否有选中内容，有则仅复制选中部分，否则复制全文。
- 导出 HTML：`exportHtmlToFile()` 把 `formatForWeChat` 产出的 body 片段包裹为完整 HTML 文档（`<!DOCTYPE>` + `<head>` 含 `<meta charset>` 与 `<title>`），用 Blob + `<a download>` 触发浏览器下载；文件名由 `sanitizeFilename()` 从 `articleTitle` 清洗得到。
- 多项微信编辑器反格式化对策：`<li>` 内容包裹 `<span>`、`<p>` 标签扁平化、列表内粗体标签转为 styled span。
- 列表空白清理（`removeListFormattingWhitespace`）：推送前移除 `<ul>/<ol>` 和 `<li>` 中的纯换行文本节点，并将 `<li>` 内的 `<p>` 展开为 `<span>`，确保微信编辑器不产生多余空行。
- Task List checkbox 内联样式处理：为 `.task-checkbox` 添加 `margin-right`、`font-size`、`vertical-align`；为 `li.task-list-item` 移除列表标记并左移。
- 脚注内联样式处理：`hr.footnotes-sep`（细线分隔）、`section.footnotes`（小字号灰色）、`ol.footnotes-list`（缩进）、`.footnote-ref`（上标主题色）、`.footnote-backref`（主题色链接）。

### `src/utils/codeBlockStyles.ts`

- 导出 `modernCodeBlockStyles` 常量对象，包含 modern 代码块所有样式参数（颜色、内边距、圆点尺寸等）。
- 导出 `getModernCodeBlockCssVars()` 生成 CSS 自定义属性映射。

### `src/utils/pasteDetection.ts`

- 导出 `shouldConvertPastedHtml(htmlData, textData)` 判断粘贴内容是否需要走 HTML 转 Markdown。
- 导出 `looksLikeMarkdownText(text)` 检测纯文本是否包含 Markdown 语法。
- 内部函数 `looksLikeRenderedMarkdownHtml(html)` 检测 HTML 是否像渲染后的 Markdown。

### `src/utils/publishApi.ts`

- 推送草稿箱 API 封装：`fetchWechatConfig()`、`saveWechatConfig()`、`deleteWechatConfig()`、`publishToDraft()`。
- 凭证保存在 localStorage（键 `feishu2wx_wechat_config`），推送时随请求体发送到后端。

### `src/utils/wechatTagWhitelist.ts`

- 导出微信兼容标签白名单：`WECHAT_SAFE_HTML_TAGS`（稳定标签）、`WECHAT_UNSTABLE_HTML_TAGS`（不作为稳定依赖）、`WECHAT_UNSUPPORTED_HTML_TAGS`（不支持）。

### `src/utils/coverCanvas.ts`

- 导出 `generateCover()` 用于 `PublishDialog` 生成封面图片。

### `src/utils/helper.ts`

- 工具函数，包括内容感知 WebP 检测（检查文件签名 RIFF/WEBP 和 HTTP Content-Type，不依赖 URL 后缀）。

## 主题系统

- 4 种命名主题：经典（`#000000e6`）、橙色、蓝色、青绿，定义在 `src/styles/themes.css`。
- 暗黑模式独立于主题配色，通过 `.theme-dark` CSS 类覆盖设计 token 值实现，可在任意主题下启用。
- `ThemeSwitcher.tsx` 深色模式色值在 `ThemeSwitcher.css` 中独立控制，不通过 CSS 变量继承。
- 预览区通过 CSS 类（`theme-{name}`）应用主题。
- 微信输出通过 `wechatCopy.ts` 中的内联样式映射注入。
- 主题配置分散在 `ThemeSwitcher.tsx`（UI）、`wechatCopy.ts`（导出样式）、`styles/themes.css`（预览样式）三处。

## 字体系统

- 16 种字体（6 系统中文 + 5 系统英文 + 6 Google Fonts），配置分散在 `FontSelector.tsx`（UI 下拉）和 `wechatCopy.ts`（导出字体映射）。
- Google Fonts 通过 `public/index.html` 中的 `<link>` 预加载，CSS 字体栈会回退到系统字体。

## 状态管理

主界面状态集中在 `src/App.tsx`，包括：

- `markdown`、`html`
- `theme`、`font`
- `showEditor`、`isFullscreen`、`device`
- `showH1Underline`、`invertH1`、`alignH1Left`、`invertH2`、`alignH2Left`、`showHorizontalRule`、`showFrontMatter`
- `imageBorderStyle`（`'border' | 'shadow' | 'default'`）、`codeBlockStyle`（`'classic' | 'modern'`，默认 `'modern'`）
- `isSystemDark`、`darkMode`（`'system' | 'light' | 'dark'` 三态切换）
- `copyStatus`（复制/导出结果弹窗，复用同一 toast）、`isExporting`（导出中禁用）
- `shouldConvertPastedHtml`（智能 HTML 转 Markdown 开关）
- `shortcutsOpen`（快捷键抽屉面板）
- `showBackTop`（回到顶部按钮）
- `publishOpen`、`publishHtml`（推送对话框）
- `wechatConfigured`（公众号凭证状态）
- `headerTemplate`、`footerTemplate`（文章首尾模板，持久化键 `feishu2wx_headerTemplate`/`feishu2wx_footerTemplate`，推送/复制时拼接到 front matter 之后 / 正文之后）
- `articleTitle`（推送标题，优先取 front matter `title`，回退正文首个 H1）、`articleCover`（推送封面，取 front matter `cover`）

所有设置都会持久化到 localStorage（键名前缀 `feishu2wx_`）。预览 HTML 由 `markdown` 和渲染选项通过纯函数派生。

## 组件结构

- `App.tsx`：主容器与状态中心，含顶部控制栏（字体、设备切换、全屏、主题、设置面板）。
- `EditorPane.tsx`：编辑区、飞书粘贴检测、本地 `.md` 文件导入、行内格式化工具栏、快捷键（B/I/U/K/Z）、自定义撤销（50 步历史）、文章大纲（解析 H1-H3，跳过 frontmatter 与代码块，点击大纲项滚动 textarea 定位到对应标题）。
- `PreviewPane.tsx`：渲染预览，处理桌面端/移动端宽度，应用字体和代码块 CSS 变量。
- `Toolbar.tsx`：底部工具栏（加载示例、清空、H1 底线、H1 反显、水平分割线、图片样式、代码块样式、一键复制）。
- `ThemeSwitcher.tsx`：横向主题按钮组（4 种主题：经典、橙色、蓝色、青绿）。
- `FontSelector.tsx`：字体下拉选择器（16 种字体）。
- `DevicePreviewToggle.tsx`：桌面/手机双按钮切换。
- `SettingsPanel.tsx`：排版设置面板，提供字体、H1 样式（底线/反色/对齐）、H2 样式（反色/对齐）、分割线、元数据显示、表格阴影、图片模式（默认/边框/阴影）、代码块样式、智能 HTML 转 Markdown 开关的可视化配置。
- `ImageViewer.tsx`：图片查看器，支持键盘左右切换预览区所有图片，底部显示序号。
- `ShortcutsDrawer.tsx`：快捷键抽屉面板，展示所有键盘快捷键（格式、编辑、视图三组），支持 ESC 关闭和遮罩点击关闭。
- `PublishDialog.tsx`：推送对话框（标题、作者、封面）。
- `WechatConfigDialog.tsx`：公众号配置对话框。

## 关键行为

### 飞书 HTML 检测

粘贴检测逻辑抽取到 `src/utils/pasteDetection.ts`，`EditorPane` 调用 `shouldConvertPastedHtml(htmlData, textData)` 判断是否将粘贴的 HTML 转为 Markdown。检测条件：

1. Feishu/Lark 标记（`data-lark`、`larksuite`、`feishu.cn`、`docs.feishu`、`doc.feishu`）→ 直接转换。
2. HTML 表格（`<table`）→ 直接转换。
3. HTML 看起来像渲染后的 Markdown（含 `h1-h6`、`pre`、`blockquote`、`ul`、`ol`、`li`、`hr`），且纯文本不包含 Markdown 语法 → 转换。
4. 其他情况 → 保留纯文本。

用户可在设置面板中关闭"智能 HTML 转 Markdown"开关（`shouldConvertPastedHtml` 状态），回退为仅粘贴纯文本。

### 微信公众号兼容性约束

- 所有样式必须内联。
- 优先使用 `px`，不要依赖 `em` 或 `rem`。
- 避免复杂布局结构。
- 表格需要 `border-collapse: collapse`。
- 建议只依赖保守标签子集：`p`、`br`、`strong/b`、`em/i`、`u`、`span`、`ul/ol/li`、`a`、`img`、`section`、`blockquote`、`h1-h6`、`table/tr/th/td`、`hr`、`sup/sub`。
- `figure` / `figcaption` 在微信里不作为稳定标签依赖，导出链路会自动降级成 `section + p.img-caption`。
- 图片需要 `max-width: 100%`，上下间距由外层块（`figure` 仅限预览层，微信导出统一为 `section.wechat-image-wrapper`）控制，避免与 `<p>` 的默认 margin 叠加产生额外空行。

### 代码块样式

- `classic`（极简）：浅色背景，简洁的 `pre > code`。
- `modern`：深色代码窗口样式，带 3 个圆点头部和横向滚动。
- `modern` 代码块共享样式参数定义在 `src/utils/codeBlockStyles.ts`。
- 微信输出会显式保留代码块左对齐与缩进，且不依赖当前页面上的预览 DOM。

### 渲染开关

- H1 下划线显隐
- H1 反显（主题色背景 + 白色文字，宽度自适应）
- H1 左对齐 / 居中对齐切换
- H2 反显（主题色背景 + 白色文字）
- H2 左对齐 / 居中对齐切换
- 水平分割线显隐
- 表格阴影显隐

### UI 组件

- `src/components/ui/Button.tsx`：统一按钮组件，通过 `variant` 属性映射项目中已有的 CSS 类名（如 `copy-btn`、`publish-btn-top` 等），不改变原始样式。所有 `<button>` 应从该组件导入。

### 快捷键系统

- 编辑区快捷键在 `EditorPane.tsx` 中实现：Cmd+B（加粗）、Cmd+I（斜体）、Cmd+U（下划线）、Cmd+K（链接）、Cmd+Z（撤销）、Cmd+Shift+Z（重做）。
- 全局快捷键在 `App.tsx` 中实现：Option+E（编辑/预览切换）。
- 所有快捷键在 `ShortcutsDrawer` 组件中展示，通过抽屉面板查看。

### 布局与排版规则

- 标题、段落、列表和表格的间距都针对文章阅读体验与微信粘贴保真度做过调整。
- 橙色主题的 H1 反显使用 `headingColor` 而非 `primaryColor` 作为背景色；H2 反显统一使用 `primaryColor`。
- 设计 token 定义在 `src/styles/tokens.css`，UI 框架层的颜色、字体、间距、圆角等应使用 `var(--*)` 引用。字体变量名为 `--font-sans`。
