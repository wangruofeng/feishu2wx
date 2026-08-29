# 设计文档：AI 文本附件跨协议兼容

- 日期：2026-08-29
- 状态：待实现
- 范围：AI 聊天中的 Markdown、JSON、CSV、TSV 与其他受支持文本附件

## 目标

让文本附件在 Chat Completions、Anthropic Messages 与 Responses 三种上游协议、以及兼容这些协议的多家供应商中稳定可读。图片多模态输入维持现有行为。

## 决策

1. 文本附件的跨供应商基线是“附件封套文本”，而不是原生文件上传。
2. 仅有文本附件时，三种协议一律使用字符串内容；不发送内容数组。
3. 图片存在时才使用协议对应的多模态内容数组；附件封套作为其中唯一文本块。
4. 当前浏览器会话中，历史消息的文本附件继续参与后续对话；localStorage 持久化仍剔除附件正文，刷新后不再将已剔除正文的附件作为模型上下文。
5. 不在本次改造中接入供应商专属的文件上传、`file_id`、检索或 RAG；这些能力不能作为多供应商的可靠基线。

## 数据流

```text
File → aiFiles.ts（类型、大小、UTF-8/NUL 校验）
     → AiTextAttachment { name, size, content }
     → 后端 normalizeAiAttachments()
     → buildAttachmentsBlock()（文件名、语言、内容的受限文本封套）
     → toUpstreamUserContent()
       ├─ 无图片：string
       └─ 有图片：协议对应 content blocks，内含同一封套文本
     → 上游模型
```

## 协议编码

| 情况 | Chat Completions | Anthropic Messages | Responses |
| --- | --- | --- | --- |
| 纯文本 / 文本附件 | `content: string` | `content: string` | 消息 `content: string` |
| 图片 + 文本附件 | `{type:'text',text}` + `image_url` | `{type:'text',text}` + `image` | `{type:'input_text',text}` + `input_image` |

封套文本格式：

```text
用户指令

【附件：data.json】
```json
{ "example": true }
```
```

围栏长度须避开附件正文内已有的反引号串，且总长度遵从现有附件总量限制。

## 历史与隐私

- 内存中的 `AiChatMessage.attachments` 保留正文，下一轮请求为每条带正文的用户消息重新组装附件封套。
- 持久化/恢复后正文为空的附件不回传；UI 仍可显示文件名，但不应让模型或用户误以为内容仍在上下文中。
- 图片历史行为不变。

## 验收与测试

1. `buildAttachmentsBlock()` 覆盖 Markdown、JSON、CSV、内嵌反引号和总量截断。
2. 三种协议的纯文本附件请求均断言为字符串，且含文件名和正文。
3. 三种协议的图片+文本请求均断言为正确数组，且其文本块含文件名和正文。
4. 两轮对话中，首轮上传的文本附件在第二轮请求仍存在；持久化恢复后不再发送被剔除的正文。
5. 现有图片附件与 SSE 流式测试保持通过。

## 非目标

- 不新增供应商专属文件上传设置。
- 不解析 PDF、DOCX、XLSX 或二进制格式。
- 不改变附件数量、单文件体积与总量限制，除非测试证明现有限制无法承载该流程。
