import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const sourceLogo = join(publicDir, 'logo.png')
const iconsDir = join(publicDir, 'icons')

const sizes = [192, 512]

async function generateIcons() {
  const meta = await sharp(sourceLogo).metadata()
  console.log(`源图尺寸: ${meta.width}x${meta.height}`)

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}.png`)

    await sharp(sourceLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath)

    console.log(`Generated: icon-${size}.png`)
  }
  console.log('Done!')
}

generateIcons().catch(console.error)
