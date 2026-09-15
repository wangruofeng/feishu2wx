# 文章排版主题保存与切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户把当前文章排版配置保存为多份本地主题，并可应用、逐份导出、导入和删除。

**Architecture:** 新增独立的 `savedThemes` 领域模块，集中定义主题字段、严格 JSON 校验和 localStorage 持久化；`App` 只负责把现有状态组装成快照并应用快照；顶栏菜单与设置面板共享同一主题集合和动作。现有预设主题切换与完整“配置迁移”保持不变。

**Tech Stack:** React 18、TypeScript、localStorage、Jest / react-scripts test、CSS design tokens

**Spec:** `docs/superpowers/specs/2026-09-15-saved-article-themes-design.md`

## Global Constraints

- 主题只保存设计规格“范围”章节列出的文章排版字段。
- 不保存正文、历史、粘贴偏好、模板、发布行为、应用外观、AI 设置或任何凭证。
- localStorage 键固定为 `feishu2wx_savedThemes`。
- 导出格式固定为 `version: 1`、`type: "feishu2wx-theme"`，每个文件只含一份主题。
- 导入只加入列表，不自动应用。
- 不新增第三方依赖；所有新增颜色、间距和圆角使用 `src/styles/tokens.css` 中已有 token。
- 实现提交前将 `package.json` 从 `1.27.35` 更新为 `1.27.36`，并同步更新 `docs/usage.md`。

---

## File Map

- Create `src/utils/savedThemes.ts`: 主题类型、严格校验、集合增删改查、导入导出与安全文件名。
- Create `src/utils/savedThemes.test.js`: 领域模块全部边界测试。
- Create `src/components/SavedThemeMenu.tsx`: 顶栏“我的主题”弹出菜单。
- Create `src/components/SavedThemeMenu.css`: 菜单布局、空状态、暗色样式和移动端行为。
- Modify `src/App.tsx`: 维护主题集合、生成当前快照、统一应用、保存/导入/导出/删除动作并连接两个界面。
- Modify `src/App.test.js`: 保存、应用、不自动改写、导入不应用和确认分支回归测试。
- Modify `src/components/SettingsPanel.tsx`: 新增主题管理分组和相应 props。
- Modify `src/components/SettingsPanel.css`: 主题名称输入、列表和操作区样式。
- Modify `src/components/ThemeSwitcher.tsx`: 接入 `SavedThemeMenu`，不改变五个现有预设按钮。
- Modify `src/components/ThemeSwitcher.css`: 容纳“我的主题”入口。
- Modify `docs/usage.md`: 解释保存主题和配置迁移的边界及操作。
- Modify `package.json`: 版本更新为 `1.27.36`。

---

### Task 1: 主题领域模型、校验和持久化

**Files:**
- Create: `src/utils/savedThemes.ts`
- Create: `src/utils/savedThemes.test.js`

**Interfaces:**
- Consumes: 浏览器 `Storage` 接口；现有排版状态使用的字符串枚举。
- Produces: `ArticleThemeSettings`、`SavedArticleTheme`、`loadSavedThemes(storage?)`、`saveThemeSnapshot(themes, name, settings, now?, idFactory?)`、`deleteSavedTheme(themes, id)`、`persistSavedThemes(themes, storage?)`、`serializeSavedTheme(theme)`、`parseSavedTheme(json, now?, idFactory?)`、`savedThemeFilename(name)`。

- [ ] **Step 1: 写出严格导入导出与字段范围的失败测试**

在 `src/utils/savedThemes.test.js` 定义包含全部字段的 fixture，并验证往返及敏感字段不会进入结果：

