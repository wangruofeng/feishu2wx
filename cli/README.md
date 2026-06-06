# feishu2wx CLI

`feishu2wx` CLI 用于在命令行完成公众号凭证配置、Markdown 主题配置、微信公众号兼容 HTML 渲染、复制/导出/预览，以及推送到微信公众号草稿箱。

## 运行方式

在仓库内运行：

```bash
npm run cli -- --help
```

也可以直接运行入口文件：

```bash
./cli/index.js --help
```

## 配置文件

CLI 支持三种配置来源：

- 项目级配置：当前工作目录下的 `.feishu2wx/config.json`
- 用户级配置：`~/.feishu2wx/config.json`
- 显式配置：通过 `--config <path>` 指定

默认读取规则：

1. 如果当前项目存在 `.feishu2wx/config.json`，优先使用项目级配置。
2. 如果项目级配置不存在，回退到用户级配置。

用户级配置文件：

```text
~/.feishu2wx/config.json
```

项目级配置文件：

```text
.feishu2wx/config.json
```

如需测试命令但不污染默认配置，可以使用 `--config`：

```bash
npm run cli -- --config /tmp/feishu2wx-cli-test.json theme status
```

初始化用户级配置文件：

```bash
npm run cli -- init
```

初始化当前项目级配置文件：

```bash
npm run cli -- init --project
```

后续在同一个项目目录中执行 CLI 时，会自动优先使用这个项目级配置。

强制使用项目级配置：

```bash
npm run cli -- --project theme status
```

强制使用用户级配置：

```bash
npm run cli -- --user theme status
```

初始化时指定主题：

```bash
npm run cli -- init --theme blue
```

默认不会覆盖已有配置。如需重新生成配置文件：

```bash
npm run cli -- init --force
```

也可以在初始化时直接写入公众号凭证：

```bash
npm run cli -- init --app-id <appid> --app-secret <secret>
```

配置优先级：

1. 命令行参数
2. 环境变量
3. 项目级配置文件
4. 用户级配置文件
5. 内置默认值

支持的环境变量：

```text
FEISHU2WX_WECHAT_APP_ID
FEISHU2WX_WECHAT_APP_SECRET
FEISHU2WX_THEME
```

`feishu2wx theme status` 当前会输出与网页端本地持久化配置对齐的排版项，包括：

- `theme`
- `font`
- `codeBlockStyle`
- `imageBorderStyle`
- `imageBorderRadius`
- `showH1Underline`
- `invertH1`
- `alignH1Left`
- `invertH2`
- `alignH2Left`
- `showHorizontalRule`
- `tableShadow`

## 公众号凭证

保存 AppID 和 AppSecret：

```bash
npm run cli -- auth set --app-id <appid> --app-secret <secret>
```

查看配置状态，AppID 会脱敏展示：

```bash
npm run cli -- auth status
```

校验凭证是否能获取微信 `access_token`：

```bash
npm run cli -- auth test
```

删除凭证：

```bash
npm run cli -- auth clear
```

## 主题配置

查看可用主题：

```bash
npm run cli -- theme list
```

当前支持：

- `classic`
- `orange`
- `blue`
- `teal`

设置默认主题：

```bash
npm run cli -- theme set blue
```

也可以同时设置网页端同款排版项：

```bash
npm run cli -- theme set blue --show-h1-underline --align-h1-left --no-table-shadow
```

查看当前主题配置：

```bash
npm run cli -- theme status
```

## 渲染 Markdown

导出微信公众号兼容 HTML：

```bash
npm run cli -- render article.md --out article.html
```

输出到 stdout：

```bash
npm run cli -- render article.md
```

从 stdin 读取：

```bash
cat article.md | npm run cli -- render --out article.html
```

单次命令覆盖主题：

```bash
npm run cli -- render article.md --theme teal --out article.html
```

复制 HTML 到系统剪贴板：

```bash
npm run cli -- render article.md --copy
```

生成临时预览页并打开浏览器：

```bash
npm run cli -- render article.md --preview
```

## 推送到公众号草稿箱

推送前需要先配置真实公众号凭证，并确保当前机器或服务器 IP 已加入微信公众平台 API IP 白名单。

```bash
npm run cli -- auth set --app-id <appid> --app-secret <secret>
npm run cli -- auth test
```

推送 Markdown 到草稿箱：

```bash
npm run cli -- publish article.md \
  --title "文章标题" \
  --author "作者名" \
  --cover cover.jpg \
  --theme blue
```

`publish` 会先按主题渲染 Markdown，再调用现有草稿箱发布逻辑。正文图片会沿用服务端微信图片上传与 WebP 归一化处理。

## 常用测试命令

CLI 单元测试：

```bash
node --test cli/lib/config.test.mjs cli/lib/render-pipeline.test.mjs
```

渲染导出 smoke test：

```bash
npm run cli -- render docs/research/cli-prd.md --theme teal --out /tmp/feishu2wx-test.html
```

未配置凭证的发布错误分支：

```bash
npm run cli -- --config /tmp/feishu2wx-empty.json publish docs/research/cli-prd.md --title 测试标题
```

项目回归：

```bash
CI=true npm test -- --watchAll=false
npm run build
npm run pre-commit-check
```

## 注意事项

- `auth test` 和 `publish` 会请求微信真实接口。
- `render --preview` 会打开本地浏览器。
- `render --copy` 写入的是微信公众号兼容 HTML 字符串；如果系统剪贴板命令不可用，可改用 `--out`。
- CLI 不读取浏览器 localStorage，Web UI 和 CLI 的持久化配置相互独立。
