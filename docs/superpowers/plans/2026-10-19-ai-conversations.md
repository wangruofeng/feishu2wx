# AI 多会话实施计划

> 执行方式：当前会话按步骤执行，使用 executing-plans 技能。

**Goal:** 按已确认设计提供本地多会话隔离和每条回复的模型来源快照。
**Architecture:** 独立会话存储模块负责校验和迁移，React hook 按会话 ID 更新状态，Panel 按会话和回复 ID 绑定异步任务。
**Tech Stack:** React 18、TypeScript、localStorage、CRA Jest。
**Spec:** docs/superpowers/specs/2026-10-19-ai-conversations-design.md

## 约束

- 共用编辑器文章、供应商配置和密钥；不新增云端聊天同步。
- 每会话落盘最近 20 条消息；附件正文、图片和请求运行状态不落盘。
- 无效模型不得静默替换；旧回复来源不猜测。
- 流式生成、附件读取绑定发起会话，删除后迟到结果不能复活会话。

## 步骤

- [x] 新增 src/utils/aiConversations.ts 与测试：会话结构、刷新恢复、旧数据迁移、失败提示、来源快照校验。迁移标记采用成功写入的新结构，失败保留旧键。
- [x] 新增 src/components/ai/useAiConversations.ts：同步 ref 更新防闭包丢失，按 ID patch；新建/选择/删除/重命名；持久化排除实时流与附件；卸载取消所有任务。
- [x] 修改 AiChatPanel.tsx：替换全局消息、输入、输入历史和模型为会话状态；每轮固定控制器和回复 ID；只向后端传该会话上下文；无效模型提示，异步附件固定会话 ID。
- [x] 新增 AiConversationBar.tsx：会话列表入口、新建、切换、重命名、删除；使用项目 Button 和 token，兼容窄屏。
- [x] 修改 AiMessageBubble.tsx 与 CSS：显示不可变供应商与模型来源，流式与完成态一致。
- [x] 添加组件测试：A/B 模型、草稿、输入历史、并发流、停止/删除和模型不可用隔离；旧有设置回归。
- [x] 验证 Jest、类型检查、build、cf:check、浏览器交互；更新 usage 与 CLAUDE 文档。

执行期间不自动提交现有混合改动；交付已验证的工作区结果。

## 验证结果

297 项前端测试通过；CI 生产构建无警告通过；TypeScript 检查与 Cloudflare Functions 编译通过。真实浏览器通过 localhost:3100 和临时本地上游验证会话 A/B 各自使用不同模型、流式期间切换、刷新恢复及 390px 窄屏布局。测试上游不使用真实供应商或密钥。自查确认所有异步消息与附件更新以会话 ID 定位，已删除会话的迟到结果被忽略。
