## Task 1: 协议编码回归保护

**Description:** 为三种协议下的文本与混合附件请求建立可观察的失败测试。

**Acceptance criteria:**
- [x] 纯文本附件以字符串送达上游。
- [x] 混合图片请求保留对应协议的图片内容块与附件文本。

**Verification:**
- [x] `npx ts-node --project server/tsconfig.json server/lib/ai-handler.test.ts`

**Dependencies:** None

## Task 2: 最小协议适配

**Description:** 按协议为文本和图片混合输入构造最小兼容请求体。

**Acceptance criteria:**
- [x] 三种协议均通过回归测试。
- [x] 未改变图片附件输入。

**Verification:**
- [x] Task 1 focused test passes.

**Dependencies:** Task 1

## Task 3: 会话历史附件

**Description:** 保持当前会话附件可用于后续追问，避免恢复后的空附件被发送。

**Acceptance criteria:**
- [x] 内存历史保留附件正文。
- [x] 持久化恢复后不发送附件正文。

**Verification:**
- [x] `CI=true npm test -- --runInBand src/utils/aiChat.test.js` and server focused test pass.

**Dependencies:** Task 2
