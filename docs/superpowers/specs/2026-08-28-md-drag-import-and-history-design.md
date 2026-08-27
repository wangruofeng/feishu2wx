# 设计文档：Markdown 拖拽导入 + 历史文档列表

- 日期：2026-08-28
- 状态：已与用户确认设计，待实现
- 版本目标：v1.25.0（功能实现提交）

## 背景与目标

feishu2wx 当前只能通过「📂 导入」按钮选择 `.md` 文件，且当前文档单份存于 `feishu2wx_markdown`，一旦内容被整体替换（导入新文件、加载示例、清空），旧文章即丢失（仅会话内撤销栈可救，刷新即没）。

本设计新增两个能力：

1. **拖拽导入**：把 `.md` 文件拖到编辑器区域即可导入
2. **历史文档列表**：内容被整体替换前自动存档，可从浮层列表查看、恢复、删除

## 已确认的产品决策

| 决策点 | 结论 |
| --- | --- |
| 拖拽行为 | 替换全部内容（与「📂 导入」按钮一致） |
| 拖拽接收区域 | 仅编辑器区域（`.editor-container`），预览区/顶栏无效 |
| 历史保存时机 | 替换前自动存档：文件导入（按钮/拖拽）、加载示例、清空、从历史恢复之前；不做定时快照、不做手动保存 |
| 历史 UI 形态 | 编辑器底部工具栏「历史」按钮 + portal 浮层（与「大纲」浮层同模式） |
| 历史容量 | 最多 20 份，超出淘汰最旧；单份 UTF-8 > 200KB 跳过存档 |
| 历史存储 | localStorage 单键 JSON 数组（方案 A），不引入 IndexedDB |

## 功能 1：拖拽导入

### 事件与高亮

- 监听挂在外层 `.editor-container`（覆盖 textarea 与语法高亮层）：`dragenter` / `dragover` / `dragleave` / `drop`
- `dragover` 上 `preventDefault()`（否则浏览器默认打开文件）
- **dragleave 计数器**：容器内有 textarea/高亮层子元素，鼠标在子元素间穿梭会触发假 dragleave——`dragenter` 计数 +1、`dragleave` 计数 -1，归零才移除高亮；`drop` 与 `dragend` 时清零
- 拖入期间容器加 `.is-dragover` 类：虚线边框 + 淡色背景，提示「松开导入 Markdown」
- 仅处理 `dataTransfer.files`；拖入的是选中文本/链接（无文件）时忽略、不拦截

### 文件处理

- 校验与现有按钮导入一致：`file.name.endsWith('.md') || file.type === 'text/markdown'`，否则 `alert` 提示
- 抽取公共函数 `importMarkdownFile(file)`（EditorPane 内），按钮导入与拖拽导入共用，内部顺序：
  1. `archiveCurrentDoc(markdown)` — 旧内容存入历史
  2. `pushHistory()` — 旧内容进撤销栈
  3. `FileReader.readAsText` 读入 → `setMarkdown(content)`
- 统一修正既有不一致：现有按钮导入未进撤销栈，改造后 Cmd+Z 可撤销导入（含拖拽）
- `FileReader.onerror` → `alert('读取文件失败，请重试')`（现有文案）

## 功能 2：历史文档

### 数据结构

localStorage 键 `feishu2wx_docHistory`，JSON 数组，**最新在前**：

```ts
interface DocHistoryEntry {
  id: string;        // crypto.randomUUID()，不可用时回退 `${Date.now()}-${Math.random()}`
  title: string;     // 存档时提取：frontmatter title → 首个 H1 → '未命名文章'
  content: string;   // 完整 Markdown
  savedAt: number;   // Date.now()
}
```

### 存取 API（`src/utils/docHistory.ts`，纯函数）

- `loadDocHistory(): DocHistoryEntry[]` — 读取，解析失败/非数组返回 `[]`（脏数据自愈）
- `archiveCurrentDoc(markdown: string): { archived: boolean; reason?: 'empty' | 'duplicate' | 'too-large' | 'quota' }` — 存档入口，规则：
  - 内容为空 → 跳过（`empty`）
  - 与最新一条 `content` 完全相同 → 跳过（`duplicate`，避免连续替换产生重复条目）
  - UTF-8 字节数（`TextEncoder`）> 200KB → 跳过（`too-large`，调用方 console.warn，不阻断主流程）
  - 超过 20 条 → 淘汰最旧（数组尾部）
  - 写入抛 `QuotaExceededError` → 逐条淘汰最旧重试，清空仍失败则放弃（`quota`），**绝不影响导入/清空主操作**
