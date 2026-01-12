/**
 * 颜色转换工具函数
 * 用于孩子配色系统
 */

function clampByte(n) {
  return Math.max(0, Math.min(255, n))
}

/**
 * 十六进制颜色转 RGB
 */
export function hexToRgb(hex) {
  const value = hex.replace('#', '').trim()
  if (value.length !== 6) return null
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b }
}

/**
 * RGB 转十六进制颜色
 */
export function rgbToHex({ r, g, b }) {
  return (
    '#' +
    clampByte(r).toString(16).padStart(2, '0') +
    clampByte(g).toString(16).padStart(2, '0') +
    clampByte(b).toString(16).padStart(2, '0')
  )
}

/**
 * 将颜色变亮
 * @param {string} hex - 十六进制颜色
 * @param {number} ratio - 变亮比例，默认 0.85
 */
export function lightenHex(hex, ratio = 0.85) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#FFFFFF'
  return rgbToHex({
    r: Math.round(rgb.r + (255 - rgb.r) * ratio),
    g: Math.round(rgb.g + (255 - rgb.g) * ratio),
    b: Math.round(rgb.b + (255 - rgb.b) * ratio)
  })
}