```js
import {
  parseSavedTheme,
  serializeSavedTheme,
  savedThemeFilename,
} from './savedThemes';

const settings = {
  theme: 'teal', customThemeColor: '#0D9488', font: 'pingfang',
  codeBlockStyle: 'modern', imageBorderStyle: 'shadow', imageBorderRadius: true,
  showH1Underline: true, invertH1: false, alignH1Left: true,
  invertH2: false, alignH2Left: true, showH2Underline: true,
  showHorizontalRule: false, showFrontMatter: true, tableShadow: false,
  blockquoteBackgroundMode: 'theme', blockquoteColorMode: 'default',
  blockquoteHeightMode: 'compact', textAlignMode: 'justify', markerHighlightColor: 'yellow',
};

test('exports and imports one complete article theme only', () => {
  const theme = { id: 'theme-1', name: '技术文章', createdAt: 10, updatedAt: 20, settings };
  const json = serializeSavedTheme({ ...theme, appSecret: 'secret', headerTemplate: '尾注' });
  expect(JSON.parse(json)).toEqual({ version: 1, type: 'feishu2wx-theme', name: '技术文章', settings });
  expect(json).not.toContain('secret');
  expect(json).not.toContain('headerTemplate');
  expect(parseSavedTheme(json, 30, () => 'imported')).toEqual({
    theme: { id: 'imported', name: '技术文章', createdAt: 30, updatedAt: 30, settings },
  });
  expect(savedThemeFilename(' 技术/文章 ')).toBe('feishu2wx-theme-技术-文章.json');
});
```

另写表驱动测试，逐项拒绝：无效 JSON、错误 `version`、错误 `type`、空名称、缺字段、额外字段、非法枚举和错误类型。

- [ ] **Step 2: 运行测试确认红灯**

Run: `CI=true npm test -- --runInBand --watchAll=false src/utils/savedThemes.test.js`

Expected: FAIL，提示无法解析 `./savedThemes`。

- [ ] **Step 3: 实现精确类型与严格主题文件解析**

在 `src/utils/savedThemes.ts` 定义完整接口，不使用索引签名放宽输入：

```ts
export interface ArticleThemeSettings {
  theme: 'classic' | 'orange' | 'blue' | 'teal' | 'custom';
  customThemeColor: string;
  font: string;
  codeBlockStyle: 'classic' | 'modern';
  imageBorderStyle: 'border' | 'shadow' | 'default';
  imageBorderRadius: boolean;
  showH1Underline: boolean;
  invertH1: boolean;
  alignH1Left: boolean;
  invertH2: boolean;
  alignH2Left: boolean;
  showH2Underline: boolean;
  showHorizontalRule: boolean;
  showFrontMatter: boolean;
  tableShadow: boolean;
  blockquoteBackgroundMode: 'none' | 'theme';
  blockquoteColorMode: 'default' | 'theme';
  blockquoteHeightMode: 'loose' | 'compact';
  textAlignMode: 'left' | 'justify';
  markerHighlightColor: 'purple' | 'yellow' | 'green' | 'blue' | 'pink';
}

export interface SavedArticleTheme {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: ArticleThemeSettings;
}
```

用显式 `THEME_SETTING_KEYS`、枚举映射、布尔字段集合和字符串字段集合校验全部且仅有这些字段。`parseSavedTheme()` 返回 `{ theme } | { error }`，错误文案分别覆盖 JSON、版本/类型、名称和字段问题。`serializeSavedTheme()` 从白名单重新构造 `settings`，不能直接展开传入对象。

- [ ] **Step 4: 写出集合存储、排序、覆盖、删除与异常的失败测试**

```js
test('creates and overwrites by normalized name while preserving identity', () => {
  const created = saveThemeSnapshot([], ' 技术文章 ', settings, 10, () => 'theme-1');
  expect(created).toEqual({ themes: [{ id: 'theme-1', name: '技术文章', createdAt: 10, updatedAt: 10, settings }], overwritten: false });
  const overwritten = saveThemeSnapshot(created.themes, '技术文章', { ...settings, theme: 'blue' }, 20, () => 'unused');
  expect(overwritten.overwritten).toBe(true);
  expect(overwritten.themes[0]).toMatchObject({ id: 'theme-1', createdAt: 10, updatedAt: 20 });
});

test('keeps valid entries when storage contains a damaged entry', () => {
  localStorage.setItem('feishu2wx_savedThemes', JSON.stringify([
    { id: 'ok', name: '可用', createdAt: 1, updatedAt: 2, settings },
    { id: 'bad', name: '', settings: {} },
  ]));
  expect(loadSavedThemes()).toHaveLength(1);
});
```

补充 `persistSavedThemes()` 在 `setItem` 抛错时返回 `{ success: false, error: '主题保存失败，请检查浏览器存储空间。' }`，且调用方数组不被改变的测试。

- [ ] **Step 5: 实现集合操作和 localStorage 包装**

