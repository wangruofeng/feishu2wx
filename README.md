<div align="center">

<img src="public/logo.svg" width="480" alt="feishu2wx logo" />

# 飞书文档 → 微信公众号排版神器

**粘贴飞书文档或直接编写 Markdown，实时预览，一键复制到微信公众号编辑器。**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Markdown-it](https://img.shields.io/badge/Markdown--it-000000?style=flat&logo=markdown&logoColor=white)](https://github.com/markdown-it/markdown-it)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**[在线使用](https://feishu2wx.wangruofeng007.com/) · [使用指南](docs/usage.md) · [CLI 文档](cli/README.md) · [部署指南](DEPLOY.md)**

</div>

## ✨ 功能特性

### 📥 内容输入

- **飞书文档直接粘贴** - 自动转换为 Markdown，飞书高亮标记 `==text==` 完整保留
- **智能粘贴识别** - 从渲染后的 Markdown 页面复制内容时，按 HTML 结构还原标题、列表、代码块，不退化为纯文本
- **本地导入** - 支持导入 `.md` 文件；图片附件（含 SVG）拖拽/粘贴直接插入为 data URI
- **历史文档** - 导入、清空、恢复等替换操作前自动存档（上限 20 条），可随时找回

### ✏️ 编辑与预览

- **实时预览** - 左侧编辑源码，右侧实时渲染，滚动自动联动
- **源码高亮** - 编辑器内置 GitHub / Dracula / Monokai / 无 四种配色，不影响输入
- **文章大纲** - 解析 H1-H3 生成大纲，点击快速定位
- **格式工具栏与快捷键** - Cmd/Ctrl+B（粗体）、I（斜体）、U（下划线）、K（链接）、Z（撤销，50 步历史）
- **多设备预览** - 电脑 / 手机两种宽度，支持全屏预览与隐藏源码专注预览

### 🎨 排版定制

- **5 种主题** - 经典 / 橙色 / 蓝色 / 青绿 / 自定义；自定义主题只需挑一个主色，整套配色自动生成；浅色 / 深色 / 跟随系统三种模式
- **17 种免费字体** - 系统字体与 Google Fonts，全部无版权
- **逐项可调的排版选项** - H1/H2 样式（底线、反显、对齐）、引用块（背景 / 边框色 / 间距）、图片（边框 / 阴影 / 圆角）、代码块（极简 / 现代）、正文对齐、表格阴影、分割线等
- **文章首尾模板** - 可配置的首尾片段，复制 / 推送时自动拼接，可单独开关
- **荧光笔高亮** - `==高亮==` 语法支持 5 种荧光笔颜色
- **配置迁移** - 排版设置一键导出 / 导入 JSON，与 CLI 配置文件同构，不含任何凭证

### 📤 导出与发布

- **一键复制公众号** - 全部样式转内联；预览区选中部分可单独复制；公众号链接自动适配为「链接文字： URL」文本
- **导出文件** - Markdown / HTML / PDF 三种格式，文件名自动取文章标题（frontmatter `title` 或首个 H1）
- **推送草稿箱** - 配置公众号 AppID/AppSecret 后直接推送到草稿箱，标题与封面自动读取 frontmatter；凭证仅保存在浏览器本地，多用户互不干扰
- **CLI 命令行** - 终端完成凭证配置、渲染导出、推送草稿箱，便于脚本化与 CI 集成

### 🤖 AI 辅助

- **AI 聊天编辑** - 面板内发送指令修改当前文章，支持图片 / 文本附件与流式输出，先「查看变更」再「应用修改」；面板支持抽屉 / 侧栏两种显示方式
- **多供应商** - 自定义模型供应商，兼容 Chat Completions / Anthropic / Responses 三种 API 格式
- **云端配置（Cloudflare 部署版）** - GitHub 登录后配置 AES-GCM 加密同步云端，浏览器端不暴露 API Key

### ✅ Markdown 渲染

- Task List（`- [x]`）、脚注、frontmatter 元数据卡片、表格、Mermaid 图表、SVG 图形全链路支持
- 代码块语法高亮（Atom One Dark）+ 语言标签，行内代码加粗显示
- 复制 / 导出 / 推送链路针对微信编辑器做了大量兼容处理（标签白名单降级、列表悬挂缩进、图片结构降级等）

## 🚀 快速开始

```bash
git clone https://github.com/wangruofeng/feishu2wx.git
cd feishu2wx
npm install
npm run dev
```

前端运行在 `http://localhost:3100`，后端 `http://localhost:3101`（推送草稿箱需要后端）。

> 💡 只用排版、预览、复制功能时，`npm start` 仅启动前端（端口 3000）即可。
> 详细启动说明与常见安装问题见 [QUICKSTART.md](QUICKSTART.md)。

## 💻 CLI 命令行

```bash
npm run cli -- init                      # 初始化用户级 CLI 配置
npm run cli -- auth set --app-id <id> --app-secret <secret>  # 配置公众号凭证
npm run cli -- render article.md --out article.html          # 渲染并导出 HTML
npm run cli -- publish article.md --title "文章标题"          # 推送到公众号草稿箱
```

支持单次命令覆盖主题与排版项（如 `--theme blue --invert-h1 --text-align-mode justify`）。CLI 只读取用户级 `~/.feishu2wx/config.json`，凭证不应放入项目目录或提交到仓库。完整命令速查见 [cli/README.md](cli/README.md)。

## 📚 文档导航

| 文档 | 内容 |
|------|------|
| [使用指南](docs/usage.md) | 界面功能、排版设置、导出推送、AI 面板的详细说明与 FAQ |
| [快速启动](QUICKSTART.md) | 本地开发环境搭建与安装验证 |
| [CLI 文档](cli/README.md) | 命令行工具全部命令、配置与环境变量 |
| [部署指南](DEPLOY.md) | GitHub Pages + Cloudflare Pages 部署（含后端 Functions） |
| [架构说明](docs/claude/architecture.md) | 数据流、核心模块、主题与状态管理 |
| [开发指南](docs/claude/development.md) | 开发命令、测试、提交流程 |

## 🛠️ 技术栈

React 18 · TypeScript · Create React App · markdown-it（含脚注插件）· Turndown + GFM · Highlight.js · Mermaid · Cloudflare Pages Functions（后端推送代理）

## 🔒 隐私与安全

- 公众号 AppID/AppSecret 仅保存在浏览器 localStorage，推送时随请求发给后端调用微信 API，**服务端不做任何存储**
- AI 配置的 API Key 在 Cloudflare 部署版下经 AES-GCM 加密存储，浏览器端永不回显
- 自托管建议：设置 `ALLOWED_ORIGINS` 限制 CORS 来源、全程 HTTPS、在微信后台配置 IP 白名单，详见 [部署指南](DEPLOY.md)

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 🤝 贡献与反馈

欢迎提交 Issue 和 Pull Request！

---

**享受写作的乐趣！** ✨
**如果这个项目对您有帮助，请给个 ⭐ Star！**

Made with ❤️ by feishu2wx Contributors

<a href="https://github.com/wangruofeng/feishu2wx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=wangruofeng/feishu2wx" alt="Contributors" />
</a>
