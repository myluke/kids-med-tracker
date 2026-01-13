import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const sourceLogo = join(publicDir, 'logo.png')
const outputLogo = join(publicDir, 'logo-cropped.png')

// 创建圆角矩形蒙版
function createRoundedMask(size, radius) {
  return Buffer.from(`
    <svg width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>
  `)
}

async function cropLogo() {
  // 先裁剪外围纯白
  const trimmed = await sharp(sourceLogo)
    .trim({ threshold: 5 })
    .toBuffer()

  const meta = await sharp(trimmed).metadata()
  const size = meta.width
  console.log('原始尺寸: 1024x1024')
  console.log(`裁剪后尺寸: ${size}x${size}`)

  // 圆角半径约为尺寸的 25%
  const radius = Math.round(size * 0.25)
  console.log(`圆角半径: ${radius}`)

  // 用圆角蒙版裁剪四个角
  await sharp(trimmed)
    .ensureAlpha()
    .composite([{
      input: createRoundedMask(size, radius),
      blend: 'dest-in'
    }])
    .png()
    .toFile(outputLogo)

  console.log(`已保存到: ${outputLogo}`)
}

cropLogo().catch(console.error)
