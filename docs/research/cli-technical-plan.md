# feishu2wx CLI 技术方案

## 设计原则

1. 复用现有渲染和推送逻辑，不重新实现一套微信公众号排版规则。
2. CLI 与 Web UI 的主题、字体、代码块、图片样式配置使用同一份类型定义或同一份配置映射。
3. 首版保持单账号、单配置文件，避免过早引入 profile、多租户或云同步。
4. 推送草稿箱走现有 Node 侧微信 API 封装，保留 WebP 归一化、图片并发上传和微信错误提示。

## 当前可复用能力

- Markdown 渲染入口：`src/utils/markdownRenderer.ts`
  - `renderMarkdown(markdown)`
  - `setCodeBlockStyle(style)`
  - `setShowHorizontalRule(show)`
- 微信兼容 HTML 格式化入口：`src/utils/wechatCopy.ts`
  - `formatForWeChat(html, theme, font, showH1Underline, imageBorderStyle, imageBorderRadius, codeBlockStyle, invertH1, invertH2, alignH2Left)`
- 推送草稿箱入口：`server/lib/publish-handler.ts`
  - `handlePublishDraft(body)`
- 微信 API 封装：`server/lib/wechat-worker.ts`
  - `getAccessTokenFromCredentials(appId, appSecret)`
  - `processContentImages(html, token)`
  - `uploadCoverImage(...)`
  - `createDraft(...)`

## 推荐目录结构

```text
cli/
  index.ts
  commands/
    auth.ts
    theme.ts
    render.ts
    publish.ts
  lib/
    config.ts
    markdown-input.ts
    render-pipeline.ts
    clipboard.ts
    preview.ts
    output.ts
  types.ts

tsconfig.cli.json
```

## 依赖建议

首版建议新增：

- `commander`: 命令解析，降低手写参数解析风险。
- `jsdom`: 在 Node 环境提供 `window` / `document`，承接现有 DOM 依赖的渲染链路。
- `clipboardy`: 跨平台写入剪贴板。
- `open`: 打开本地预览 HTML。

如果希望减少依赖，也可以用 Node 内置 `child_process` 调用 `pbcopy` / `clip` / `xclip`，但跨平台分支会更多，首版不建议。

## CLI 入口

`package.json` 增加：

```json
{
  "bin": {
    "feishu2wx": "dist/cli/index.js"
  },
  "scripts": {
    "cli:build": "tsc -p tsconfig.cli.json",
    "cli": "ts-node --project tsconfig.cli.json cli/index.ts"
  }
}
```

首版可以先以仓库内命令运行：

```bash
npm run cli -- render article.md --out article.html
```

等 CLI 稳定后再支持 `npm link` 或发布 npm 包。

## 配置模型

```ts
export interface CliConfig {
  wechat?: {
    appId: string;
    appSecret: string;
  };
  theme: ArticleThemeConfig;
}

export interface ArticleThemeConfig {
  theme: 'classic' | 'orange' | 'blue' | 'teal';
  font: string;
  codeBlockStyle: 'classic' | 'modern';
  imageBorderStyle: 'border' | 'shadow' | 'default';
  imageBorderRadius: boolean;
  showH1Underline: boolean;
  invertH1: boolean;
  invertH2: boolean;
  alignH2Left: boolean;
  showHorizontalRule: boolean;
}
```

默认值建议与 `App.tsx` 当前初始化保持一致：

```ts
const DEFAULT_THEME_CONFIG: ArticleThemeConfig = {
  theme: 'classic',
  font: 'default',
  codeBlockStyle: 'modern',
  imageBorderStyle: 'border',
  imageBorderRadius: false,
  showH1Underline: false,
  invertH1: false,
  invertH2: false,
  alignH2Left: false,
  showHorizontalRule: true,
};
```

## 渲染管线

CLI 渲染管线：

```text
Markdown file/stdin
  -> readMarkdownInput()
  -> setupDomRuntime()
  -> setCodeBlockStyle()
  -> setShowHorizontalRule()
  -> renderMarkdown()
  -> formatForWeChat()
  -> stdout / clipboard / html file / preview / publish
```

建议实现：

```ts
export function renderWechatHtml(markdown: string, config: ArticleThemeConfig): string {
  setupDomRuntime();
  setCodeBlockStyle(config.codeBlockStyle);
  setShowHorizontalRule(config.showHorizontalRule);

  const previewHtml = renderMarkdown(markdown);
  return formatForWeChat(
    previewHtml,
    config.theme,
    config.font,
    config.showH1Underline,
    config.imageBorderStyle,
    config.imageBorderRadius,
    config.codeBlockStyle,
    config.invertH1,
    config.invertH2,
    config.alignH2Left
  );
}
```

`setupDomRuntime()` 只应在 CLI 进程内设置最小必要全局对象：

- `global.window`
- `global.document`
- `global.navigator`
- `global.Node`
- `global.NodeFilter`
- `global.HTMLElement`
- `global.HTMLImageElement`
- `global.HTMLBRElement`

## 复制与导出

`render` 命令逻辑：

```text
render command
  -> resolve config
  -> renderWechatHtml()
  -> if --copy: clipboard.write(html)
  -> if --out: write file
  -> if --preview: write temp preview file and open browser
  -> if no output flag: print html to stdout
```

预览 HTML 应包裹一个最小页面，便于浏览器查看：

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>feishu2wx preview</title>
  </head>
  <body>
    <main style="max-width: 677px; margin: 32px auto;">
      <!-- formatted wechat html -->
    </main>
  </body>
</html>
```

## 推送草稿箱

`publish` 命令逻辑：

```text
publish command
  -> resolve credentials
  -> resolve theme config
  -> renderWechatHtml()
  -> read cover file if --cover exists
  -> call handlePublishDraft({
       title,
       author,
       content: formattedHtml,
       coverDataUrl,
       appId,
       appSecret
     })
  -> print mediaId or error