```ts
export const SAVED_THEMES_KEY = 'feishu2wx_savedThemes';

export function persistSavedThemes(themes: SavedArticleTheme[], storage: Storage = localStorage) {
  try {
    storage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
    return { success: true as const };
  } catch {
    return { success: false as const, error: '主题保存失败，请检查浏览器存储空间。' };
  }
}
```

`loadSavedThemes()` 捕获读取/解析错误并返回空数组，合法条目按 `updatedAt` 降序排列；`saveThemeSnapshot()` 返回新数组，不修改输入；同名比较使用 trim 后的精确字符串；`deleteSavedTheme()` 返回过滤后的新数组。

- [ ] **Step 6: 运行领域测试和相关配置测试**

Run: `CI=true npm test -- --runInBand --watchAll=false src/utils/savedThemes.test.js src/utils/settingsBackup.test.js`

Expected: PASS。

- [ ] **Step 7: 提交领域层**

```bash
git add src/utils/savedThemes.ts src/utils/savedThemes.test.js
git commit -m "feat: 添加文章主题存储与导入导出"
```

---

### Task 2: App 主题状态与完整应用链路

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.js`

**Interfaces:**
- Consumes: Task 1 的 `ArticleThemeSettings`、`SavedArticleTheme` 和全部集合函数。
- Produces: 传给界面的 `savedThemes`、`onSaveTheme(name)`、`onApplyTheme(id)`、`onDeleteTheme(id)`、`onExportTheme(id)`、`onImportTheme(file)`；内部 `currentArticleThemeSettings` 与 `applyArticleThemeSettings(settings)`。

- [ ] **Step 1: 写出保存、应用和快照独立性的失败回归测试**

在 `src/App.test.js` 新增测试：打开设置，选择蓝色、字体和引用配置，输入“技术文章”并保存；断言 `feishu2wx_savedThemes` 含完整字段。随后修改当前主题为橙色，再点击保存主题的“应用”，断言顶栏蓝色按钮激活且相关 localStorage 字段恢复。最后修改一个选项，断言已保存 JSON 没有随状态修改。

关键断言：

```js
const stored = JSON.parse(localStorage.getItem('feishu2wx_savedThemes'));
expect(stored[0].name).toBe('技术文章');
expect(stored[0].settings).toMatchObject({ theme: 'blue', font: 'pingfang' });
expect(Object.keys(stored[0].settings).sort()).toEqual(EXPECTED_THEME_KEYS.sort());
```

- [ ] **Step 2: 运行 App 测试确认红灯**

Run: `CI=true npm test -- --runInBand --watchAll=false src/App.test.js`

Expected: FAIL，找不到主题管理控件。

- [ ] **Step 3: 在 App 中建立唯一快照和应用函数**

导入 Task 1 接口。用 `useMemo` 生成仅含 20 个主题字段的 `currentArticleThemeSettings`。实现一次性 setter 映射：

```ts
const applyArticleThemeSettings = useCallback((settings: ArticleThemeSettings) => {
  setTheme(settings.theme);
  setCustomThemeColor(settings.customThemeColor);
  setFont(settings.font);
  setCodeBlockStyleState(settings.codeBlockStyle);
  setImageBorderStyle(settings.imageBorderStyle);
  setImageBorderRadius(settings.imageBorderRadius);
  setShowH1Underline(settings.showH1Underline);
  setInvertH1(settings.invertH1);
  setAlignH1Left(settings.alignH1Left);
  setInvertH2(settings.invertH2);
  setAlignH2Left(settings.alignH2Left);
  setShowH2Underline(settings.showH2Underline);
  setShowHorizontalRuleState(settings.showHorizontalRule);
  setShowFrontMatter(settings.showFrontMatter);
  setTableShadow(settings.tableShadow);
  setBlockquoteBackgroundMode(settings.blockquoteBackgroundMode);
  setBlockquoteColorMode(settings.blockquoteColorMode);
  setBlockquoteHeightMode(settings.blockquoteHeightMode);
  setTextAlignMode(settings.textAlignMode);
  setMarkerHighlightColor(settings.markerHighlightColor);
}, []);
```

初始化 `savedThemes` 时调用 `loadSavedThemes()`。每个变更动作先计算 next 数组，再调用 `persistSavedThemes(next)`；只有持久化成功才 `setSavedThemes(next)`，失败则返回 `{ success: false, error }`。

- [ ] **Step 4: 实现覆盖、删除、导入和导出动作**

- 保存前 trim 名称；空名称返回“请输入主题名称。”。
- `saveThemeSnapshot()` 返回 `overwritten`；若同名已存在，由界面先确认，再传 `allowOverwrite`，未授权返回 `{ success: false, needsOverwrite: true }`。
- 删除通过 ID 精确定位；不存在返回“主题不存在或已被删除。”。
- 导入先 `await file.text()` 和 `parseSavedTheme()`；同名时返回 `needsOverwrite`，确认后复用覆盖路径；成功不调用应用函数。
- 导出按 ID 取主题，使用 `serializeSavedTheme()`、Blob、对象 URL 和 `savedThemeFilename()` 下载，并在点击后 revoke URL。

- [ ] **Step 5: 补充导入不自动应用和确认取消测试**

构造 `File([serializeSavedTheme(...)], 'theme.json', { type: 'application/json' })`，触发主题文件 input change，断言列表增加但当前 `.theme-option.active` 不变。mock `window.confirm` 返回 false，验证同名保存和删除均不改变存储；返回 true 时验证覆盖保留 ID/createdAt、删除移除条目。

- [ ] **Step 6: 运行 App 与领域测试**

Run: `CI=true npm test -- --runInBand --watchAll=false src/App.test.js src/utils/savedThemes.test.js`

Expected: 主题链路测试 PASS；允许已有测试输出既有 React act 警告，但不得新增失败。

- [ ] **Step 7: 提交应用状态链路**

```bash
git add src/App.tsx src/App.test.js
git commit -m "feat: 接入文章主题保存与应用状态"
```

---

### Task 3: 设置管理界面与顶栏快速切换

**Files:**
- Create: `src/components/SavedThemeMenu.tsx`
- Create: `src/components/SavedThemeMenu.css`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/SettingsPanel.css`
- Modify: `src/components/ThemeSwitcher.tsx`
- Modify: `src/components/ThemeSwitcher.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.js`

