// 一次性脚本：生成 og-cover.png（1200×630 社交分享预览图）
// 用法：node scripts/gen-og-cover.cjs
// 依赖：sharp（已在 package.json dependencies 中）
//
// 设计：白底 + 左侧蓝绿渐变装饰条 + 居中 feishu2wx logo + 标语 + 域名
// 配色与 logo.svg / favicon.svg 保持一致
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

// 内嵌 feishu2wx wordmark（取自 logo.svg 的文字部分，简化）
const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${WIDTH}" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#F5FBFD"/>
      <stop offset="1" stop-color="#EAF7F1"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#10BCE2"/>
      <stop offset="0.5" stop-color="#27DDA8"/>
      <stop offset="1" stop-color="#1DC869"/>
    </linearGradient>
    <linearGradient id="wordBlue" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#31B8FF"/>
      <stop offset="1" stop-color="#128BEA"/>
    </linearGradient>
    <linearGradient id="wordGreen" x1="0" y1="0" x2="400" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#42CE73"/>
      <stop offset="1" stop-color="#159A4E"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- 左侧装饰条 -->
  <rect x="0" y="0" width="14" height="${HEIGHT}" fill="url(#accent)"/>

  <!-- 右下装饰圆弧 -->
  <circle cx="${WIDTH}" cy="${HEIGHT}" r="320" fill="#10BCE2" opacity="0.06"/>
  <circle cx="${WIDTH}" cy="${HEIGHT}" r="200" fill="#1DC869" opacity="0.08"/>

  <!-- wordmark -->
  <g font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif">
    <text x="100" y="250" font-size="92" font-weight="800" letter-spacing="-3" fill="#0E1A27">feishu<tspan fill="url(#wordBlue)">2</tspan><tspan fill="url(#wordGreen)">wx</tspan></text>
  </g>

  <!-- 中文标语 -->
  <text x="102" y="330" font-family="'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', Arial, sans-serif" font-size="52" font-weight="600" fill="#0E1A27">飞书文档 → 微信公众号排版工具</text>

  <!-- 副标语 -->
  <text x="102" y="400" font-family="'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', Arial, sans-serif" font-size="30" font-weight="400" fill="#4A6066">粘贴飞书 HTML 或编写 Markdown · 实时预览 · 一键复制 / 推送草稿箱</text>

  <!-- 功能点徽章 -->
  <g font-family="'PingFang SC', 'Microsoft YaHei', Arial, sans-serif" font-size="22" font-weight="500">
    <g transform="translate(102 460)">
      <rect x="0" y="0" width="148" height="40" rx="20" fill="#E4F5FA" stroke="#10BCE2"/>
      <text x="74" y="26" text-anchor="middle" fill="#0E7A92">4 种主题</text>
    </g>
    <g transform="translate(262 460)">
      <rect x="0" y="0" width="190" height="40" rx="20" fill="#E4F5FA" stroke="#10BCE2"/>
      <text x="95" y="26" text-anchor="middle" fill="#0E7A92">代码语法高亮</text>
    </g>
    <g transform="translate(466 460)">
      <rect x="0" y="0" width="172" height="40" rx="20" fill="#E5F6EE" stroke="#1DC869"/>
      <text x="86" y="26" text-anchor="middle" fill="#0E6B37">Mermaid 图表</text>
    </g>
    <g transform="translate(652 460)">
      <rect x="0" y="0" width="148" height="40" rx="20" fill="#E5F6EE" stroke="#1DC869"/>
      <text x="74" y="26" text-anchor="middle" fill="#0E6B37">脚注 / 任务</text>
    </g>
  </g>

  <!-- 域名 -->
  <text x="102" y="570" font-family="Inter, ui-sans-serif, Arial, sans-serif" font-size="24" font-weight="500" fill="#6D8D96">feishu2wx.wangruofeng007.com</text>
</svg>`;

const out = path.join(__dirname, '..', 'public', 'og-cover.png');

sharp(Buffer.from(svg), { density: 144 })
  .resize(WIDTH, HEIGHT)
  .png()
  .toFile(out)
  .then(() => {
    console.log(`✓ generated ${path.relative(process.cwd(), out)} (${WIDTH}x${HEIGHT})`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
