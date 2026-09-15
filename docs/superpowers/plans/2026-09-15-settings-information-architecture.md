# 配置页分类导航 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将配置面板重组为五个按任务分类的响应式标签页，使桌面端使用侧边导航、手机端使用顶部横向标签，同时保持现有配置行为与数据格式不变。

**Architecture:** `SettingsPanel` 继续拥有所有临时 UI 状态和业务回调，新增一个稳定的分类元数据数组与单一 `activeCategory` 状态。桌面和手机共用同一组可访问 tab 按钮与一个当前 tabpanel，现有配置 JSX 仅重新分组，不抽取或重写业务逻辑。响应式形态完全由 `SettingsPanel.css` 在既有 `768px` 断点切换。

**Tech Stack:** React 18、TypeScript、CSS Design Tokens、Jest/react-dom、Create React App

**Spec:** `docs/superpowers/specs/2026-09-15-settings-information-architecture-design.md`

## Global Constraints

- 不增加、删除或改变任何配置项。
- 不改变 localStorage 键、主题 JSON 或完整配置 JSON 的结构。
- 不改动预览、复制、导出、CLI 或公众号推送的渲染行为。
- 桌面端使用左侧分类导航，手机端在既有 `768px` 断点改为顶部横向标签。
- 当前分类只存在于 `SettingsPanel` 的组件状态中；面板每次重新挂载默认进入 `appearance`。
- 导航必须具备 `tablist`、`tab`、`tabpanel`、`aria-selected`、`aria-controls` 和方向键行为。
- 样式使用 `src/styles/tokens.css` 中已有 token，不新增依赖。
- 源码提交同步更新 `docs/usage.md`、`CLAUDE.md` 和 `package.json` 版本号。

---

### Task 1: 用测试锁定分类与切换行为

**Files:**
- Modify: `src/App.test.js`

**Interfaces:**
- Consumes: `App` 现有设置按钮 `.settings-trigger`。
- Produces: 配置导航的行为契约：五个 tab、默认 `appearance`、点击与方向键切换、非当前分类内容不可见。

- [ ] **Step 1: 写默认分类与点击切换的失败测试**

在 `src/App.test.js` 添加测试，打开设置面板后断言：

```js
test('organizes settings into five task-based categories and switches visible content', () => {
  act(() => root.render(<App />));
  act(() => container.querySelector('.settings-trigger').click());

  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
  expect(tabs.map((tab) => tab.textContent.trim())).toEqual([
    '主题与外观', '文章排版', '内容样式', '编辑体验', '发布与数据',
  ]);
  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('主题与外观');
  expect(container.textContent).toContain('主题管理');
  expect(container.textContent).not.toContain('H1 底线');

  act(() => tabs[1].click());
  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(container.textContent).toContain('H1 底线');
  expect(container.textContent).not.toContain('主题管理');
});
```

- [ ] **Step 2: 写方向键切换的失败测试**

```js
test('supports arrow-key navigation between settings categories', () => {
  act(() => root.render(<App />));
  act(() => container.querySelector('.settings-trigger').click());

  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
  act(() => tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));

  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(tabs[1]);
  expect(container.querySelector('[role="tabpanel"] h2').textContent).toBe('文章排版');
});
```

- [ ] **Step 3: 运行聚焦测试并确认 RED**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: FAIL；当前页面不存在五个 `[role="tab"]`，并且所有旧分组同时可见。

- [ ] **Step 4: 提交测试契约与后续实现放在同一原子提交中**

此项目提交钩子要求每次提交都提升版本号，因此 RED 测试不单独提交；保留测试变更，随 Task 2 的 GREEN 实现一起提交。

### Task 2: 实现五分类可访问导航

**Files:**
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/App.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 的 DOM/键盘行为契约。
- Produces: `SettingsCategory = 'appearance' | 'typography' | 'content' | 'editor' | 'publishing'`，以及单一可见的 `tabpanel`。

- [ ] **Step 1: 定义分类类型与元数据**

在 `SettingsPanel.tsx` 顶层加入：

