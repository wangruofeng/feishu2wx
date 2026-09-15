# 设置页主题能力收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除首页主题入口，修复设置页滚动与排序，并为匹配当前配置的已保存主题提供明确选中标识。

**Architecture:** `App` 只保留设置齿轮作为主题入口，并把当前完整主题快照交给 `SettingsPanel`。快照匹配由 `savedThemes.ts` 的纯函数完成；设置面板使用受视口约束的网格高度和独立右侧滚动区。

**Tech Stack:** React 18、TypeScript、CSS、Jest、Testing Library

**Spec:** `docs/superpowers/specs/2026-09-15-settings-theme-consolidation-design.md`

## Global Constraints

- 不修改内置主题色值和现有 localStorage 键。
- 当前主题匹配范围必须严格使用 `ARTICLE_THEME_SETTING_KEYS`。
- 多个快照相同的保存主题允许同时标记为当前。
- 设置分类继续用 `aria-selected`，保存主题当前项使用 `aria-current="true"`。
- 实现提交版本提升为 `1.27.44`。

---

### Task 1: 当前主题快照比较

**Files:**
- Modify: `src/utils/savedThemes.ts`
- Test: `src/utils/savedThemes.test.js`

**Interfaces:**
- Produces: `articleThemeSettingsEqual(a: ArticleThemeSettings, b: ArticleThemeSettings): boolean`

- [ ] **Step 1: 写失败测试**

新增测试，断言完整相同配置返回 `true`，修改 `font` 或 `theme` 返回 `false`，对象键顺序不影响结果。

- [ ] **Step 2: 运行失败测试**

Run: `CI=true npm test -- --runInBand src/utils/savedThemes.test.js`
Expected: FAIL，`articleThemeSettingsEqual` 尚未导出。

- [ ] **Step 3: 实现纯函数**

```ts
export function articleThemeSettingsEqual(a: ArticleThemeSettings, b: ArticleThemeSettings): boolean {
  return ARTICLE_THEME_SETTING_KEYS.every((key) =>
    Object.is(a[key as keyof ArticleThemeSettings], b[key as keyof ArticleThemeSettings]));
}
```

- [ ] **Step 4: 验证测试通过**

Run: `CI=true npm test -- --runInBand src/utils/savedThemes.test.js`
Expected: PASS。

### Task 2: 收敛主题入口并调整设置页顺序

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: `currentThemeSettings: ArticleThemeSettings`
- Consumes: `articleThemeSettingsEqual`

- [ ] **Step 1: 写失败测试**

调整 App 测试，断言顶部不存在“预设主题 / 自定义主题 / 我的主题”；打开设置后“文章外观”的直接行标签依次为“字体 / 自定义主题色 / 预设主题”。

- [ ] **Step 2: 运行测试确认失败**

Run: `CI=true npm test -- --runInBand src/App.test.js`
Expected: FAIL，顶部入口仍存在且设置顺序不符。

- [ ] **Step 3: 移除顶部挂载与定位状态**

从 `App.tsx` 删除 `ThemeSwitcher` import、`.top-bar-center` 渲染、`settingsTarget` 状态和 `SettingsPanel.openTarget` 传参；齿轮仅切换 `settingsOpen`。

- [ ] **Step 4: 调整设置页顺序**

在 `SettingsPanel.tsx` 中将预设主题 JSX 移到自定义主题色之后，删除不再需要的自定义定位 ref、焦点样式和 `openTarget` 属性。

- [ ] **Step 5: 验证聚焦测试**

Run: `CI=true npm test -- --runInBand src/App.test.js`
Expected: 顶部入口和排序断言 PASS。

### Task 3: 保存主题当前标识

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/SettingsPanel.css`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: `currentThemeSettings: ArticleThemeSettings`
- Consumes: `articleThemeSettingsEqual(a, b)`

- [ ] **Step 1: 写失败交互测试**

预置一份与当前配置一致的保存主题，打开设置后断言其行有 `aria-current="true"`、`.saved-theme-current-mark` 和“当前”；改变字体后断言标识消失，再点击应用后断言标识恢复。

- [ ] **Step 2: 实现当前项语义和样式**

`App` 将 `currentArticleThemeSettings` 传给 `SettingsPanel`。列表渲染时用纯函数计算 `isCurrent`，为行增加 `aria-current={isCurrent ? 'true' : undefined}` 与 `saved-theme-row--current`；名称旁渲染装饰勾选和“当前”文字。CSS 使用品牌色浅背景与边框，不改变操作按钮布局。

- [ ] **Step 3: 验证交互测试**

Run: `CI=true npm test -- --runInBand src/App.test.js`
Expected: 当前标识出现、失配、恢复三种状态全部 PASS。

### Task 4: 修复滚动并移除分类竖条

**Files:**
- Modify: `src/components/SettingsPanel.css`
- Test: `src/App.test.js`

**Interfaces:**
- Produces: `.settings-panel` 固定受视口约束高度；`.settings-category-panel` 独立纵向滚动。

- [ ] **Step 1: 增加结构回归断言**

在 App 测试中读取样式表规则，断言 `.settings-panel` 包含 `grid-template-rows: minmax(0, 1fr)`，`.settings-category-panel` 包含 `min-height: 0` 与 `overflow-y: auto`，且不存在分类选中项 `::before` 规则。

- [ ] **Step 2: 修正布局 CSS**

给 `.settings-panel` 增加 `grid-template-rows: minmax(0, 1fr)` 和明确 `height: min(560px, calc(100vh - 96px))`；给 `.settings-category-panel` 增加 `min-height: 0`；删除桌面和移动端 `.settings-category-tab[aria-selected='true']::before` 两段规则。

- [ ] **Step 3: 验证 App 测试**

Run: `CI=true npm test -- --runInBand src/App.test.js`
Expected: PASS。

### Task 5: 文档与完整验收

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/claude/architecture.md`
- Modify: `docs/usage.md`

**Interfaces:**
- Produces: 主题唯一入口、滚动容器和当前主题匹配规则说明。

- [ ] **Step 1: 更新文档**

删除顶部双入口说明，明确主题统一在设置页配置；记录保存主题当前项按完整快照匹配，以及右侧分类内容独立滚动。

- [ ] **Step 2: 完整自动化验证**

Run: `CI=true npm test -- --runInBand`
Expected: 全部测试 PASS。

- [ ] **Step 3: 构建和提交检查**

Run: `npm run build && npm run pre-commit-check && git diff --check`
Expected: 全部以 0 退出。

- [ ] **Step 4: 真实浏览器验收**

确认顶部入口消失；文章排版可滚到最后；预设主题位于自定义色之后；当前主题标识随配置变化；分类选中项无竖条；控制台无新增错误。

- [ ] **Step 5: 提交实现**

```bash
git add CLAUDE.md docs/claude/architecture.md docs/usage.md src/App.tsx src/App.test.js src/components/SettingsPanel.tsx src/components/SettingsPanel.css src/utils/savedThemes.ts src/utils/savedThemes.test.js docs/superpowers/plans/2026-09-15-settings-theme-consolidation.md
git commit -m "feat: 收敛设置页主题配置"
```
