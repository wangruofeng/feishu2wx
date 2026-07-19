# SEO 审查报告：feishu2wx

> 审查日期：2026-07-19
> 审查范围：技术 SEO + 页面 SEO + 内容质量
> 线上部署：`https://feishu2wx.wangruofeng007.com/`（Cloudflare Pages，主）+ `https://blog.wangruofeng007.com/feishu2wx/`（GitHub Pages 自定义域名）

## 执行摘要

**整体健康度：较差。** 本站是一个纯客户端渲染的 React SPA，HTML 几乎无可索引内容，部署了两份却无 canonical 标签、无 sitemap、无 robots.txt，缺失 Open Graph / Twitter / 结构化数据等关键 meta 标签，且 `<head>` 中引用的多个资源返回 **404**。对于一个面向「飞书转微信公众号」「微信公众号排版工具」等中文关键词的工具站，当前配置在竞争性关键词上基本无法获得排名。

**前 5 大优先事项：**

1. 🔴 **严重** — HTML body 仅包含 `<div id="root"></div>`。Google 虽能执行 JS 渲染，但存在延迟且信号被削弱。需要 SSR/SSG 或预渲染兜底 HTML。
2. 🔴 **严重** — 存在两个线上部署（`feishu2wx.wangruofeng007.com` 与 `blog.wangruofeng007.com/feishu2wx/`），`<title>` 和 `<meta description>` 完全相同，**且无 canonical 标签** → 重复内容。
3. 🔴 主域下**无 `sitemap.xml`**（404）；blog 子域的 Hexo sitemap 也不包含 `/feishu2wx/`。
4. 🟠 **无 Open Graph / Twitter Card / JSON-LD 结构化数据** — 无社交分享预览，无富媒体搜索结果资格。
5. 🟠 **7 个阻塞渲染的 Google Fonts 请求** + **5.1 MB JS 包**（主包 1.4 MB）— Core Web Vitals 风险高（LCP/INP）。

**立即可做的快赢（今天就能做）：**
- 修复 `logo192.png` 和 `manifest.json` 的 404（两者都在 `<head>` 中被引用）。
- 添加 `<link rel="canonical">`、Open Graph 标签、Twitter 标签。
- 把 meta description 从 13 个字扩充到 ~70-80 个中文字符。
- 把 7 个 Google Fonts 改为非阻塞加载（实际均被 FontSelector 用作可选导出字体，不能删除）。

---

## 技术 SEO 发现

### 🔴 1. 纯客户端渲染 — HTML Body 为空
- **问题：** `public/index.html` 只输出 `<div id="root"></div>` + `<noscript>`。所有内容（H1、功能列表、价值主张）都靠 JS 渲染。
- **影响：** **高。** Googlebot 虽然会渲染 JS，但：(a) 索引有延迟（进入渲染队列）；(b) 对不执行 JS 的爬虫（部分社交抓取器、Bing 较慢）无内容可见；(c) 最大内容绘制依赖 JS 执行，LCP/INP 受损。
- **证据：** `curl https://feishu2wx.wangruofeng007.com/` 返回的内容只有 `<noscript>You need to enable JavaScript to run this app.</noscript>` 和空的 `#root`。
- **修复：** 迁移到支持预渲染的框架（Next.js、Astro、Vite SSR）**或**在 `index.html` 中加入静态 HTML 兜底，把营销落地页内容（H1、功能要点、截图）直接烘焙进去。对于工具站而言，一个有可抓取文案的真实落地页是 SEO 杠杆最大的一步。
- **优先级：** 1 / 高（阶段 3）

### 🔴 2. 重复内容 — 两份部署，无 canonical
- **问题：** 两个部署的 `<title>` 和 `<meta description>` 完全一致：
  - `https://feishu2wx.wangruofeng007.com/`
  - `https://blog.wangruofeng007.com/feishu2wx/`（GitHub Pages 自定义域名；裸域名 `wangruofeng.github.io/feishu2wx/` 会 301 跳转至此）
- **影响：** **高。** Google 会自行挑选一个 canonical，并压制另一个；你失去对排名 URL 的控制权，且链接权重被分散。
- **证据：** 两个线上响应中均未出现 `<link rel="canonical">` 标签（grep 两个响应均无结果）。
- **修复：** 决定主域名（很可能是短自定义域名 `feishu2wx.wangruofeng007.com`）。在 `index.html` 中加上 `<link rel="canonical" href="https://feishu2wx.wangruofeng007.com/" />`。Search Console 中只注册主域名。
- **优先级：** 1 / 高（阶段 1）