```ts
type SettingsCategory = 'appearance' | 'typography' | 'content' | 'editor' | 'publishing';

const settingsCategories: Array<{ id: SettingsCategory; label: string; icon: string }> = [
  { id: 'appearance', label: '主题与外观', icon: '◐' },
  { id: 'typography', label: '文章排版', icon: '¶' },
  { id: 'content', label: '内容样式', icon: '▦' },
  { id: 'editor', label: '编辑体验', icon: '⌨' },
  { id: 'publishing', label: '发布与数据', icon: '↑' },
];
```

- [ ] **Step 2: 添加本地分类状态和方向键处理**

在组件内加入 `useRef<Array<HTMLButtonElement | null>>` 和：

```ts
const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

const selectCategory = (category: SettingsCategory, focus = false) => {
  setActiveCategory(category);
  if (focus) {
    requestAnimationFrame(() => categoryTabRefs.current[settingsCategories.findIndex((item) => item.id === category)]?.focus());
  }
};
```

`onKeyDown` 支持 `ArrowRight`、`ArrowDown`、`ArrowLeft`、`ArrowUp`、`Home`、`End`，索引首尾循环；事件处理后调用 `preventDefault()` 和 `selectCategory(nextId, true)`。

- [ ] **Step 3: 重组 JSX，但不改动配置回调**

将面板结构改为：

```tsx
<div className="settings-panel" ref={panelRef}>
  <nav className="settings-category-nav" role="tablist" aria-label="配置分类">
    {settingsCategories.map((category, index) => (
      <Button
        variant="settingsCategory"
        key={category.id}
        ref={(node) => { categoryTabRefs.current[index] = node; }}
        id={`settings-tab-${category.id}`}
        type="button"
        role="tab"
        aria-selected={activeCategory === category.id}
        aria-controls={`settings-panel-${category.id}`}
        tabIndex={activeCategory === category.id ? 0 : -1}
        className="settings-category-tab"
        onClick={() => selectCategory(category.id)}
        onKeyDown={(event) => handleCategoryKeyDown(event, index)}
      >
        <span aria-hidden="true" className="settings-category-icon">{category.icon}</span>
        <span>{category.label}</span>
      </Button>
    ))}
  </nav>
  <div
    id={`settings-panel-${activeCategory}`}
    role="tabpanel"
    aria-labelledby={`settings-tab-${activeCategory}`}
    className="settings-category-panel"
  >
    <h2 className="settings-category-title">{activeCategoryLabel}</h2>
    {renderActiveCategory()}
  </div>
</div>
```

`renderActiveCategory()` 用 `switch` 返回规格中的分组：

- `appearance`：自定义主题色、字体、主题管理。
- `typography`：标题、正文、文章结构（元数据与首尾模板）。
- `content`：引用块、图片、表格、代码块。
- `editor`：智能粘贴、源码配色、AI 面板、界面明暗。
- `publishing`：公众号发布、完整配置导入导出。

保留现有控件 JSX 与回调，仅移动位置；将“主题模式”改为“界面明暗”，将“配置迁移”改为“完整配置”。

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: PASS，包含新增的分类、点击和键盘测试。

- [ ] **Step 5: 扩展统一按钮变体、提升补丁版本并提交**

在 `src/components/ui/Button.tsx` 的 `ButtonProps.variant` 和 `variantClassMap` 中加入 `settingsCategory: 'settings-category-tab'`，确保分类按钮继续经过项目统一 `Button` 组件。将 `package.json` 从 `1.27.38` 提升到 `1.27.39`，然后：

```bash
git add src/components/SettingsPanel.tsx src/components/ui/Button.tsx src/App.test.js package.json
git commit -m "feat: 重组配置页分类导航"
```

### Task 3: 实现桌面侧栏与手机标签布局

