# 设置分类与「我的主题」图标改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用统一的线性 SVG 替换设置分类字符图标，并为「我的主题」增加随展开状态旋转的折角箭头。

**Architecture:** 新建一个只负责设置分类图标映射的 React 组件，`SettingsPanel` 继续以分类 ID 作为唯一状态源；`SavedThemeMenu` 内使用轻量内联 Chevron SVG，并由现有 `open` 状态控制 CSS 旋转。所有图标均使用 `currentColor`，不引入依赖。

**Tech Stack:** React 18、TypeScript、CSS、Jest、React Testing Library

**Spec:** `docs/superpowers/specs/2026-09-15-settings-and-saved-theme-icons-design.md`

## Global Constraints

- 分类图标固定为 `17px`、`1.7px` 描边，本地 SVG，使用 `currentColor`。
- 「我的主题」箭头固定为 `14px`，关闭向右、展开向下，过渡约 `150ms`。
- 不改变设置分类信息架构、菜单数据、键盘交互或保存主题逻辑。
- 不引入新的图标库或运行时依赖。
- 源码变更同时更新项目文档与 `package.json` 补丁版本。

---

### Task 1: 设置分类线性图标

**Files:**
- Create: `src/components/ui/SettingsCategoryIcon.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/SettingsPanel.css`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: `SettingsCategory = 'appearance' | 'typography' | 'content' | 'editor' | 'publishing'`
- Produces: `SettingsCategoryIcon({ category }: { category: SettingsCategory }): JSX.Element`

- [ ] **Step 1: 写失败测试**

在 `src/App.test.js` 打开设置面板，断言五个分类按钮各自包含 `svg.settings-category-icon`，SVG 为 `aria-hidden="true"`，并断言旧字符 `◐¶▦⌨↑` 不存在。

- [ ] **Step 2: 验证测试失败**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: FAIL，因为当前分类仍渲染字符 `<span>`。

- [ ] **Step 3: 实现图标组件与接入**

在 `SettingsCategoryIcon.tsx` 为五种分类分别实现太阳、字体、分区布局、键盘和上传 SVG；统一：

```tsx
<svg
  className="settings-category-icon"
  width="17"
  height="17"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.7"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
```

`SettingsPanel.tsx` 的分类数组只保留 `id` 与 `label`，按钮内改为 `<SettingsCategoryIcon category={category.id} />`。CSS 保持 18px 对齐槽位并移除字符字号依赖。

- [ ] **Step 4: 验证分类图标测试通过**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: PASS。

### Task 2: 「我的主题」状态箭头

**Files:**
- Modify: `src/components/SavedThemeMenu.tsx`
- Modify: `src/components/SavedThemeMenu.css`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: `SavedThemeMenu` 现有 `open: boolean`
- Produces: `.saved-theme-menu-chevron` 与 `data-open="true|false"`

- [ ] **Step 1: 写失败测试**

断言「我的主题」按钮内有 `svg.saved-theme-menu-chevron[aria-hidden="true"]`；点击前 `data-open="false"`，点击后为 `data-open="true"`，同时菜单仍可见。

- [ ] **Step 2: 验证测试失败**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: FAIL，因为当前使用 `⌄` 字符且没有展开状态属性。

- [ ] **Step 3: 实现 Chevron 与旋转状态**

在触发按钮内替换字符图标：

```tsx
<svg
  className="saved-theme-menu-chevron"
  data-open={open}
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <path d="m9 18 6-6-6-6" />
</svg>
```

CSS 默认保持向右，`[data-open='true']` 旋转 `90deg`，使用 `transform 150ms ease`；触发按钮图标与文字保持 6px 间距。

- [ ] **Step 4: 验证状态箭头测试通过**

Run: `CI=true npm test -- --runInBand src/App.test.js`

Expected: PASS。

### Task 3: 文档、版本与全链路验证

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/usage.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: 已完成的图标组件与交互状态
- Produces: 版本 `1.27.41` 与可复查的用户/项目说明

- [ ] **Step 1: 更新文档与版本**

在 `docs/usage.md` 的主题和设置说明中补充统一线性分类图标与展开箭头；在 `CLAUDE.md` 记录图标组件位置和复用约束；把 `package.json` 版本更新为 `1.27.41`。

- [ ] **Step 2: 运行完整验证**

Run:

```bash
CI=true npm test -- --runInBand
npm run build
npm run pre-commit-check
git diff --check
```

Expected: 全部退出码为 0。

- [ ] **Step 3: 浏览器验收**

在真实浏览器打开设置弹框，检查桌面与不宽于 768px 的视口、明暗主题、五个分类状态和「我的主题」箭头旋转；控制台无本次改动导致的错误。
