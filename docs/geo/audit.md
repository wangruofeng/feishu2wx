# feishu2wx GEO 诊断与实施报告

审查日期：2026-10-11。采用 yao-geo-page-audit 技能。范围为本地源码、首页、使用指南与 FAQ；线上抓取未成功，不将本地检查写成线上验收。

## 结论与范围

首页已有静态简介、canonical、分享标签和 WebApplication。主要缺口是静态简介会随 React 挂载消失，缺少独立帮助页。已补充永久静态指南、七组 FAQ 与编辑器入口，改善公开答案素材的发现和抽取条件。没有 AI 平台采样，不判断排名、召回或引用份额。

页面组合：首页是工具入口；一级页 guide 是产品与教程；二级页 guide/faq 是具体使用问题。目标问题为飞书转公众号、Markdown 排版、复制与推送差异、图片兼容、费用与数据流。

## 证据台账

观察（高可信）：public/index.html 的简介位于 React 根节点，挂载后被替换。独立静态 HTML 可持续显示同一正文。

观察（高可信）：robots 允许公开页面、禁止 API，并指向 sitemap；原 sitemap 只有首页。已加入两篇指南，更新时间对应本次实质改动。

官方项目材料（高可信）：README、docs/usage.md、wechatCopy.ts、wechat-worker.ts、publishApi.ts 与 CLAUDE.md 支持输入方式、内联样式输出、草稿流程与数据传输描述。

标准（高可信）：Google JavaScript SEO 指南说明并非所有机器人执行 JavaScript，初始 HTML 与可抓取链接有价值。结构化数据指南要求标记与正文一致。下面列出参考资料。

缺口：线上状态码、重定向、Cloudflare 托管 robots 策略、搜索索引、访问日志、移动端截图和 Web Vitals 尚未核验。

## 公开答案素材与内容结构

使用指南回答：工具是什么、能输入什么、如何将飞书或 Markdown 排版到公众号、免费范围、需要哪些凭证、内容会发送到哪里。

FAQ 回答：登录要求、飞书 URL 导入边界、复制与推送区别、链接适配、SVG/Mermaid/WebP 处理、发布失败排查和 AI 费用。

正文采用结论先行、功能事实 dl、操作步骤 ol 和独立问答 section，包含来源链接与真实更新时间。没有虚构用户数、性能指标、客户案例或竞品对比。

## 抓取、结构与 Schema

新增静态页面不依赖 JavaScript。使用 main/article、唯一 H1、按序 H2 和普通链接；编辑器中也提供指南入口。相对链接兼容子目录镜像。

指南 canonical 使用主域 /guide/，FAQ 使用 /guide/faq，以适配 Cloudflare Pages 的 HTML 清洁 URL。镜像继续归一到主域；部署后必须核验实际重定向。

首页 WebApplication 增加稳定实体 ID 与源码 sameAs，增加 WebSite 实体；指南使用 WebPage，FAQ 使用与可见问答一致的 FAQPage。不承诺 FAQ 富结果资格。原首页 Schema 与应用功能已有映射，不添加虚构评分。

llms.txt 只是补充导航，不替代 sitemap、robots 或正文，也不声称搜索或 AI 平台必然使用该文件。

## 移动与性能

静态指南包含 viewport、流式宽度、可换行导航与系统字体，正文不依赖第三方字体。未测量 LCP、INP、CLS，不填造分数。部署后检查 375px 手机宽度与键盘导航，并复测编辑器顶栏指南入口布局。

首页完整产品简介仍属于加载兜底；持续可见的长篇材料由独立指南承担。没有迁移框架或增加编辑器运行时依赖。

## 优先级、负责人及验收

P1：开发维护者补独立指南与 FAQ、入口和 sitemap；成本低，已实施。验收为构建产物中存在正文、链接可解析、JSON-LD 可解析且问答与正文一致。

P1：内容维护者明确免费范围、外部模型调用与草稿发布边界；成本低，已实施。验收为与实际模块和文档逐项回溯。

P2：站点维护者部署后核验首页、指南、FAQ 的 HTTP 200、canonical 与 Cloudflare 重定向，提交 sitemap；成本低，待发布后执行。

P2：运营维护者建立固定问题集，记录日期、平台、问题、回答与引用 URL；成本中，待积累真实样本。不能把单次回答作为稳定曝光效果。

## 验证与完整性自检

已执行页面结构、JSON-LD、FAQ 正文一致性和本地链接检查。生产构建通过，git diff --check 通过。报告四种格式来自同一 Markdown；质量文件记录实际检查与缺口，不以文件存在替代完整视觉验收。

八类诊断已覆盖：抓取、渲染、结构、内容、抽取、Schema、移动性能、证据质量。线上与平台效果明确保留为未验证项。

## 参考资料

- [使用的技能仓库](https://github.com/yaojingang/yao-geo-skills)
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google 结构化数据指南](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [项目源码](https://github.com/wangruofeng/feishu2wx)
