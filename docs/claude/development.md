# 开发说明

## 常用命令

```bash
# 开发（在项目根目录运行）
npm run install:frontend
npm start
npm run pre-commit-check

# 开发（在 frontend/ 目录运行）
cd frontend
npm start
npm run build
npm test
npm run deploy
```

## 变更测试建议

修改渲染逻辑时建议：

1. 使用多种 Markdown 输入测试标题、列表、代码块、表格和引用。
2. 测试从飞书文档粘贴 HTML。
3. 验证预览区的主题切换。
4. 验证复制到微信公众号后是否保留内联样式。
5. 验证桌面端和移动端预览宽度。

## 部署

- 构建输出目录：`frontend/build/`
- 部署方式：通过 `gh-pages` 发布到 GitHub Pages
- 部署命令：`cd frontend && npm run deploy`

## 文件导入功能

- `EditorPane` 支持导入本地 `.md` 文件。
- 适合导入来自 Cursor、VS Code 等编辑器的 Markdown。

## 智能粘贴检测

- 飞书/Lark 的 HTML 会按自定义规则转换为 Markdown。
- 编辑器中的纯 Markdown 会直接使用。
- 其他来源会回退为纯文本处理。

## 提交前检查

Husky 会在每次提交前执行检查。

检查内容：

1. `frontend/package.json` 中的版本号必须更新。
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
- 版本定义在 `frontend/package.json`。
- 常见流程：
  1. 修改代码。
  2. 更新版本号。
  3. 如有需要，同步更新文档。
  4. 运行 `npm run pre-commit-check`。
  5. 提交代码。