### 🔴 3. 缺失 sitemap.xml
- **问题：** `https://feishu2wx.wangruofeng007.com/sitemap.xml` → **404**。`blog.wangruofeng007.com/sitemap.xml` 是 Hexo 博客的 sitemap，**不**包含 `/feishu2wx/` 路径。
- **影响：** **高**（影响抓取发现速度）；Google 只能通过外链来发现该 URL。
- **证据：** `curl -sI .../sitemap.xml` → `HTTP/2 404`。
- **修复：** 创建 `public/sitemap.xml`。
- **优先级：** 2 / 高（阶段 1）

### 🟠 4. robots.txt 缺失 / 仅为通用模板
- **问题：** 项目没有自建的 `robots.txt`。Cloudflare 当前服务的是通用 "content signals" 模板（无 `Sitemap:` 指令，无 `User-agent` allow 规则）。
- **影响：** **中。** 没有 sitemap 引用；将来页面增多后会出现抓取预算问题。
- **修复：** 添加 `public/robots.txt`。
- **优先级：** 3 / 中（阶段 1）

### 🟠 5. Core Web Vitals 风险 — 阻塞渲染字体 + 5.1 MB JS
- **问题：**
  - **7 个独立的 Google Fonts `<link>` 样式表**，全部阻塞渲染。这些字体实际被 `FontSelector.tsx` / `wechatCopy.ts` 用作**可选导出字体**，不能删除，但可改为非阻塞加载。
  - `build/static/js/main.*.js` = **1.4 MB**；所有 JS 总计 = **5.1 MB**。
- **影响：** **高**（LCP/INP）。每个 `fonts.googleapis.com` 的阻塞 CSS 请求都为首屏增加一次网络往返。
- **修复：** 把 Google Fonts 改为非阻塞加载（`media="print" onload="..."` 模式）；保留功能完整。
- **优先级：** 2 / 高（阶段 1）

### 🟠 6. `<head>` 中引用的资源缺失 → 404
- **问题：** `index.html` 引用了 `<link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png">` 和 `<link rel="manifest" href="%PUBLIC_URL%/manifest.json">`，但这两个文件在 `public/` 中都不存在。
- **影响：** **中低。** 每次页面加载都产生 404。
- **修复：** 用 `logo.svg` 生成 `logo192.png`/`logo512.png`，创建 `public/manifest.json`。
- **优先级：** 3 / 中（阶段 1）

---

## 页面 SEO 发现

### 🔴 7. 无 Open Graph / Twitter Card 标签
- **问题：** 完全没有 `og:*` 或 `twitter:*` 标签。任何地方都没有社交分享预览图。
- **影响：** **高**（影响站外分发）。
- **修复：** 添加 OG / Twitter 标签 + 制作 1200×630 `og-cover.png`。
- **优先级：** 2 / 高（阶段 2）

### 🟠 8. Meta Description 过短
- **问题：** `"飞书文档转微信公众号排版工具"` — 约 13 个中文字符。目标是 ~70–80 个中文字符。
- **修复：** 扩充为完整功能描述。
- **优先级：** 3 / 中（阶段 2）

### 🟠 9. 无结构化数据（JSON-LD）
- **问题：** 无 `WebApplication` schema。
- **修复：** 添加 JSON-LD `WebApplication`。
- **优先级：** 4 / 中（阶段 2）

### 🟢 10. Title 标签 — 可接受，可更紧凑
- **问题：** `<title>飞书文档 → 微信公众号排版神器</title>` — 可见字符约 17 个。箭头符号仅是装饰。
- **优先级：** 5 / 低

### 🟢 11. 源码中无可抓取的 H1 / 内容
- 同 #1，烘焙落地页内容到静态 HTML。
- **优先级：** 1 / 高（阶段 3）

---

## 内容质量评估

### 🟠 12. 无可抓取的营销内容
- 工具本身功能完备，但缺少面向搜索引擎的营销落地页。
- **修复（中期）：** 构建 `/features`、`/tutorial`、`/faq` 内容集群。（阶段 3）

### 🟢 13. E-E-A-T — 有限但对工具站可接受
- 可选：添加 `/about` 页链接到 GitHub 仓库和主站。

---

## 分优先级的行动计划

### 阶段 1 — 关键修复（本周）
1. ✅ 在 `public/index.html` 添加 canonical 标签
2. ✅ 创建 `public/robots.txt`
3. ✅ 创建 `public/sitemap.xml`
4. ✅ 修复 404：生成 `logo192.png` / `logo512.png` + 创建 `public/manifest.json`
5. ✅ 把 7 个 Google Fonts 改为非阻塞加载

### 阶段 2 — 高影响改进（未来 2 周）
6. 添加 Open Graph + Twitter Card 标签 + `og-cover.png`
7. 扩充 meta description 到 ~70-80 个中文字符
8. 添加 JSON-LD `WebApplication` 结构化数据
9. 在 Search Console 注册主域、检查 canonical 解析、申请索引

