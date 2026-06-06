# 开发说明

## 常用命令

```bash
# 安装依赖
npm install

# 构建
npm run build

# 测试
npm test

# 部署到 GitHub Pages
npm run deploy

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

仅启动 CRA 开发服务器（端口 3100），适合只做排版/预览相关的开发。推送草稿箱等后端 API 不可用。

### 前后端同时启动（Express 后端）

```bash
npm run dev
```

同时启动 CRA 开发服务器（端口 3100）和 Express 后端（端口 3101），CRA 通过 `src/setupProxy.js` 将 `/api` 请求代理到后端。适合开发推送草稿箱等需要后端的功能。

### 前后端同时启动（Cloudflare Pages 本地模拟）

```bash
npm run cf:dev
```

同时启动 CRA 开发服务器和 Wrangler Pages Dev，由 Wrangler 代理 CRA 并处理 `functions/` 下的 Cloudflare Functions。`CF_DEV=1` 环境变量会跳过 CRA 代理配置，避免与 Wrangler 冲突。适合开发或调试 Cloudflare Functions。

## 变更测试建议

修改渲染逻辑时建议：

1. 使用多种 Markdown 输入测试标题、列表、代码块、表格和引用。
2. 测试从飞书文档粘贴 HTML。
3. 验证预览区的主题切换（4 种命名主题 + 系统暗黑模式自适应）。
4. 验证复制公众号后是否保留内联样式（classic 和 modern 代码块都要测）。
5. 验证桌面端和移动端预览宽度。
6. 测试选中部分内容复制 vs 全文复制。
7. 测试 Task List 渲染（`- [x]` 和 `- [ ]`），确认预览和微信输出中复选框正确显示。
8. 测试脚注渲染（`[^1]` + `[^1]: 定义`），确认上标引用、脚注区块和返回链接正确显示。

## 现有测试

- `src/utils/wechatCopy.test.js`：10 个测试用例，覆盖 H1 反显、代码块对齐、图片间距、modern 代码块样式、缩进空白保留等。
- `src/App.test.js`：基础渲染测试。
- `scripts/start-script.test.mjs`：启动脚本测试。

运行测试：

```bash
npm test
```

## 部署

- 构建输出目录：`build/`
- 部署方式：通过 `gh-pages` 发布到 GitHub Pages
- 部署命令：`npm run deploy`

## 文件导入功能

- `EditorPane` 支持导入本地 `.md` 文件。
- 适合导入来自 Cursor、VS Code 等编辑器的 Markdown。

## CLI 功能

仓库内置 `feishu2wx` CLI，用于在命令行完成公众号配置、主题配置、Markdown 渲染和草稿箱推送。

本地运行方式：

```bash
npm run cli -- init
npm run cli -- init --project
npm run cli -- auth set --app-id <appid> --app-secret <secret>
npm run cli -- auth status
npm run cli -- theme list
npm run cli -- theme set blue
npm run cli -- render article.md --out article.html
npm run cli -- publish article.md --title "文章标题" --cover cover.jpg
```

配置默认优先读取当前项目的 `.feishu2wx/config.json`；如果不存在，则回退到用户级 `~/.feishu2wx/config.json`。项目级配置可通过 `init --project` 初始化，敏感配置目录 `.feishu2wx/` 已加入 `.gitignore`。也可以通过全局参数覆盖：

```bash
npm run cli -- --config /tmp/feishu2wx-config.json theme status
npm run cli -- --project theme status
npm run cli -- --user theme status
```

`render` 默认把微信公众号兼容 HTML 输出到 stdout；指定 `--out` 会写入文件，`--copy` 会把 HTML 字符串写入系统剪贴板，`--preview` 会生成临时预览页并打开浏览器。

`theme status` 的输出项已对齐网页端会影响渲染/导出的本地持久化配置：`theme`、`font`、`codeBlockStyle`、`imageBorderStyle`、`imageBorderRadius`、`showH1Underline`、`invertH1`、`alignH1Left`、`invertH2`、`alignH2Left`、`showHorizontalRule`、`tableShadow`。

## 智能粘贴检测

- 飞书/Lark 的 HTML 会按自定义规则转换为 Markdown。
- 编辑器中的纯 Markdown 会直接使用。
- 其他来源会回退为纯文本处理。

## 配置注意事项

- 主题配置分散在三处：`ThemeSwitcher.tsx`（UI 定义，4 种命名主题：经典、橙色、蓝色、绿意）、`wechatCopy.ts`（导出内联样式映射，含额外 `light` / `dark` 两种内部主题）、`styles/themes.css`（预览样式）。新增或修改主题时三处都要同步。
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
