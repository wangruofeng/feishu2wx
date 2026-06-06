# feishu2wx CLI 需求 PRD

## 背景

`feishu2wx` 当前主要通过 Web UI 完成飞书/Markdown 到微信公众号兼容 HTML 的转换、预览、复制和草稿箱推送。CLI 的目标是把这些能力提供给命令行工作流，让用户可以在本地编辑器、自动化脚本、CI 或批量发布流程中使用同一套排版与推送能力。

## 目标

1. 通过 CLI 配置、查看和校验微信公众号 `AppID` / `AppSecret`。
2. 通过 CLI 配置、查看 Markdown 主题与排版参数。
3. 通过 CLI 将 Markdown 转换为微信公众号兼容 HTML，并支持复制、导出和本地预览。
4. 通过 CLI 将 Markdown 按指定主题排版后推送到微信公众号草稿箱。

## 非目标

1. 不在首版实现微信公众号 OAuth 授权流程；这里的“授权”指保存并校验用户提供的 `AppID` / `AppSecret`。
2. 不在首版实现多公众号账号管理；先支持一个默认账号。
3. 不在首版改造 Web UI 的交互和 localStorage 存储行为。
4. 不在首版支持从飞书云文档 URL 拉取内容；CLI 输入以本地 Markdown 文件或 stdin 为主。
5. 不在首版实现云端配置同步。

## 用户画像

- 内容作者：在本地 Markdown 编辑器写文章，希望一条命令复制或导出微信公众号 HTML。
- 技术作者：希望在脚本中批量生成不同主题的微信公众号排版结果。
- 运营发布者：希望把本地 Markdown 文章直接推送到公众号草稿箱。
- 项目维护者：希望 CLI 和 Web UI 共用核心渲染/推送逻辑，减少两套输出不一致。

## 核心用户故事

### 公众号配置

- 作为用户，我可以运行 `feishu2wx auth set` 保存 `AppID` 和 `AppSecret`，避免每次推送都手动输入。
- 作为用户，我可以运行 `feishu2wx auth status` 查看是否已配置公众号，并看到脱敏后的 `AppID`。
- 作为用户，我可以运行 `feishu2wx auth test` 校验当前配置是否能成功获取微信 `access_token`。
- 作为用户，我可以运行 `feishu2wx auth clear` 删除本地保存的公众号配置。

### 主题配置

- 作为用户，我可以运行 `feishu2wx theme list` 查看可用主题。
- 作为用户，我可以运行 `feishu2wx theme set classic` 设置默认主题。
- 作为用户，我可以运行 `feishu2wx theme status` 查看当前默认主题、字体、代码块样式、图片边框等排版参数。
- 作为用户，我可以在单次命令中用 `--theme blue` 覆盖默认主题，不影响全局配置。

### HTML 生成、复制、导出和预览

- 作为用户，我可以运行 `feishu2wx render article.md --copy` 把微信公众号兼容 HTML 写入剪贴板。
- 作为用户，我可以运行 `feishu2wx render article.md --out article.html` 导出 HTML 文件。
- 作为用户，我可以运行 `feishu2wx render article.md --preview` 在本地浏览器预览文章。
- 作为用户，我可以通过 stdin 输入 Markdown，例如 `cat article.md | feishu2wx render --copy`。

### 推送草稿箱

- 作为用户，我可以运行 `feishu2wx publish article.md --title "文章标题"` 将文章推送到公众号草稿箱。
- 作为用户，我可以传入 `--author`、`--cover`、`--theme` 等参数覆盖默认配置。
- 作为用户，如果文章没有封面图或首图，我希望 CLI 返回明确错误，而不是静默失败。
- 作为用户，如果微信接口因为 IP 白名单、凭证错误或图片上传失败报错，我希望 CLI 原样给出可操作提示。

## 首版命令范围

```bash
feishu2wx auth set --app-id <appid> --app-secret <secret>
feishu2wx auth status
feishu2wx auth test
feishu2wx auth clear

feishu2wx theme list
feishu2wx theme set <classic|orange|blue|teal>
feishu2wx theme status

feishu2wx render [file] --copy
feishu2wx render [file] --out <html-file>
feishu2wx render [file] --preview

feishu2wx publish [file] --title <title> [--author <author>] [--cover <image-file>]
```

## 主题与排版参数

首版支持现有 Web UI 中已稳定出现的排版参数：

- `theme`: `classic` / `orange` / `blue` / `teal`
- `font`: 默认字体或已有字体 key
- `codeBlockStyle`: `classic` / `modern`
- `imageBorderStyle`: `border` / `shadow` / `default`
- `imageBorderRadius`: `true` / `false`
- `showH1Underline`: `true` / `false`
- `invertH1`: `true` / `false`
- `invertH2`: `true` / `false`
- `alignH2Left`: `true` / `false`
- `showHorizontalRule`: `true` / `false`

## 输入输出规则

### Markdown 输入

优先级：

1. 命令参数中的文件路径。
2. stdin。

如果两者都不存在，CLI 返回错误并提示使用方式。

### HTML 输出

`render` 命令支持三类输出：

1. `--copy`: 写入系统剪贴板。
2. `--out`: 写入指定 HTML 文件。
3. `--preview`: 生成临时预览文件并打开浏览器。

如果未指定输出方式，默认将 HTML 写到 stdout，方便管道组合。

### 草稿箱推送输出

推送成功时输出：

- `mediaId`
- 成功提示

推送失败时输出：

- 错误类型
- 微信接口原始错误信息
- 对常见错误的操作提示，例如 IP 白名单。

## 配置存储

首版建议使用用户目录下的本地配置文件：

```text
~/.feishu2wx/config.json
```

配置文件权限应尽量设置为仅当前用户可读写。`AppSecret` 在 `status` 输出中必须脱敏。

环境变量可作为临时覆盖：

```text
FEISHU2WX_WECHAT_APP_ID
FEISHU2WX_WECHAT_APP_SECRET
FEISHU2WX_THEME
```

优先级：

1. 命令行参数
2. 环境变量
3. 本地配置文件
4. 内置默认值

## 验收标准

1. 未配置公众号时，`publish` 给出明确错误。
2. 配置正确公众号凭证后，`auth test` 能校验 access_token 获取流程。
3. `render article.md --out article.html` 生成的 HTML 与 Web UI 的“复制到公众号”核心样式一致。
4. `render article.md --copy` 能将 HTML 放入剪贴板。
5. `render article.md --preview` 能打开本地预览。
6. `publish article.md --title ... --cover ...` 能创建微信公众号草稿。
7. 主题参数覆盖符合优先级规则。
8. 文档中列出的高风险内容至少覆盖标题、列表、表格、图片、代码块、脚注和 task list。

## 风险与约束

1. 现有 `renderMarkdown()` 和 `formatForWeChat()` 依赖浏览器 DOM；CLI 需要 `jsdom` 或抽取 DOM 适配层。
2. 复制到剪贴板在不同操作系统上行为不同，需要封装兼容层。
3. `publish` 涉及微信真实接口，自动化测试不应依赖真实账号。
4. 图片上传和 WebP 归一化依赖现有 Node 服务端逻辑，应优先复用 `server/lib/wechat-worker.ts`。
5. CLI 配置文件保存 `AppSecret`，需要明确本地安全边界，并避免日志泄露。