### 阶段 3 — 战略级（1-2 个月）
10. 预渲染落地页（SSR/SSG 或静态 HTML 烘焙 H1/功能/截图）
11. 构建内容集群（`/tutorial`、`/features`、`/faq`、`/blog`）
12. 减小主 JS 包（1.4 MB）

### 长期
13. 通过 GitHub README、开源榜单、中文开发者社区（掘金、V2EX、少数派）获取外链
14. 做对比页（`/feishu2wx-vs-mdnice`）捕获"替代品"搜索意图

---

## 工具局限性说明

`curl` 对 `robots.txt`、`sitemap.xml`、canonical/OG 标签、响应头、404 的验证是可靠的。对于结构化数据，`curl` 会漏掉 JS 注入的 JSON-LD；但既然静态 `index.html` 源码中也没有 JSON-LD，相关结论仍成立。修复完成后请用 [Rich Results Test](https://search.google.com/test/rich-results) 复查。Core Web Vitals 数值请在 [PageSpeed Insights](https://pagespeed.web.dev/) 查看。

---

## 执行进度（2026-07-19）

### ✅ 已完成 — 阶段 1（关键修复）

| 改动 | 文件 | 说明 |
|------|------|------|
| canonical 标签 | `public/index.html` | 声明主域为权威 URL，解决两份部署的重复内容问题 |
| Google Fonts 非阻塞加载 | `public/index.html` | 7 个字体改为 `media="print" onload` + `<noscript>` 兜底，解除首屏 LCP 阻塞（注：这些字体是 FontSelector 可选导出字体，不能删，只改非阻塞） |
| robots.txt | `public/robots.txt`（新建）| `Allow: /` + `Disallow: /api/` + 主域 Sitemap |
| sitemap.xml | `public/sitemap.xml`（新建）| 主域 URL，`weekly` / `priority 1.0` |
| PWA manifest | `public/manifest.json`（新建）| 相对路径 `start_url: "."` 兼容两份部署 |
| PWA 图标 | `public/logo192.png` / `logo512.png`（新建）| 从 `favicon.svg` 用 sharp 生成，修复 `<head>` 引用的 404 |
| 图标生成脚本 | `scripts/gen-icons.cjs`（新建）| 可重跑：`node scripts/gen-icons.cjs` |

### ✅ 已完成 — 阶段 2（高影响改进）

| 改动 | 文件 | 说明 |
|------|------|------|
| Open Graph 标签 | `public/index.html` | 10 个 `og:*` 标签（含 `og:image:width/height/alt`），URL 全用主域绝对路径 |
| Twitter Card 标签 | `public/index.html` | 4 个 `twitter:*` 标签，`summary_large_image` 卡片类型 |
| meta description 扩充 | `public/index.html` | 从 13 字 → 78 中文字符，覆盖核心功能关键词 |
| JSON-LD 结构化数据 | `public/index.html` | `WebApplication` + 嵌套 `Offer`（免费）+ `featureList` 8 项 + `inLanguage: zh-CN` |
| 社交预览图 | `public/og-cover.png`（新建）| 1200×630 / 87KB，蓝绿渐变 + wordmark + 标语 + 4 个功能徽章 + 域名 |
| OG 图生成脚本 | `scripts/gen-og-cover.cjs`（新建）| 可重跑：`node scripts/gen-og-cover.cjs` |

### ⏳ 剩余待办

#### 阶段 2 收尾（手动项，不涉及代码）
- [ ] 在 [Google Search Console](https://search.google.com/search-console) 注册 `feishu2wx.wangruofeng007.com`，提交 sitemap，对主域 URL 申请索引
- [ ] 在 [Bing Webmaster Tools](https://www.bing.com/webmasters) 做同样操作（同步提交 sitemap）
- [ ] 部署后用 [Rich Results Test](https://search.google.com/test/rich-results) 验证 JSON-LD `WebApplication` 通过校验
- [ ] 用线上 URL 实测社交预览图：Twitter Card Validator、微信文件传输助手、X

#### 阶段 3（战略级，1-2 个月）
- [ ] 预渲染落地页（SSR/SSG 或静态 HTML 烘焙 H1/功能/截图）— 最大解锁点
- [ ] 构建内容集群：`/tutorial`、`/features`、`/faq`、`/blog`（针对「飞书转公众号」「Markdown 排版公众号」等关键词）
- [ ] 减小主 JS 包（当前 1.4 MB），审查 eager import，确保 Mermaid 等重依赖保持懒加载

#### 长期
- [ ] 通过 GitHub README、开源工具榜单、中文开发者社区（掘金、V2EX、少数派）获取外链
- [ ] 做对比页（`/feishu2wx-vs-mdnice`）捕获"替代品"搜索意图