```

为了避免 CLI 依赖 `Response` 对象解析细节，可以在后续重构出更小的共享函数：

```ts
export async function publishDraftWithCredentials(params: {
  title: string;
  content: string;
  author?: string;
  coverDataUrl?: string;
  appId: string;
  appSecret: string;
}): Promise<{ mediaId: string; message: string }>;
```

然后让 `handlePublishDraft()` 和 CLI 同时调用它。这样可以保留 Cloudflare Function / Express handler 的 HTTP 包装，同时让 CLI 拿到普通对象返回值。

## Auth 命令设计

```bash
feishu2wx auth set --app-id wx123 --app-secret xxx
feishu2wx auth status
feishu2wx auth test
feishu2wx auth clear
```

实现要点：

- `auth set` 写入 `~/.feishu2wx/config.json`。
- `auth status` 只展示脱敏信息，例如 `wx12****abcd`，不展示 `AppSecret`。
- `auth test` 调用 `getAccessTokenFromCredentials()`，成功后只输出校验通过，不输出 token。
- `auth clear` 只删除 `wechat` 配置，不删除主题配置。

## Theme 命令设计

```bash
feishu2wx theme list
feishu2wx theme set blue
feishu2wx theme status
```

后续可以增加细粒度参数：

```bash
feishu2wx theme set blue --font default --code-block modern --image-border border
```

为了避免主题定义继续分散，建议新增共享模块：

```text
src/utils/articleThemeConfig.ts
```

其中导出：

- `THEME_OPTIONS`
- `DEFAULT_THEME_CONFIG`
- `normalizeThemeConfig()`
- `isThemeKey()`

Web UI、`wechatCopy.ts` 和 CLI 都应逐步复用这份定义。

## 兼容性策略

### Web UI localStorage

CLI 不直接读取浏览器 localStorage。原因是浏览器 localStorage 与命令行用户目录不是同一个存储域，强行同步会引入不稳定路径和浏览器差异。

首版保持两套持久化：

- Web UI: `feishu2wx_*` localStorage。
- CLI: `~/.feishu2wx/config.json`。

两者通过共享默认值和共享主题定义保持输出一致。

### 旧主题 `green`

现有 `wechatCopy.ts` 对旧版 `green` 做了兼容并映射到 `teal`。CLI 可以接受 `green` 作为别名，但 `theme status` 和配置文件中统一保存为 `teal`。

## 测试计划

### 单元测试

- `config.ts`
  - 配置文件不存在时返回默认值。
  - 环境变量覆盖配置文件。
  - `AppSecret` 脱敏展示。
- `render-pipeline.ts`
  - 能渲染标题、段落、列表、表格、图片、代码块、脚注、task list。
  - `classic` 和 `modern` 代码块输出保持空白。
  - `blue` / `orange` / `teal` 主题颜色出现在内联样式中。
- `publish.ts`
  - 未配置凭证时报错。
  - mock 微信发布函数后能传入格式化后的 HTML。

### 集成测试

- `feishu2wx render fixtures/article.md --out /tmp/article.html`
- `feishu2wx render fixtures/article.md --copy`
- `feishu2wx theme set blue && feishu2wx theme status`
- `feishu2wx auth set ... && feishu2wx auth status`

真实 `publish` 测试需要人工账号与微信 IP 白名单，不纳入默认自动化。

### 回归重点

- 代码块缩进和换行。
- 图片上下间距。
- 表格样式。
- 脚注样式。
- Task List。
- WebP 图片推送时的 Node `sharp` 归一化路径。

## 实施阶段

### 阶段 1：最小 CLI

1. 新增 CLI 入口和配置读写。
2. 实现 `auth set/status/clear`。
3. 实现 `theme list/set/status`。
4. 实现 `render --out` 和 stdout。
5. 增加渲染管线测试。

### 阶段 2：复制和预览

1. 增加 `--copy`。
2. 增加 `--preview`。
3. 增加跨平台剪贴板测试或手动验证说明。

### 阶段 3：推送草稿箱

1. 抽出 `publishDraftWithCredentials()` 共享函数。
2. 实现 `publish` 命令。
3. mock 微信 API 做自动化测试。
4. 用真实公众号做一次人工验收。

### 阶段 4：配置统一

1. 新增共享主题配置模块。
2. Web UI 逐步改用共享模块。
3. 清理 `ThemeSwitcher.tsx`、`wechatCopy.ts`、`styles/themes.css` 中重复的主题定义。

## 主要风险与处理

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| 现有格式化依赖 DOM | CLI 直接调用会失败 | 首版用 `jsdom`，后续再抽纯函数 |
| 主题定义分散 | CLI 与 Web UI 输出不一致 | 新增共享主题配置模块 |
| 真实微信接口难自动化测试 | CI 不稳定 | 默认 mock，真实发布走人工验收 |
| 本地保存 AppSecret | 凭证泄露风险 | 文件权限 0600、输出脱敏、不写日志 |
| 剪贴板跨平台差异 | `--copy` 失败 | 使用 `clipboardy`，失败时提示改用 `--out` |

## 推荐首个开发切片

首个切片建议只做：

```bash
feishu2wx theme list
feishu2wx render article.md --out article.html
```

验收：

1. 生成的 HTML 与 Web UI 对同一 Markdown 的核心内联样式一致。
2. 标题、列表、图片、代码块、表格、脚注、task list 均有 fixture 覆盖。
3. 不触碰真实微信接口。

这个切片能先验证最困难的 CLI 渲染运行时问题，再推进认证、复制、预览和发布。
