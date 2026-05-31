# WebP 图片在 Cloudflare 上的处理预研

## 当前结论

当前版本先支持本地服务端版本：

- 本地启动方式：`npm run dev`
- 后端运行环境：Node/Express
- 图片处理库：`sharp`
- 支持能力：
  - 静态 WebP 转 PNG 后上传微信。
  - 动态 WebP 转 GIF 后上传微信，并按大小限制逐级压缩。

Cloudflare Pages Functions / Workers 上的 WebP 图片处理暂不实现。原因是当前方案依赖 `sharp`，而 `sharp` 是 Node native addon，不适合作为 Cloudflare Workers runtime 内的直接依赖。

## 当前本地实现逻辑

当前图片处理入口在 `server/lib/wechat-worker.ts` 的 `processContentImages()`。

处理流程：

1. 遍历文章 HTML 中的 `<img src="...">`。
2. 下载外部图片，或解析 data URI 图片。
3. 根据 HTTP `Content-Type`、URL 后缀和文件头判断图片类型。
4. 如果不是 WebP，按原格式上传到微信 `media/uploadimg`。
5. 如果是静态 WebP，使用 `sharp` 转成 PNG 后上传。
6. 如果是动态 WebP，使用 `sharp` 转成 GIF 后上传。
7. 动态 WebP 转 GIF 时，按宽度逐级压缩：
   - `800`
   - `640`
   - `512`
   - `480`
   - `420`
   - `360`
   - `300`
8. 选择第一个小于 `1MB` 的 GIF 上传。
9. 如果压缩后仍超过微信正文图片上传限制，返回明确错误。
10. 上传成功后，将文章 HTML 中的原图片 URL 替换为微信图床 URL。

这个方案适合本地 Node 服务，因为 `sharp` 性能强、实现简单，能稳定处理静态 WebP 和动态 WebP。

## 本地和 Cloudflare 的差异

本地 `npm run dev`：

- CRA 前端运行在本地开发服务器。
- Express 后端运行在 Node.js。
- `sharp` 可以加载原生依赖并调用 libvips。
- WebP 转 PNG/GIF 可以在服务端完成。

Cloudflare Pages Functions / Workers：

- 运行在 Cloudflare Workers runtime。
- Runtime 基于 V8 和 Web 标准 API，不是完整 Node.js。
- Node.js API 兼容是子集，不等价于完整 Node 环境。
- WebAssembly 可用，但 Wasm 模块需要随 Worker 一起打包和初始化。
- `sharp` 这类 native addon 通常不能直接运行。

相关参考：

- Cloudflare Workers WebAssembly 文档：`https://developers.cloudflare.com/workers/runtime-apis/webassembly/`
- Cloudflare Workers Node.js compatibility 文档：`https://developers.cloudflare.com/workers/runtime-apis/nodejs/`
- `@jsquash/webp` 说明中提到 Cloudflare Workers 需要手动初始化 Wasm：`https://www.npmjs.com/package/@jsquash/webp`

## Cloudflare Wasm 方案设想

如果后续要让 Cloudflare Pages Functions 也支持 WebP 图片处理，可以考虑纯 Wasm/JS 方案。

目标链路：

```text
WebP bytes
  -> Wasm WebP decoder
  -> RGBA frame(s)
  -> resize / quantize
  -> PNG 或 GIF encoder
  -> 微信 uploadimg
```

静态 WebP：

```text
WebP bytes -> Wasm decode -> PNG encode -> uploadimg
```

动态 WebP：

```text
WebP bytes
  -> decode animation frames
  -> preserve frame delay / loop metadata
  -> resize each frame
  -> quantize to GIF palette
  -> encode animated GIF
  -> uploadimg
```

可能的库组合：

- WebP 解码：
  - `wasm-webp`
  - `@jsquash/webp`
- GIF 编码：
  - `gifenc`
- PNG 编码：
  - `@jsquash/png`
  - `UPNG.js`

## Wasm 方案的主要风险

### 动态 WebP 解码能力

静态 WebP 解码比较成熟；动态 WebP 需要拿到多帧数据、每帧 delay、画布尺寸、透明度和循环信息。不是所有 WebP Wasm 包都暴露完整动画 API。

### GIF 质量和体积

GIF 只有 256 色。动态 WebP 转 GIF 一定会损失颜色和透明度表现。

为了满足微信正文图上传限制，还需要降尺寸、降颜色数或丢帧。质量和体积之间需要权衡。

### Workers CPU 和内存

大动图可能包含几十帧甚至上百帧。解码、缩放、量化、重新编码都很耗 CPU 和内存。

示例：`AnimatedWebPSample.webp` 原始 WebP 约 `2.9MB`，直接转 GIF 会膨胀到约 `23MB`。当前本地 `sharp` 方案需要压到 `480px` 宽左右，才能小于 `1MB`。

在 Workers runtime 中，类似任务可能触发 CPU 时间、内存或冷启动问题，需要单独实测。

### Bundle 体积和冷启动

Wasm codec 会增加 Worker bundle 体积。Cloudflare 官方也提醒 Wasm 会让 Worker 更大，启动更慢。

### 工程复杂度

`sharp` 方案中一行可以完成的动态图片转换，Wasm 方案需要自己串联：

- WebP 解码
- 帧缩放
- 调色板量化
- GIF 编码
- 体积控制
- 错误兜底

整体复杂度明显更高。

## 建议的后续路线

不要直接替换当前本地 `sharp` 方案。后续如果要支持 Cloudflare，可以先做独立 Spike。

建议步骤：

1. 新建独立模块，例如 `server/lib/image-normalizer-wasm.ts`。
2. 定义统一接口：

```ts
interface ImageNormalizer {
  normalize(data: Uint8Array, ext: string): Promise<{
    data: Uint8Array;
    ext: 'jpg' | 'png' | 'gif';
    contentType: string;
  }>;
}
```

3. 本地 Node 环境继续使用 `sharpNormalizer`。
4. Cloudflare 环境尝试使用 `wasmNormalizer`。
5. 用固定样例测试：
   - 真实 PNG
   - 伪 PNG 但内容是 WebP
   - 静态 WebP
   - 小动态 WebP
   - 大动态 WebP，例如 Wikimedia 的 `AnimatedWebPSample.webp`
6. 记录每个样例的：
   - 转换耗时
   - 输出大小
   - 是否保留动画
   - 是否低于微信上传限制
   - Workers 本地模拟和线上运行是否一致

## 当前版本范围

当前版本不实现 Cloudflare Wasm 图片处理。

当前版本只承诺：

- `npm run dev` 本地 Node 服务端支持 WebP 图片推送。
- 静态 WebP 可以推送到微信草稿箱。
- 动态 WebP 会转为压缩后的 GIF，尽量保留动画。
- 超过微信上传限制时返回明确错误。

Cloudflare 上的 WebP 动态图处理留作后续专项。
