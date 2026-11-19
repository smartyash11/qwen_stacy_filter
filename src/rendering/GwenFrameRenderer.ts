import type { FaceLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import type { HandFrameCorners } from '../tracking/HandTracker'

export type DeviceMode = 'laptop' | 'mobile_portrait' | 'mobile_landscape'
export type FilterOrientationType = 'landscape' | 'portrait'

export interface ARSettings {
  autoFaceTrack: boolean
  maskSize: number
  costumeFit: number
  horizontalOffset: number
  glowStrength: number
  comicStrength: number
  filterRotation: number
}

export interface FilterTheme {
  primary: string
  secondary: string
  accent: string
}

export interface FilterEntry {
  id: string
  name: string
  character?: string
  src: string
  thumb?: string
  theme: FilterTheme
  orientation: FilterOrientationType // 'landscape' for Laptop / Mobile Landscape, 'portrait' for Mobile Portrait
  idealResolution: string           // e.g. "1920x1080 (16:9)" or "1080x1920 (9:16)"
  faceCenterX: number
  faceCenterY: number
  faceFraction: number
}

export const PRESET_FILTERS: FilterEntry[] = [
  // ─── LAPTOP / LANDSCAPE ORIENTATION (16:9 Wide) ───
  {
    id: 'gwen_unmasked',
    name: 'Gwen Blonde',
    character: 'Spider-Gwen',
    src: '/assets/gwen_unmasked.jpg?v=7',
    theme: { primary: '#e91e8c', secondary: '#c084fc', accent: '#00f0ff' },
    orientation: 'landscape',
    idealResolution: '1920x1080 (16:9 Landscape)',
    faceCenterX: 0.50,
    faceCenterY: 0.40,
    faceFraction: 0.28,
  },
  {
    id: 'gwen_masked',
    name: 'Gwen Masked (Wide)',
    character: 'Spider-Gwen',
    src: '/assets/gwen_masked.jpg?v=7',
    theme: { primary: '#e91e8c', secondary: '#ff60b0', accent: '#00f0ff' },
    orientation: 'landscape',
    idealResolution: '1920x1080 (16:9 Landscape)',
    faceCenterX: 0.50,
    faceCenterY: 0.42,
    faceFraction: 0.29,
  },
  {
    id: 'catwoman_dark',
    name: 'Catwoman Dark',
    character: 'Catwoman',
    src: '/assets/catwoman_dark.png?v=7',
    theme: { primary: '#0a0a14', secondary: '#9d4edd', accent: '#a8dadc' },
    orientation: 'landscape',
    idealResolution: '1920x1080 (16:9 Landscape)',
    faceCenterX: 0.50,
    faceCenterY: 0.42,
    faceFraction: 0.29,
  },
  {
    id: 'spidergwen_comic',
    name: 'Spider-Verse Wide',
    character: 'Spider-Gwen',
    src: '/assets/spidergwen_comic.jpg?v=7',
    theme: { primary: '#e91e8c', secondary: '#c084fc', accent: '#38bdf8' },
    orientation: 'landscape',
    idealResolution: '1920x1080 (16:9 Landscape)',
    faceCenterX: 0.50,
    faceCenterY: 0.44,
    faceFraction: 0.30,
  },
  {
    id: 'spidergwen_pink',
    name: 'Gwen Neon Splash',
    character: 'Spider-Gwen',
    src: '/assets/spidergwen_pink.jpg?v=7',
    theme: { primary: '#e91e8c', secondary: '#ff007f', accent: '#00ffff' },
    orientation: 'landscape',
    idealResolution: '1920x1080 (16:9 Landscape)',
    faceCenterX: 0.50,
    faceCenterY: 0.42,
    faceFraction: 0.28,
  },

  // ─── MOBILE / PORTRAIT ORIENTATION (9:16 Vertical) ───
  {
    id: 'spidergwen_mask',
    name: 'Gwen Mask (Mobile)',
    character: 'Spider-Gwen',
    src: '/assets/spidergwen_mask.jpg?v=7',
    theme: { primary: '#e91e8c', secondary: '#ff60b0', accent: '#00f0ff' },
    orientation: 'portrait',
    idealResolution: '1080x1920 (9:16 Portrait)',
    faceCenterX: 0.50,
    faceCenterY: 0.38,
    faceFraction: 0.32,
  },
  {
    id: 'batgirl_full',
    name: 'Batgirl Cowl (Mobile)',
    character: 'Batgirl',
    src: '/assets/batgirl_full.jpg?v=7',
    theme: { primary: '#1a1a2e', secondary: '#c084fc', accent: '#ffd700' },
    orientation: 'portrait',
    idealResolution: '1080x1920 (9:16 Portrait)',
    faceCenterX: 0.50,
    faceCenterY: 0.44,
    faceFraction: 0.31,
  },
  {
    id: 'batgirl_red',
    name: 'Batgirl Red (Mobile)',
    character: 'Batgirl',
    src: '/assets/batgirl_red.jpg?v=7',
    theme: { primary: '#111827', secondary: '#dc2626', accent: '#fbbf24' },
    orientation: 'portrait',
    idealResolution: '1080x1920 (9:16 Portrait)',
    faceCenterX: 0.50,
    faceCenterY: 0.42,
    faceFraction: 0.31,
  },
  {
    id: 'spidergwen_neon',
    name: 'Gwen Cyber Neon (Mobile)',
    character: 'Spider-Gwen',
    src: '/assets/spidergwen_neon.jpg?v=7',
    theme: { primary: '#e91e8c', secondary: '#00f0ff', accent: '#ffff00' },
    orientation: 'portrait',
    idealResolution: '1080x1920 (9:16 Portrait)',
    faceCenterX: 0.50,
    faceCenterY: 0.38,
    faceFraction: 0.32,
  },
]

interface Particle {
  t: number
  speed: number
  size: number
  alpha: number
  life: number
  maxLife: number
  color: string
}

export class GwenFrameRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private currentFilter: FilterEntry = PRESET_FILTERS[0]
  private filterImg: HTMLImageElement | null = null

  private smoothBox = {
    minX: 0.25, maxX: 0.75, minY: 0.2, maxY: 0.5,
    angle: 0, active: false, alpha: 0
  }

  // Dynamic user face tracking state
  private smoothFace = {
    x: 0.5,
    y: 0.35,
    width: 0.2,
    height: 0.25,
    active: false
  }

  private particles: Particle[] = []
  private time = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2D context')
    this.ctx = ctx
    this.loadFilter(PRESET_FILTERS[0])
    this.spawnParticles(50)
  }

  public setFilter(entry: FilterEntry) {
    this.currentFilter = entry
    this.filterImg = null
    this.loadFilter(entry)
  }

  public getActiveFilter(): FilterEntry {
    return this.currentFilter
  }

  private loadFilter(entry: FilterEntry) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = entry.src
    img.onload = () => { this.filterImg = img }
    img.onerror = () => { console.warn('Failed loading image:', entry.src) }
  }

  private spawnParticles(count: number) {
    const { primary, secondary, accent } = this.currentFilter.theme
    const colors = [primary, secondary, accent, '#ffffff']
    for (let i = 0; i < count; i++) {
      this.particles.push({
        t: Math.random(),
        speed: 0.0003 + Math.random() * 0.0006,
        size: 1.5 + Math.random() * 3,
        alpha: 0,
        life: Math.random(),
        maxLife: 0.4 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
  }

  private updateParticles() {
    for (const p of this.particles) {
      p.t = (p.t + p.speed) % 1
      p.life += 0.015
      if (p.life > p.maxLife) {
        p.life = 0
        p.maxLife = 0.4 + Math.random() * 0.6
      }
      const lifeRatio = p.life / p.maxLife
      p.alpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1
    }
  }

  private drawParticlesOnPerimeter(rx: number, ry: number, bW: number, bH: number) {
    const { ctx } = this
    const perimeter = 2 * (bW + bH)

    for (const p of this.particles) {
      const dist = p.t * perimeter
      let px: number, py: number

      if (dist < bW) {
        px = rx + dist; py = ry
      } else if (dist < bW + bH) {
        px = rx + bW; py = ry + (dist - bW)
      } else if (dist < 2 * bW + bH) {
        px = rx + bW - (dist - bW - bH); py = ry + bH
      } else {
        px = rx; py = ry + bH - (dist - 2 * bW - bH)
      }

      ctx.save()
      ctx.globalAlpha = p.alpha * 0.95
      ctx.shadowColor = p.color
      ctx.shadowBlur = 10
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(px, py, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  public render(
    handCorners: HandFrameCorners | null,
    face: FaceLandmarkerResult | null,
    _pose: PoseLandmarkerResult | null,
    settings: ARSettings
  ) {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height
    if (w === 0 || h === 0) return

    ctx.clearRect(0, 0, w, h)
    this.time += 0.04

    // ── 0. DIRECT LIVE FACE SCALE & PROPORTION TRACKING ──
    if (face?.faceLandmarks?.length) {
      const lm = face.faceLandmarks[0]
      const nose = lm[1], lc = lm[234], rc = lm[454]
      const le = lm[33], re = lm[263], top = lm[10], chin = lm[152]

      // Mirror-corrected X coordinate
      const rawX = 1 - nose.x
      const rawY = top.y * 0.25 + nose.y * 0.45 + chin.y * 0.30

      // Exact pixel span of human face in camera
      const cheekSpan = Math.hypot(rc.x - lc.x, rc.y - lc.y)
      const eyeSpan = Math.hypot(re.x - le.x, re.y - le.y) * 2.0
      const rawH = Math.hypot(chin.x - top.x, chin.y - top.y)
      const rawW = Math.max(cheekSpan, eyeSpan, rawH * 0.8)

      // Responsive smoothing (0.40) so when you move close or far, scaling reacts immediately
      const lr = 0.40
      this.smoothFace.x += (rawX - this.smoothFace.x) * lr
      this.smoothFace.y += (rawY - this.smoothFace.y) * lr
      this.smoothFace.width += (rawW - this.smoothFace.width) * lr
      this.smoothFace.height += (rawH - this.smoothFace.height) * lr
      this.smoothFace.active = true
    }

    // ── 1. PORTAL FRAME SMOOTHING ──
    const target = handCorners?.box
    const detected = !!handCorners

    const lsp = 0.28
    if (detected && target) {
      this.smoothBox.active = true
      this.smoothBox.alpha = Math.min(1, this.smoothBox.alpha + 0.18)
      this.smoothBox.minX += (target.minX - this.smoothBox.minX) * lsp
      this.smoothBox.maxX += (target.maxX - this.smoothBox.maxX) * lsp
      this.smoothBox.minY += (target.minY - this.smoothBox.minY) * lsp
      this.smoothBox.maxY += (target.maxY - this.smoothBox.maxY) * lsp
      this.smoothBox.angle += (target.angle - this.smoothBox.angle) * lsp
    } else {
      this.smoothBox.alpha = Math.max(0, this.smoothBox.alpha - 0.12)
      if (this.smoothBox.alpha <= 0.01) {
        this.smoothBox.active = false
        return
      }
    }

    if (!this.smoothBox.active || this.smoothBox.alpha <= 0) return

    const { primary, secondary, accent } = this.currentFilter.theme
    const glow = Math.max(0.2, settings.glowStrength)
    const pulse = Math.sin(this.time * 4) * 0.15 + 0.85

    // ── 2. RENDER L-FRAME PORTAL WINDOW ──
    const sx1 = (1 - this.smoothBox.maxX) * w
    const sx2 = (1 - this.smoothBox.minX) * w
    const sy1 = this.smoothBox.minY * h
    const sy2 = this.smoothBox.maxY * h
    const boxW = Math.max(30, sx2 - sx1)
    const boxH = Math.max(30, sy2 - sy1)
    const cx = (sx1 + sx2) / 2
    const cy = (sy1 + sy2) / 2
    const angle = -this.smoothBox.angle

    const rx = -boxW / 2
    const ry = -boxH / 2
    const radius = Math.min(18, boxH * 0.14)

    this.updateParticles()

    ctx.save()
    ctx.globalAlpha = this.smoothBox.alpha

    // CLIP WINDOW
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.roundRect(rx, ry, boxW, boxH, radius)
    ctx.clip()

    // DRAW FILTER IMAGE INSIDE CLIP
    if (this.filterImg?.complete && this.filterImg.naturalWidth > 0) {
      const f = this.currentFilter
      const iw = this.filterImg.naturalWidth
      const ih = this.filterImg.naturalHeight
      const imgAspect = iw / ih

      let drawW: number
      let drawH: number
      let targetFaceX: number
      let targetFaceY: number

      if (settings.autoFaceTrack && this.smoothFace.active) {
        // 🔴 REAL-TIME PROPORTIONAL 1:1 FACE SCALE:
        // userFacePixelWidth grows when close, shrinks when far
        const userFacePixelWidth = this.smoothFace.width * w
        const userAdjustment = 0.70 + (settings.maskSize * 0.60)
        drawW = (userFacePixelWidth / f.faceFraction) * userAdjustment
        drawH = drawW / imgAspect

        // Lock image face coordinates directly onto your real face coordinates!
        targetFaceX = this.smoothFace.x * w
        targetFaceY = this.smoothFace.y * h
      } else {
        // Manual mode
        const screenAspect = w / h
        if (screenAspect > imgAspect) {
          drawW = w * (0.8 + settings.maskSize * 0.8)
          drawH = drawW / imgAspect
        } else {
          drawH = h * (0.8 + settings.maskSize * 0.8)
          drawW = drawH * imgAspect
        }
        targetFaceX = w / 2 + (settings.horizontalOffset - 0.5) * w * 0.5
        targetFaceY = h * 0.42 + (settings.costumeFit - 0.5) * h * 0.6
      }

      const imgLeft = targetFaceX - drawW * f.faceCenterX
      const imgTop  = targetFaceY - drawH * f.faceCenterY

      ctx.save()
      // Counter-rotate inside hand window so background image stays upright with body
      ctx.rotate(-angle)
      ctx.drawImage(this.filterImg, -cx + imgLeft, -cy + imgTop, drawW, drawH)

      // Comic / chromatic overlay
      if (settings.comicStrength > 0.05) {
        ctx.fillStyle = `rgba(${hexToRgb(primary)}, ${settings.comicStrength * 0.14})`
        ctx.fillRect(-w, -h, w * 2, h * 2)
        ctx.fillStyle = `rgba(${hexToRgb(accent)}, ${settings.comicStrength * 0.08})`
        ctx.fillRect(-w, 0, w * 2, 2)
      }
      ctx.restore()
    } else {
      const grad = ctx.createLinearGradient(rx, ry, rx + boxW, ry + boxH)
      grad.addColorStop(0, primary)
      grad.addColorStop(1, secondary)
      ctx.fillStyle = grad
      ctx.fillRect(rx, ry, boxW, boxH)
    }

    // Interior glow rim
    const ePulse = Math.sin(this.time * 7) * 0.5 + 0.5
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + ePulse * 0.3})`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore() // End clip

    // ── 3. MAGICAL DYNAMIC NEON EDGES MATCHED TO CURRENT FILTER ──
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    // Outer Aura
    ctx.shadowColor = primary
    ctx.shadowBlur = 38 * glow * pulse
    ctx.strokeStyle = `rgba(${hexToRgb(primary)}, 0.45)`
    ctx.lineWidth = 14
    ctx.beginPath(); ctx.roundRect(rx, ry, boxW, boxH, radius); ctx.stroke()

    // Secondary Vivid Glow
    ctx.shadowColor = secondary
    ctx.shadowBlur = 22 * glow
    ctx.strokeStyle = `rgba(${hexToRgb(secondary)}, 0.75)`
    ctx.lineWidth = 6
    ctx.beginPath(); ctx.roundRect(rx, ry, boxW, boxH, radius); ctx.stroke()

    // Crisp Inner Neon Tube
    ctx.shadowColor = accent
    ctx.shadowBlur = 10 * glow
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.roundRect(rx, ry, boxW, boxH, radius); ctx.stroke()

    // Animated dashed cyber tech lines
    ctx.save()
    ctx.shadowBlur = 0
    ctx.strokeStyle = `rgba(${hexToRgb(accent)}, ${0.5 + pulse * 0.4})`
    ctx.lineWidth = 1.5
    const dashOffset = (this.time * 60) % 24
    ctx.setLineDash([8, 16])
    ctx.lineDashOffset = -dashOffset
    ctx.beginPath(); ctx.roundRect(rx - 4, ry - 4, boxW + 8, boxH + 8, radius + 4); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // L-Corner brackets
    const bLen = Math.min(42, boxH * 0.40, boxW * 0.30)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'miter'
    ctx.lineWidth = 5
    ctx.shadowColor = primary
    ctx.shadowBlur = 20
    ctx.strokeStyle = primary
    for (const [ax, ay, bx, by, ex, ey] of cornerBrackets(rx, ry, boxW, boxH, bLen)) {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke()
    }
    // Crisp white pass on brackets
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 8
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    for (const [ax, ay, bx, by, ex, ey] of cornerBrackets(rx, ry, boxW, boxH, bLen)) {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke()
    }

    // Corner diamond gems
    for (const [gx, gy] of cornerPoints(rx, ry, boxW, boxH)) {
      drawDiamond(ctx, gx, gy, 7, accent)
    }

    // Perimeter sparkle particles
    this.drawParticlesOnPerimeter(rx, ry, boxW, boxH)

    ctx.restore()
    ctx.restore()
  }

  public dispose() {
    this.filterImg = null
    this.particles = []
  }
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) || 0
  const g = parseInt(h.substring(2, 4), 16) || 0
  const b = parseInt(h.substring(4, 6), 16) || 0
  return `${r},${g},${b}`
}

function cornerBrackets(rx: number, ry: number, bW: number, bH: number, len: number): number[][] {
  const p = 3
  return [
    [rx - p, ry + len, rx - p, ry - p, rx + len, ry - p],
    [rx - p, ry + bH - len, rx - p, ry + bH + p, rx + len, ry + bH + p],
    [rx + bW - len, ry - p, rx + bW + p, ry - p, rx + bW + p, ry + len],
    [rx + bW + p, ry + bH - len, rx + bW + p, ry + bH + p, rx + bW - len, ry + bH + p],
  ]
}

function cornerPoints(rx: number, ry: number, bW: number, bH: number): number[][] {
  const p = 3
  return [
    [rx - p, ry - p],
    [rx + bW + p, ry - p],
    [rx - p, ry + bH + p],
    [rx + bW + p, ry + bH + p],
  ]
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + size * 0.6, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - size * 0.6, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
