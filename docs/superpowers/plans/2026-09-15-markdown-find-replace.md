# Markdown 原文查找替换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Markdown 原文编辑器增加普通文本、大小写敏感和正则表达式查找替换，并在现有 textarea 分层编辑器中高亮匹配项。

**Architecture:** 新建纯函数模块负责表达式编译、匹配范围和替换，`EditorPane` 只管理界面状态、导航、撤销与焦点。匹配背景由独立 overlay 绘制，与现有语法高亮层共享字体度量和滚动位移。

**Tech Stack:** React 18、TypeScript、CRA/Jest、CSS design tokens

**Spec:** `docs/superpowers/specs/2026-09-15-markdown-find-replace-design.md`

## Global Constraints

- 全部替换默认作用于整篇 Markdown 原文。
- 支持普通文本、区分大小写、正则表达式和正则捕获组替换。
- 保留现有 textarea、Markdown 语法高亮、粘贴、拖拽和撤销链路。
- 查找状态不写入 localStorage。
- 实现需更新 `docs/usage.md`、快捷键抽屉和 `package.json` 补丁版本。

---

### Task 1: 纯查找替换引擎

**Files:**
- Create: `src/utils/findReplace.ts`
- Test: `src/utils/findReplace.test.js`

**Interfaces:**
- Produces: `findMatches(source, query, options): FindResult`
- Produces: `replaceMatch(source, match, replacement, regexMode): string`
- Produces: `replaceAllMatches(source, query, replacement, options): FindResult & { value: string }`

- [ ] **Step 1: 编写失败测试**

覆盖字面匹配、大小写、正则跨行、捕获组、字面 `$`、非法正则和零长度正则：

```js
expect(findMatches('Foo foo', 'foo', { caseSensitive: false, regex: false }).matches).toHaveLength(2);
expect(findMatches('Foo foo', 'foo', { caseSensitive: true, regex: false }).matches).toHaveLength(1);
expect(replaceAllMatches('a1 a2', 'a(\\d)', 'b$1', { caseSensitive: true, regex: true }).value).toBe('b1 b2');
expect(replaceAllMatches('$x $x', '$x', '$1', { caseSensitive: true, regex: false }).value).toBe('$1 $1');
expect(findMatches('abc', '[', { caseSensitive: true, regex: true }).error).toBeTruthy();
```

- [ ] **Step 2: 运行测试确认失败**

Run: `CI=true npm test -- --runInBand src/utils/findReplace.test.js`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现最小纯函数模块**

定义：

```ts
export interface FindOptions { caseSensitive: boolean; regex: boolean }
export interface FindMatch { start: number; end: number; text: string; captures: Array<string | undefined> }
export interface FindResult { matches: FindMatch[]; error: string | null }
```

用统一的全局 `RegExp` 扫描结果；普通模式先转义查询和替换文本；零长度匹配通过 `codePointAt()` 判定前进 1 或 2 个 UTF-16 代码单元。

- [ ] **Step 4: 运行测试确认通过**

Run: `CI=true npm test -- --runInBand src/utils/findReplace.test.js`
Expected: PASS。

### Task 2: 编辑器查找栏、导航与匹配高亮

**Files:**
- Create: `src/components/FindReplaceBar.tsx`
- Modify: `src/components/EditorPane.tsx`
- Modify: `src/components/EditorPane.css`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: Task 1 的 `findMatches`、`replaceMatch`、`replaceAllMatches`
- Produces: `FindReplaceBar` 受控组件，接收查询、替换、开关、计数、错误和动作回调。

- [ ] **Step 1: 编写失败组件测试**

```js
editor.setSelectionRange(0, 3);
editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true }));
expect(container.querySelector('[aria-label="查找内容"]').value).toBe(editor.value.slice(0, 3));
```

继续断言 Enter/Shift+Enter 循环、非法正则禁用按钮、单次/全部替换结果、Cmd+Z 恢复、高亮节点数量和 scroll transform 同步。

- [ ] **Step 2: 运行组件测试确认失败**

Run: `CI=true npm test -- --runInBand src/App.test.js`
Expected: FAIL，查找栏不存在。

- [ ] **Step 3: 实现受控双行查找栏**

`FindReplaceBar` 使用项目 `Button`，输入框带 `aria-label`；模式开关使用原生 checkbox；错误用 `role="status"` 显示；无匹配或错误时禁用导航和替换。

- [ ] **Step 4: 接入 EditorPane 状态和快捷键**

在 `EditorPane` 中维护：

```ts
const [findOpen, setFindOpen] = useState(false);
const [findQuery, setFindQuery] = useState('');
const [replaceValue, setReplaceValue] = useState('');
const [caseSensitive, setCaseSensitive] = useState(false);
const [regexMode, setRegexMode] = useState(false);
const [activeMatchIndex, setActiveMatchIndex] = useState(0);
```

`Cmd/Ctrl+F` 预填选区并聚焦；Enter/Shift+Enter 导航；Esc 关闭。导航通过 `setSelectionRange` 和现有 mirror 测量滚动。替换动作调用一次 `pushHistory()`，全部替换只产生一个 Markdown 更新。

- [ ] **Step 5: 实现独立查找高亮层**

按匹配范围将 Markdown 转义并输出 `.md-find-match` / `.is-current` span。新增层放在语法高亮层和 textarea 之间，字体、padding、换行与滚动 transform 保持一致，且 `pointer-events:none`。

- [ ] **Step 6: 运行组件与纯函数测试**

Run: `CI=true npm test -- --runInBand src/App.test.js src/utils/findReplace.test.js`
Expected: PASS。

### Task 3: 文档、快捷键、版本与完整验证

**Files:**
- Modify: `src/components/ShortcutsDrawer.tsx`
- Modify: `docs/usage.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 的用户可见行为。
- Produces: 使用说明和 `1.27.46` 版本。

- [ ] **Step 1: 更新用户文档和快捷键抽屉**

在编辑功能中说明普通/大小写/正则、当前/全部替换；将快捷键抽屉的“搜索”改为“查找与替换”，保留 `Cmd/Ctrl+F`。

- [ ] **Step 2: 更新补丁版本**

把 `package.json` 版本从 `1.27.45` 更新为 `1.27.46`。

- [ ] **Step 3: 执行完整验证**

Run: `CI=true npm test -- --runInBand`
Expected: 全部测试通过。

Run: `npm run build`
Expected: 构建成功，无 TypeScript 或 ESLint 错误。

Run: `npm run pre-commit-check`
Expected: 版本和文档检查通过。

- [ ] **Step 4: 审查最终 diff 并提交**

```bash
git diff --check
git status --short
git add src/utils/findReplace.ts src/utils/findReplace.test.js src/components/FindReplaceBar.tsx src/components/EditorPane.tsx src/components/EditorPane.css src/components/ShortcutsDrawer.tsx src/App.test.js docs/usage.md docs/superpowers/plans/2026-09-15-markdown-find-replace.md package.json
git commit -m "feat: 添加 Markdown 原文查找替换"
```
