// 一次性脚本：从 public/favicon.svg 生成 PWA 所需的 logo192.png / logo512.png
// 用法：node scripts/gen-icons.cjs
// 依赖：sharp（已在 package.json dependencies 中）
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
const svg = fs.readFileSync(svgPath);

const sizes = [192, 512];

(async () => {
  for (const size of sizes) {
    const out = path.join(__dirname, '..', 'public', `logo${size}.png`);
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✓ generated ${path.relative(process.cwd(), out)} (${size}x${size})`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
