# CLAUDE.md

本文件只保留 Claude 在本仓库中工作时必须知道的最小上下文。详细说明请查看拆分后的文档。

## 项目概览

`feishu2wx` 是一个纯前端 React 应用，用于将飞书（Lark）文档转换成微信公众号文章格式。用户可以粘贴飞书 HTML 或直接编写 Markdown，然后预览并复制到微信公众号编辑器。

## 核心数据流

```text
Feishu HTML Paste → convertHtmlToMarkdown() → Markdown State
                                              ↓
                              renderMarkdown() → HTML Preview
                                              ↓
                              formatForWeChat() → Inline-styled HTML → Clipboard
```

关键职责：

- `src/utils/htmlToMarkdown.ts`：飞书 HTML 转 Markdown
- `src/utils/markdownRenderer.ts`：Markdown 转预览 HTML
- `src/utils/wechatCopy.ts`：将预览 HTML 转为微信公众号兼容的内联样式 HTML 并复制

## 必须知道的约束

- 这是纯前端项目，主要改动集中在 `src/`
- 微信公众号输出必须依赖内联样式，不能假设外部 CSS 生效
- 代码块、列表、图片、表格是高风险区域，改动后要重点验证
- `modern` 代码块样式的共享参数在 `src/utils/codeBlockStyles.ts`
- 主题配置分散在三处（`ThemeSwitcher.tsx`、`wechatCopy.ts`、`styles/themes.css`），改主题时三处都要同步
- 字体配置分散在两处（`FontSelector.tsx`、`wechatCopy.ts`），改字体时两处都要同步
- 配置与显示状态保存在 localStorage 中（键名前缀 `feishu2wx_`）
- 提交前会运行 Husky 检查：
  - `package.json` 版本号必须更新
  - 源码变更通常需要同步更新文档

## 详细文档

- 架构与渲染细节：[docs/claude/architecture.md](docs/claude/architecture.md)
- 开发命令、测试、部署与提交流程：[docs/claude/development.md](docs/claude/development.md)