**Files:**
- Modify: `src/components/SettingsPanel.css`
- Modify: `src/App.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 的 `.settings-category-nav`、`.settings-category-tab`、`.settings-category-panel`。
- Produces: 大于 `768px` 的双栏面板和不大于 `768px` 的顶部横向标签布局。

- [ ] **Step 1: 添加静态结构回归断言**

在 Task 1 的分类测试中追加：

```js
expect(container.querySelector('.settings-panel').classList.contains('settings-panel')).toBe(true);
expect(container.querySelector('.settings-category-nav')).not.toBeNull();
expect(container.querySelector('.settings-category-panel')).not.toBeNull();
```

- [ ] **Step 2: 扩展面板为桌面双栏**

修改 `SettingsPanel.css`：

- 面板宽度使用已有 token 组合，目标约 `680px`，并设置 `max-width: calc(100vw - 32px)`。
- `.settings-panel` 改为 grid，两列为约 `160px minmax(0, 1fr)`；最大高度与现有规则相同。
- `.settings-category-nav` 纵向排列，使用右边框分隔。
- `.settings-category-tab[aria-selected='true']` 使用品牌弱背景、品牌文字和左侧选中标识；保留 `:focus-visible`。
- `.settings-category-panel` 独立纵向滚动，避免导航随内容离开视口。
- `.settings-category-title` 是当前分类的可见二级标题。

- [ ] **Step 3: 在既有移动断点切为顶部标签**

在 `@media (max-width: 768px)` 中：

- 面板恢复单列，宽度限制在可视区内。
- `.settings-category-nav` 横向排列并允许 `overflow-x: auto`。
- tab 使用不换行文字和底部/背景选中态，触控目标最小高度约 44px。
- `.settings-category-panel` 使用单列并承担纵向滚动。

- [ ] **Step 4: 运行聚焦测试与构建**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: PASS。

Run: `npm run build`

Expected: build 成功，无 TypeScript 或 CSS 编译错误。

- [ ] **Step 5: 提升补丁版本并提交**

将 `package.json` 从 `1.27.39` 提升到 `1.27.40`，然后：

```bash
git add src/components/SettingsPanel.css src/App.test.js package.json
git commit -m "style: 适配配置分类的响应式布局"
```

### Task 4: 同步用户与维护文档

**Files:**
- Modify: `docs/usage.md`
- Modify: `CLAUDE.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 最终采用的五分类名称与字段归属。
- Produces: 与界面一致的用户说明和维护约束。

- [ ] **Step 1: 更新用户配置说明**

将 `docs/usage.md` 的旧十组说明替换为五分类结构，逐项列出配置归属，并明确：

```md
- “主题与外观”中的主题 JSON 只保存文章排版。
- “发布与数据”中的完整配置 JSON 用于迁移用户级设置。
- 桌面端通过左侧分类切换，手机端通过顶部分类标签切换。
```

- [ ] **Step 2: 更新维护说明**

在 `CLAUDE.md` 中将源码高亮、AI 面板等条目的“通用组”引用改为“编辑体验”，并补充配置页五分类与临时分类状态约束。

- [ ] **Step 3: 提升补丁版本并提交**

将 `package.json` 从 `1.27.40` 提升到 `1.27.41`，然后：

```bash
git add docs/usage.md CLAUDE.md package.json
git commit -m "docs: 更新配置页分类说明"
```

### Task 5: 完整验证、代码审查与合并

**Files:**
- Verify: `src/components/SettingsPanel.tsx`
- Verify: `src/components/SettingsPanel.css`
- Verify: `src/App.test.js`
- Verify: `docs/usage.md`
- Verify: `CLAUDE.md`

**Interfaces:**
- Consumes: Tasks 1–4 的完整分支。
- Produces: 可安全快进合并回 `main` 的已验证提交序列。

- [ ] **Step 1: 运行全量自动化验证**

Run: `CI=true npm test -- --runInBand`

Expected: 所有测试通过；已有 React act 或无后端网络警告单独记录。

Run: `npm run build`

Expected: build 成功。

Run: `git diff main...HEAD --check`

Expected: 无空白错误。

- [ ] **Step 2: 浏览器验证桌面和手机**

启动本地应用，分别检查约 `1024px` 与 `375px`：

- 五个分类均可点击，当前内容与标题匹配。
- 桌面为左侧导航，手机为顶部横向标签。
- 主题管理、模板、公众号配置和两个 JSON 导入入口均可到达。
- 键盘方向键切换分类并移动焦点。
- 浅色和深色模式无溢出、遮挡、低对比或新增控制台错误。

- [ ] **Step 3: 审查变更范围**

确认 `git diff main...HEAD` 仅包含规格、计划、配置面板、测试、文档和版本更新；确认没有修改配置数据结构、持久化键或渲染管线。

- [ ] **Step 4: 按已确认流程合并主干**

```bash
git switch main
git merge --ff-only codex/settings-information-architecture
git branch -d codex/settings-information-architecture
```

合并后运行 `git status --short`，Expected: 工作区干净。
