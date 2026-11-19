import type { FilterTheme } from '../rendering/GwenFrameRenderer'

/**
 * Extracts dominant theme colors from an Image or Canvas element
 */
export async function extractDominantTheme(imageSrc: string): Promise<FilterTheme> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(getDefaultTheme())

        // Small thumbnail sampling
        canvas.width = 64
        canvas.height = 64
        ctx.drawImage(img, 0, 0, 64, 64)

        const imgData = ctx.getImageData(0, 0, 64, 64).data
        let rSum = 0, gSum = 0, bSum = 0, total = 0
        const colorBuckets: { [key: string]: number } = {}

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i]
          const g = imgData[i + 1]
          const b = imgData[i + 2]
          const a = imgData[i + 3]

          if (a < 128) continue
          // Skip pure black and pure white for dominant chroma
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          if (max - min < 20 && (max > 220 || min < 30)) continue

          rSum += r
          gSum += g
          bSum += b
          total++

          // Quantize to find vibrant peak
          const qr = Math.round(r / 32) * 32
          const qg = Math.round(g / 32) * 32
          const qb = Math.round(b / 32) * 32
          const key = `${qr},${qg},${qb}`
          colorBuckets[key] = (colorBuckets[key] || 0) + 1
        }

        if (total === 0) return resolve(getDefaultTheme())

        // Find most frequent vibrant bucket
        let maxCount = 0
        let bestKey = ''
        for (const [k, count] of Object.entries(colorBuckets)) {
          if (count > maxCount) {
            maxCount = count
            bestKey = k
          }
        }

        let primaryHex = '#e91e8c'
        if (bestKey) {
          const [br, bg, bb] = bestKey.split(',').map(Number)
          primaryHex = rgbToHex(br, bg, bb)
        } else {
          primaryHex = rgbToHex(Math.round(rSum / total), Math.round(gSum / total), Math.round(bSum / total))
        }

        // Secondary & Accent colors derived from primary
        const secondaryHex = adjustColor(primaryHex, 35)
        const accentHex = getComplementaryOrAccent(primaryHex)

        resolve({
          primary: primaryHex,
          secondary: secondaryHex,
          accent: accentHex,
        })
      } catch (err) {
        console.warn('Color extraction error:', err)
        resolve(getDefaultTheme())
      }
    }
    img.onerror = () => resolve(getDefaultTheme())
  })
}

function getDefaultTheme(): FilterTheme {
  return {
    primary: '#e91e8c',
    secondary: '#c084fc',
    accent: '#00f0ff',
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toH = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${toH(r)}${toH(g)}${toH(b)}`
}

function adjustColor(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount)
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount)
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount)
  return rgbToHex(r, g, b)
}

function getComplementaryOrAccent(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  
  // If dominant is reddish/magenta, accent is cyan/electric blue
  if (r > g && r > b) {
    return '#00f0ff'
  }
  // If dominant is dark/black/batman, accent is gold/yellow
  if (r < 60 && g < 60 && b < 60) {
    return '#ffd700'
  }
  // Otherwise high-contrast neon magenta or cyan
  return '#e91e8c'
}

