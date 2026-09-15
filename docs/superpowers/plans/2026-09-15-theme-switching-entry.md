# 首页主题切换入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页平铺主题按钮改为“预设主题 / 自定义主题”双入口，并把完整预设集合迁入设置页。

**Architecture:** 用单一 `themePresets` 定义驱动顶部预设菜单与设置页预设区域。`ThemeSwitcher` 管理两个互斥入口和预设弹层，`App` 负责主题状态与打开设置的定位意图，`SettingsPanel` 负责切换到外观分类并滚动聚焦自定义主题编辑区。

**Tech Stack:** React 18、TypeScript、CSS、Jest、Testing Library

**Spec:** `docs/superpowers/specs/2026-09-15-theme-switching-entry-design.md`

## Global Constraints

- 经典、橙色、蓝色、青绿预设必须由一个共享数据源提供。
- 不修改预设主题的现有色值和 `localStorage` 键。
- 顶部必须保留两个有文字标签的独立入口。
- 自定义主题入口必须打开设置的“主题与外观”并定位到自定义主题色。
- 桌面端并排显示，窄屏工具栏保持现有行为。

---

### Task 1: 建立共享预设主题数据并覆盖迁移行为

**Files:**
- Create: `src/utils/themePresets.ts`
- Modify: `src/App.test.js`

**Interfaces:**
- Produces: `ThemePresetKey = 'classic' | 'orange' | 'blue' | 'teal'`
- Produces: `THEME_PRESETS: ReadonlyArray<{ key: ThemePresetKey; name: string; color: string }>`

- [ ] **Step 1: 写失败测试**

在 `src/App.test.js` 增加断言：首页只有“预设主题”和“自定义主题”入口、不再平铺“经典 / 橙色 / 蓝色 / 青绿 / 自定”；打开设置后可见“预设主题”及四个预设选项。

- [ ] **Step 2: 验证测试失败**

Run: `npm test -- --runInBand src/App.test.js`
Expected: FAIL，首页仍渲染旧主题按钮且设置页没有预设主题区域。

- [ ] **Step 3: 创建共享定义**

```ts
export type ThemePresetKey = 'classic' | 'orange' | 'blue' | 'teal';

export const THEME_PRESETS = [
  { key: 'classic', name: '经典', color: '#000000e6' },
  { key: 'orange', name: '橙色', color: '#FD4606' },
  { key: 'blue', name: '蓝色', color: '#0F4C81' },
  { key: 'teal', name: '青绿', color: '#0D9488' },
] as const;
```

- [ ] **Step 4: 运行工具测试**

Run: `npm test -- --runInBand src/App.test.js`
Expected: 仍 FAIL，但共享定义通过 TypeScript 编译。

### Task 2: 将首页主题选择器改为双入口

**Files:**
- Modify: `src/components/ThemeSwitcher.tsx`
- Modify: `src/components/ThemeSwitcher.css`
- Modify: `src/App.tsx`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: `THEME_PRESETS`
- Produces: `ThemeSwitcher` 新增 `onOpenCustomTheme: () => void`

- [ ] **Step 1: 扩充失败测试**

增加交互断言：点击“预设主题”设置 `aria-expanded=true`；点击“橙色”切换主题并写入 `feishu2wx_theme`；点击外部或按 Esc 关闭；点击“自定义主题”触发设置面板。

- [ ] **Step 2: 运行失败测试**

Run: `npm test -- --runInBand src/App.test.js`
Expected: FAIL，双入口及弹层尚不存在。

- [ ] **Step 3: 实现双入口和预设菜单**

`ThemeSwitcher` 只渲染两个文字按钮；预设按钮使用 `aria-haspopup="menu"`、`aria-expanded`，菜单项由 `THEME_PRESETS` 生成并以 `aria-checked` 标识当前项。用根节点 `ref` 监听外部点击，用 `keydown` 处理 Esc；点击自定义入口先关闭预设菜单，再调用 `onOpenCustomTheme()`。

- [ ] **Step 4: 接通 App 回调**

在 `App.tsx` 增加 `settingsTarget: 'default' | 'custom-theme'` 状态；齿轮按钮设为 `default`，自定义主题入口设为 `custom-theme` 并打开设置。

- [ ] **Step 5: 样式实现**

在 `ThemeSwitcher.css` 增加双入口、多色圆点、当前自定义色块、线性箭头、弹层、当前项和键盘焦点样式；保留现有断点策略。

- [ ] **Step 6: 运行聚焦测试**

Run: `npm test -- --runInBand src/App.test.js`
Expected: 双入口、预设切换和关闭行为 PASS；设置定位测试可继续失败。

### Task 3: 设置页增加预设区域并支持自定义定位

**Files:**
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/SettingsPanel.css`
- Modify: `src/App.tsx`
- Test: `src/App.test.js`

**Interfaces:**
- Consumes: `THEME_PRESETS`
- Consumes: `openTarget: 'default' | 'custom-theme'`
- Consumes: `theme: string` 与 `onChangeTheme: (theme: ThemePresetKey) => void`

- [ ] **Step 1: 实现设置页预设区域**

给 `SettingsPanel` 增加 `theme`、`onChangeTheme`、`openTarget` 属性。在“文章外观”顶部增加“预设主题”按钮组，由 `THEME_PRESETS` 生成；当前预设使用现有 `Button active` 语义。

- [ ] **Step 2: 实现定位行为**

给自定义主题区增加 `ref`、`tabIndex={-1}`。面板打开且 `openTarget === 'custom-theme'` 时切换到 `appearance`，下一帧执行 `scrollIntoView({ block: 'nearest' })` 并聚焦该区域；普通齿轮打开仍停留在外观分类顶部。

- [ ] **Step 3: 完成样式和接线**

为设置页预设按钮补充色点、选中态与换行布局；在 `App.tsx` 传入新增属性。

- [ ] **Step 4: 运行聚焦测试**

Run: `npm test -- --runInBand src/App.test.js`
Expected: 全部 App 测试 PASS。

### Task 4: 文档、版本与完整验证

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/claude/architecture.md`
- Modify: `docs/usage.md`
- Modify: `package.json`

**Interfaces:**
- Produces: 用户文档中的双入口说明和共享主题数据约束。

- [ ] **Step 1: 更新文档和版本**

记录首页双入口、设置页预设区域及自定义入口定位行为；将补丁版本从 `1.27.41` 更新为 `1.27.42`。

- [ ] **Step 2: 运行完整测试**

Run: `npm test -- --runInBand`
Expected: 全部测试 PASS。

- [ ] **Step 3: 构建与提交前检查**

Run: `npm run build && npm run pre-commit-check && git diff --check`
Expected: 三项均以 0 退出。

- [ ] **Step 4: 浏览器验收**

在桌面与窄屏分别验证双入口、预设切换、设置页预设同步、自定义定位、菜单互斥、外部点击和 Esc 关闭；检查控制台无新增错误。

- [ ] **Step 5: 提交实现**

```bash
git add CLAUDE.md docs/claude/architecture.md docs/usage.md package.json src/App.tsx src/App.test.js src/components/ThemeSwitcher.tsx src/components/ThemeSwitcher.css src/components/SettingsPanel.tsx src/components/SettingsPanel.css src/utils/themePresets.ts docs/superpowers/plans/2026-09-15-theme-switching-entry.md
git commit -m "feat: 重构主题切换入口"
```
