# Implementation Plan: AI 文本附件跨协议兼容

## Overview

将 Markdown、JSON、CSV 等文本附件变为三种上游协议都能读取的稳定文本上下文；图片输入维持现有多模态行为。

## Architecture Decisions

- 文本附件使用当前请求内的附件封套文本，作为跨供应商的基线路径。
- 只有图片存在时才使用协议特定的内容数组；文本附件单独发送时一律使用字符串。
- 当前会话内的历史文本附件继续参与后续请求；恢复后的无正文附件不回传。

## Task List

### Phase 1: 协议编码回归保护

- [x] Task 1: 为附件封套和三种协议的请求体添加失败测试。
  - 验收：纯文本附件生成字符串；混合图片生成正确内容块；文件名与正文存在。
  - 验证：`CI=true npm test -- --runInBand server/lib/ai-handler.test.ts`
  - 依赖：无。

### Phase 2: 最小后端适配

- [x] Task 2: 修改上游请求构造，使无图片文本附件走字符串，图片混合请求保持对应协议数组。
  - 验收：三个协议全部通过 Task 1 测试，现有图片行为不变。
  - 验证：Task 1 focused test。
  - 依赖：Task 1。

- [x] Task 3: 扩展当前会话的历史序列化，使含正文的文本附件在下一轮继续进入模型上下文；持久化恢复后不重传正文。
  - 验收：两轮请求保留内存附件；恢复消息不会发送空正文附件。
  - 验证：`CI=true npm test -- --runInBand src/utils/aiChat.test.js server/lib/ai-handler.test.ts`
  - 依赖：Task 2。

### Checkpoint: Complete

- [x] Focused tests pass.
- [x] `CI=true npm test -- --runInBand` passes.
- [x] `npm run build` succeeds.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| 兼容服务拒绝 content 数组 | 纯文本附件强制使用字符串。 |
| 历史附件导致请求过大 | 复用后端已有单文件与总字符限制。 |
| 刷新后错误声称仍有附件内容 | 持久化只存文件元数据，恢复消息不回传附件正文。 |
