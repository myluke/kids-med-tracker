# PWA 图标

请在此目录放置以下图标文件：

- `icon-192.png` - 192x192 像素
- `icon-512.png` - 512x512 像素

## 快速生成图标

可以使用在线工具生成：
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

或使用以下代码在本地生成（需要 Node.js）：

```javascript
// generate-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');

const sizes = [192, 512];
const emoji = '🏥';

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, size, size);
  
  // Emoji
  ctx.font = `${size * 0.6}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size/2, size/2);
  
  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}.png`, buffer);
  console.log(`Generated icon-${size}.png`);
});
```

运行：
```bash
npm install canvas
node generate-icons.js
```