**Interfaces:**
- Consumes: Task 2 提供的 `savedThemes` 和动作函数；Task 1 的 `SavedArticleTheme`。
- Produces: 可访问的“我的主题”顶栏菜单，以及设置面板中的保存、应用、导出、导入和删除操作。

- [ ] **Step 1: 写出界面可访问性与快速切换失败测试**

预置 `feishu2wx_savedThemes` 后渲染 App，断言：

```js
const menuButton = Array.from(container.querySelectorAll('button'))
  .find((button) => button.textContent.includes('我的主题'));
expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
expect(menuButton).toHaveAttribute('aria-expanded', 'false');
```

点击后断言菜单经 `.app` 内 portal 或同一顶栏 DOM 渲染、主题项可用、Esc 关闭后焦点回到入口。无主题时断言显示“还没有保存的主题”。

- [ ] **Step 2: 运行 App 测试确认红灯**

Run: `CI=true npm test -- --runInBand --watchAll=false src/App.test.js`

Expected: FAIL，缺少“我的主题”按钮。

- [ ] **Step 3: 实现 SavedThemeMenu**

组件接口固定为：

```ts
interface Props {
  themes: SavedArticleTheme[];
  onApply: (id: string) => void;
}
```

入口使用共享 `Button`；弹层使用 `role="menu"`，主题项使用 `role="menuitem"`。打开时监听 Esc 和外部点击，关闭时入口恢复焦点。点击主题后调用 `onApply(id)` 并关闭。列表按传入顺序显示，不在组件内读 localStorage。

- [ ] **Step 4: 把菜单接到现有 ThemeSwitcher**

扩展 Props：

```ts
interface Props {
  theme: string;
  setTheme: (theme: string) => void;
  customThemeColor?: string;
  savedThemes: SavedArticleTheme[];
  onApplySavedTheme: (id: string) => void;
}
```

五个现有主题按钮的 DOM、文案和点击行为保持不变；在 map 后渲染 `<SavedThemeMenu />`。移动端继续由 `.theme-switcher { display: none; }` 隐藏整组控件。

- [ ] **Step 5: 实现设置面板主题管理分组**

SettingsPanel 新增相应 props，并维护局部 `themeName`、`themeStatus`、`themeImportInputRef`。分组放在“代码块”之后、“模板”之前：

