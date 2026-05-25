# 架构说明

## 项目概览

`feishu2wx` 是一个纯前端 React 应用，用于将飞书（Lark）文档转换为微信公众号文章格式。用户可以粘贴飞书文档中的 HTML，或直接编写 Markdown，然后预览并将排版后的内容复制到微信公众号编辑器。

## 数据流

```text
Feishu HTML Paste → convertHtmlToMarkdown() → Markdown State
                                              ↓
                              renderMarkdown() → HTML Preview
                                              ↓
                              formatForWeChat() → Inline-styled HTML → Clipboard
```

1. 输入：用户在 `EditorPane` 中粘贴 HTML，或直接输入 Markdown，或导入本地 `.md` 文件。
2. 转换：`htmlToMarkdown.ts` 使用飞书专用规则将粘贴的 HTML 转为 Markdown。
3. 渲染：`markdownRenderer.ts` 使用 highlight.js 进行语法高亮，并把 Markdown 渲染成 HTML。
4. 输出：`wechatCopy.ts` 将预览 HTML 转换为微信公众号兼容的内联样式 HTML，并复制到剪贴板。

## 核心工具模块

### `src/utils/htmlToMarkdown.ts`

- 使用 Turndown + GFM 插件将 HTML 转为 Markdown。
- 处理飞书特有的代码块与高亮标记（`==text==`）。
- 移除 `<script>`、`<style>` 和 HTML 注释。

### `src/utils/markdownRenderer.ts`

- 使用 markdown-it 将 Markdown 渲染为 HTML，维护两个实例（classic / modern 代码块样式）。
- 使用 highlight.js 和 Atom One Dark 主题做语法高亮。
- 自动检测语言，失败时回退到默认语言。
- 在渲染前移除 YAML front matter（`---...---`）。
- `.md` 文件名链接会被还原为纯文本，避免被 linkify 错误处理。
- 链接自动添加 `target="_blank"`。
- 图片带 alt 文本时渲染为 `<figure class="img-figure">` + `<figcaption>`，无 alt 时渲染为裸 `<img>`。
- 水平分割线渲染受 `showHorizontalRule` 控制：关闭时 `<hr>` 渲染为空字符串，开启时渲染为 `<hr class="custom-hr">`。通过导出的 `setShowHorizontalRule()` / `getShowHorizontalRule()` 控制。

### `src/utils/wechatCopy.ts`

- 将预览 HTML 转为微信公众号兼容的内联样式 HTML。
- 通过内置的 highlight.js 类名到内联样式的映射保留代码块语法高亮。
- 保留 modern 代码块左上角的圆点头部，并用 `<br>` + `&nbsp;` 序列化缩进。
- 三级剪贴板回退策略：(1) Clipboard API + ClipboardItem → (2) execCommand + contenteditable div → (3) textarea 回退。
- 智能复制：检测预览区是否有选中内容，有则仅复制选中部分，否则复制全文。
- 多项微信编辑器反格式化对策：`<li>` 内容包裹 `<span>`、`<p>` 标签扁平化、列表内粗体标签转为 styled span。

### `src/utils/codeBlockStyles.ts`

- 导出 `modernCodeBlockStyles` 常量对象，包含 modern 代码块所有样式参数（颜色、内边距、圆点尺寸等）。
- 导出 `getModernCodeBlockCssVars()` 生成 CSS 自定义属性映射。

## 主题系统

- 8 种命名主题：经典、绿意、紫色、橙色、粉色、蓝色、红色、青色，定义在 `src/styles/themes.css`。
- `wechatCopy.ts` 内部额外定义了 `light` 和 `dark` 两种主题样式映射，供系统暗黑模式检测使用，但未暴露在 ThemeSwitcher UI 中。
- 预览区通过 CSS 类（`theme-{name}`）应用主题。
- 微信输出通过 `wechatCopy.ts` 中的内联样式映射注入。
- 暗黑模式通过 `window.matchMedia('(prefers-color-scheme: dark)')` 实时检测（当前仅影响 CSS 类名 `system-dark` / `system-light`，不影响主题选择）。
- 主题配置分散在 `ThemeSwitcher.tsx`（UI）、`wechatCopy.ts`（导出样式）、`styles/themes.css`（预览样式）三处。

## 字体系统

- 16 种字体（6 系统中文 + 5 系统英文 + 6 Google Fonts），配置分散在 `FontSelector.tsx`（UI 下拉）和 `wechatCopy.ts`（导出字体映射）。
- Google Fonts 通过 `public/index.html` 中的 `<link>` 预加载，CSS 字体栈会回退到系统字体。

## 状态管理

主界面状态集中在 `src/App.tsx`，包括：

- `markdown`、`html`
- `theme`、`font`
- `showEditor`、`isFullscreen`、`device`
- `showH1`、`invertH1`、`showHorizontalRule`
- `imageBorderStyle`（`'border' | 'shadow'`）、`codeBlockStyle`（`'classic' | 'modern'`，默认 `'modern'`）
- `isSystemDark`
- `copyStatus`（复制结果弹窗）

所有设置都会持久化到 localStorage（键名前缀 `feishu2wx_`）。预览 HTML 由 `markdown` 和渲染选项通过纯函数派生。

## 组件结构

- `App.tsx`：主容器与状态中心，含顶部控制栏（字体、设备切换、全屏、主题）。
- `EditorPane.tsx`：编辑区、飞书粘贴检测、本地 `.md` 文件导入、行内格式化工具栏。
- `PreviewPane.tsx`：渲染预览，处理桌面端/移动端宽度，应用字体和代码块 CSS 变量。
- `Toolbar.tsx`：底部工具栏（加载示例、清空、H1 底线、H1 反显、水平分割线、图片样式、代码块样式、一键复制）。
- `ThemeSwitcher.tsx`：横向主题按钮组。
- `FontSelector.tsx`：字体下拉选择器。
- `DevicePreviewToggle.tsx`：桌面/手机双按钮切换。

## 关键行为

### 飞书 HTML 检测

`EditorPane` 检查剪贴板 HTML 是否包含 `feishu`、`larksuite`、`feishu.cn`、`lark` 等标记，决定走 HTML 转 Markdown 还是直接保留纯文本。

### 微信公众号兼容性约束

- 所有样式必须内联。
- 优先使用 `px`，不要依赖 `em` 或 `rem`。
- 避免复杂布局结构。
- 表格需要 `border-collapse: collapse`。
- 图片需要 `max-width: 100%`，上下间距由外层块（`figure` 或 `section.wechat-image-wrapper`）统一控制，避免与 `<p>` 的默认 margin 叠加产生额外空行。

### 代码块样式

- `classic`：浅色背景，简洁的 `pre > code`。
- `modern`：深色代码窗口样式，带 3 个圆点头部和横向滚动。
- `modern` 代码块共享样式参数定义在 `src/utils/codeBlockStyles.ts`。
- 微信输出会显式保留代码块左对齐与缩进，且不依赖当前页面上的预览 DOM。

### 渲染开关

- H1 下划线显隐
- H1 反显（主题色背景 + 白色文字，宽度自适应）
- 水平分割线显隐
- 图片边框 / 阴影模式切换
- 代码块 classic / modern 切换

### 布局与排版规则

- 标题、段落、列表和表格的间距都针对文章阅读体验与微信粘贴保真度做过调整。
- 橙色主题的 H1 反显使用 `headingColor` 而非 `primaryColor` 作为背景色。
