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

1. 输入：用户在 `EditorPane` 中粘贴 HTML，或直接输入 Markdown。
2. 转换：`htmlToMarkdown.ts` 使用飞书专用规则将粘贴的 HTML 转为 Markdown。
3. 渲染：`markdownRenderer.ts` 使用 highlight.js 进行语法高亮，并把 Markdown 渲染成 HTML。
4. 输出：`wechatCopy.ts` 将预览 HTML 转换为微信公众号兼容的内联样式 HTML，并复制到剪贴板。

## 核心工具模块

### `frontend/src/utils/htmlToMarkdown.ts`

- 使用 Turndown + GFM 插件将 HTML 转为 Markdown。
- 处理飞书特有的代码块与高亮标记。
- 移除 `<script>`、`<style>` 和 HTML 注释。

### `frontend/src/utils/markdownRenderer.ts`

- 使用 markdown-it 将 Markdown 渲染为 HTML。
- 使用 highlight.js 和 Atom One Dark 主题做语法高亮。
- 增加自定义代码块包装结构与链接处理。
- 在渲染前移除 YAML front matter。
- 渲染选项通过显式参数传入，不再依赖模块级全局状态。

### `frontend/src/utils/wechatCopy.ts`

- 将预览 HTML 转为微信公众号兼容的内联样式 HTML。
- 通过内置的 highlight.js 类名到内联样式的映射保留代码块语法高亮。
- 保留 modern 代码块左上角的圆点头部，并用 `<br>` + `&nbsp;` 序列化缩进，保证粘贴到微信后样式尽量一致。
- 优先使用 Clipboard API，失败时回退到 `document.execCommand('copy')`。

### `frontend/src/config/editorConfig.ts`

- 统一维护主题和字体配置。
- 预览区、主题切换器、字体切换器和微信导出共用同一份配置，避免配置漂移。

## 主题系统

- 主题定义集中在 `frontend/src/config/editorConfig.ts`。
- 预览区通过 `frontend/src/styles/themes.css` 中的 CSS 类应用主题。
- 微信输出通过 `formatForWeChat()` 注入内联样式。
- 暗黑模式通过 `window.matchMedia('(prefers-color-scheme: dark)')` 检测。

## 字体系统

- 字体定义集中在 `frontend/src/config/editorConfig.ts`。
- 字体通过 `frontend/public/index.html` 中的 Google Fonts CDN 加载。

## 状态管理

主界面状态集中在 `frontend/src/App.tsx`，包括：

- `markdown`、`html`
- `theme`、`font`
- `showEditor`、`isFullscreen`、`devicePreview`
- `showH1`、`showHorizontalRule`
- `imageBorderStyle`、`codeBlockStyle`
- 粘贴检测与复制状态相关状态

所有设置都会持久化到 localStorage。预览 HTML 由 `markdown` 和渲染选项通过纯函数派生，不再单独维护一份可变状态。

## 组件结构

- `App.tsx`：主容器与状态中心。
- `EditorPane.tsx`：编辑区、粘贴处理、本地 Markdown 导入。
- `PreviewPane.tsx`：渲染预览，处理桌面端/移动端宽度。
- `Toolbar.tsx`：复制与外观控制。
- `ThemeSwitcher.tsx`、`FontSelector.tsx`、`DevicePreviewToggle.tsx`：设置类 UI 组件。

## 关键行为

### 飞书 HTML 检测

`EditorPane` 会检查剪贴板中的 HTML 是否包含 Feishu/Lark 标记，再决定是走 HTML 转 Markdown，还是直接保留原始纯文本 Markdown。

### 微信公众号兼容性约束

- 所有样式必须内联。
- 优先使用 `px`，不要依赖 `em` 或 `rem`。
- 避免复杂布局结构。
- 表格需要 `border-collapse: collapse`。
- 图片需要 `display: block` 和 `max-width: 100%`。

### 代码块样式

- `classic`：浅色背景，简洁的 `pre > code`。
- `modern`：深色代码窗口样式，带 3 个圆点头部和横向滚动。
- `modern` 代码块共享样式参数定义在 `frontend/src/utils/codeBlockStyles.ts`。
- 微信输出会显式保留代码块左对齐与缩进，且不再依赖当前页面上的预览 DOM。

### 其他渲染开关

- H1 下划线显隐
- 水平分割线显隐
- 图片边框 / 阴影模式切换

### 布局与排版规则

- 标题、段落、列表和表格的间距都针对文章阅读体验与微信粘贴保真度做过调整。
- 当前实现已经修复了嵌套列表重叠和重复粘贴问题。