```tsx
<section className="settings-group saved-theme-manager">
  <h3 className="settings-group-title">主题管理</h3>
  <div className="saved-theme-create-row">
    <input value={themeName} onChange={(event) => setThemeName(event.target.value)}
      placeholder="输入主题名称" aria-label="主题名称" />
    <Button variant="toggle" onClick={handleSaveTheme}>保存当前配置</Button>
  </div>
  {/* 列表每项显示名称，以及应用、导出、删除 Button */}
  <Button variant="toggle" onClick={() => themeImportInputRef.current?.click()}>导入主题 JSON</Button>
  <input ref={themeImportInputRef} type="file" accept="application/json,.json"
    className="settings-config-import-input" aria-label="导入主题 JSON" onChange={handleImportTheme} />
  {themeStatus && <span role="status" className="settings-row-hint">{themeStatus}</span>}
</section>
```

同名保存/导入收到 `needsOverwrite` 时调用 `window.confirm('已存在同名主题，是否覆盖？')` 后用 `allowOverwrite: true` 重试。删除调用 `window.confirm('确定删除主题“名称”吗？')`。无主题显示空状态。无论导入成功或失败，都清空 input value，允许重复选择同一文件。

- [ ] **Step 6: 添加样式并验证主题适配**

使用已有 token 实现紧凑列表；按钮仍使用共享 `Button`。确保：长名称省略但 `title` 可读、操作按钮不挤压名称、暗色模式只依赖 token、设置面板窄宽度下输入和按钮可换行、顶栏菜单层级高于主内容且不遮挡设置按钮。

- [ ] **Step 7: 运行完整前端测试**

Run: `CI=true npm test -- --runInBand --watchAll=false`

Expected: PASS，无快照更新请求，无新增 act 警告。

- [ ] **Step 8: 提交界面**

```bash
git add src/components/SavedThemeMenu.tsx src/components/SavedThemeMenu.css src/components/SettingsPanel.tsx src/components/SettingsPanel.css src/components/ThemeSwitcher.tsx src/components/ThemeSwitcher.css src/App.tsx src/App.test.js
git commit -m "feat: 添加主题管理与快速切换界面"
```

---

### Task 4: 文档、版本与最终验证

**Files:**
- Modify: `docs/usage.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1-3 的最终用户行为。
- Produces: 用户可查阅的操作说明与满足提交钩子的 `1.27.36` 版本。

- [ ] **Step 1: 更新使用指南**

在目录加入“保存主题”，在“排版设置”表格加入“主题管理”分组，并新增章节明确说明：保存当前配置、从顶栏/设置应用、应用后修改不自动覆盖、逐份导出/导入、同名覆盖确认、localStorage 持久化，以及与“配置迁移”的区别。列出主题包含和排除的配置类别，不声称跨设备自动同步。

- [ ] **Step 2: 更新补丁版本**

用精确补丁把 `package.json` 的版本从 `1.27.35` 改为 `1.27.36`。

- [ ] **Step 3: 运行聚焦测试、全量测试、构建和差异检查**

```bash
CI=true npm test -- --runInBand --watchAll=false src/utils/savedThemes.test.js src/App.test.js
CI=true npm test -- --runInBand --watchAll=false
npm run build
git diff --check
```

Expected: 两次测试均 PASS；生产构建成功；`git diff --check` 无输出。若发现与本功能无关的既有失败，记录完整命令和错误并继续完成其余聚焦验证，不修改无关代码。

- [ ] **Step 4: 手动验收浏览器关键路径**

启动应用并依次验证：保存两份不同排版主题；刷新后仍存在；顶栏分别切换；应用后修改不污染快照；导出其中一份并重新导入；非法 JSON 被拒绝；取消同名覆盖和删除不会改变数据；手机宽度下通过设置面板仍可管理。

- [ ] **Step 5: 最终范围审计**

检查导出的 JSON 和 `feishu2wx_savedThemes`，确认不存在 `markdown`、`headerTemplate`、`footerTemplate`、`wechatLinkAutoAdapt`、`darkMode`、`syntaxTheme`、`aiPanelMode`、`appId`、`appSecret`、`apiKey`。检查 `git diff --stat` 与 `git status --short`，确认没有改动无关文件。

- [ ] **Step 6: 提交文档和版本**

```bash
git add docs/usage.md package.json
git commit -m "docs: 补充文章主题使用说明"
```

- [ ] **Step 7: 最终提交检查**

Run: `npm run pre-commit-check && git status --short`

Expected: 提交检查通过；工作区为空。