- `removeDocHistory(id: string): DocHistoryEntry[]` — 删除单条，返回剩余列表
- `clearDocHistory(): void` — 清空
- `extractDocTitle(markdown: string): string` — 标题提取，复用 `markdownRenderer.ts` 的 `getFrontMatterField`

### 存档触发点（共 5 处，均调用 `archiveCurrentDoc`）

| 触发点 | 位置 |
| --- | --- |
| 按钮导入文件 | `EditorPane.tsx` `importMarkdownFile()` |
| 拖拽导入文件 | `EditorPane.tsx` `importMarkdownFile()`（同上，天然复用） |
| 清空 | `EditorPane.tsx` `handleClear`（confirm 之后、`setMarkdown('')` 之前） |
| 加载示例 | `App.tsx` `handleLoadExample` |
| 从历史恢复 | `DocHistoryPopover.tsx` 恢复回调（当前内容先存档，保证恢复错了还能换回来） |

### UI（`src/components/DocHistoryPopover.tsx` + `EditorPane.css`）

- 底部工具栏大纲按钮旁新增「🕘 历史」按钮；`loadDocHistory().length === 0` 时禁用置灰（同大纲按钮无标题时禁用的模式）
- 点击弹出 portal 浮层（`createPortal` 到 body），定位逻辑与大纲浮层一致：按钮 `getBoundingClientRect()` 计算 fixed 位置 + 视口边界钳制；点击浮层与按钮之外关闭
- 列表项：`标题 · 相对时间 · 🗑 删除`；相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前，超过 7 天显示 `YYYY-MM-DD`
- 点击条目 → 存档当前内容 → `setMarkdown(entry.content)` → 关闭浮层；**恢复不删除原条目**（同一条可反复恢复，类似浏览器历史）
- 删除单条：直接删（低风险，不 confirm）
- 清空全部：`window.confirm` 二次确认（与「清空」按钮一致）
- 浮层打开时从 localStorage 现读列表，操作后即时刷新，不引入全局状态

## 文件变更清单

新增：

- `src/utils/docHistory.ts` — 历史存取纯函数
- `src/utils/docHistory.test.js` — 单元测试（参照 `helper.test.js` 模式）
- `src/components/DocHistoryPopover.tsx` — 历史浮层组件

修改：

- `src/components/EditorPane.tsx` — 拖拽事件、`importMarkdownFile()` 抽取、历史按钮、清空/导入存档
- `src/components/EditorPane.css` — `.is-dragover` 拖拽高亮、浮层样式（复用 `editor-outline-pop` 骨架）
- `src/App.tsx` — `handleLoadExample` 存档
- `CLAUDE.md` / `docs/claude/architecture.md` — 同步新能力说明
- `package.json` — 版本号 bump 至 1.25.0

## 错误处理汇总

| 场景 | 行为 |
| --- | --- |
| 非 `.md` 文件（按钮/拖拽） | `alert('请选择 Markdown 文件 (.md)')`（现有文案） |
| FileReader 读取失败 | `alert('读取文件失败，请重试')` |
| 单份 > 200KB | 跳过存档 + `console.warn`，导入正常完成 |
| localStorage 配额溢出 | 淘汰最旧逐条重试，仍失败放弃存档，主操作不受影响 |
| `feishu2wx_docHistory` 脏数据 | `loadDocHistory` 返回 `[]` 自愈 |

## 测试计划

单元测试（`docHistory.test.js`）：

- 存档后 `loadDocHistory` 可读回，最新在前
- 空内容 / 与最新一条重复 / 超 200KB 三种跳过路径
- 条数上限 20：第 21 份存入后最旧被淘汰
- `removeDocHistory` 删除单条、`clearDocHistory` 清空
- `extractDocTitle`：frontmatter title → 首个 H1 → 未命名文章
- 脏数据（非法 JSON / 非数组）返回空数组

手动验证清单：

- 拖 `.md` 到编辑器：高亮出现 → 子元素间穿梭高亮不闪烁 → 松手内容替换
- 拖非 `.md` 文件：alert 提示；拖选中文本/链接：无反应
- 导入后 Cmd+Z 可撤销恢复旧内容
- 导入 / 清空 / 加载示例 / 历史恢复 后，历史列表出现旧文档
- 历史恢复 → 再次打开历史 → 刚被替换的内容已存档（往返无损）
- 删除单条、清空全部（confirm）；无历史时按钮禁用
- 移动端：浮层不溢出屏幕

## 明确不做（YAGNI）

- 不做定时自动快照、手动保存按钮
- 不做 IndexedDB / 多键存储
- 不做多文件批量导入（一次取第一个文件）
- 不做历史条目内容预览
