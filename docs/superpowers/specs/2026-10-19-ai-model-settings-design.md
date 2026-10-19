# AI 模型配置、目录、Google 协议与 Token 用量

## 目标与参考

实现四项：模型配置导入导出、获取模型列表、Google Generative AI 原生协议、每条助手回复底部的 Token 用量。参考 a2make 的 `src/lib/provider-config.ts`、`server/model-tools.ts`、`server/protocol.ts` 与 `server/token-usage.ts`，按本项目 React、Express / Pages 和加密配置机制接入。

## 接口与行为

- 模型配置导出为 `feishu2wx-model-settings` v1，导入也接收 `asksail-model-settings` v1。全部校验成功后应用；新增模式重建 ID，完全覆盖需确认。仅接受四种聊天协议，最多 20 个供应商、每个 1000 个模型、文件 1 MiB。
- `POST /api/ai/models`：本地接收 `provider`，云端接收 `providerId`，返回 `{ models: string[] }`。登录后仅使用当前用户解密配置；浏览器不读取云端密钥。先刷新待保存配置再取目录。
- 目录分页最多 20 页，重复分页标记报错；Google 过滤非 generateContent 模型，MiMo / DeepSeek 使用官方独立目录，兼容 Google 代理的 Bearer 目录；不跟随重定向、不转发上游错误正文。获取结果追加并去重，连接变化/关闭时取消，保留并行手动编辑。
- Google 请求为 `models/{model}:streamGenerateContent?alt=sse`，`x-goog-api-key` 鉴权，`systemInstruction`、`contents`、`inlineData` 分别承载文章指令、聊天与图片。文本附件沿用现有附件文本管线，thought parts 映射为 reasoning。
- SSE 新增 `usage` 事件。四协议上游用量按累计快照去重更新；Anthropic 输入含缓存读写，Google 输出含 thoughts。供应商未返回的 total 不在服务端伪造。前端缺 total 且 input/output 完整时可相加，明确标注计算来源。
- 用量写入每条消息并随本地聊天历史保留。缺失用量显示「上游未返回用量」；缓存、推理不重复累加。停止或失败时保留已收到用量。

## 验证

前端测试覆盖配置完整校验、新增/覆盖、竞态取消、失败重试、云端先保存和用量持久化。后端覆盖四协议请求/流事件、目录分页、错误脱敏、私网拒绝、云端用户隔离和 CORS。检查 TypeScript、生产构建和 Pages Functions 打包，并以独立浏览器的本地模拟服务验证文件导入/导出、模型发现与含用量的流式回复。
