import * as THREE from 'three'

/**
 * Creates a procedural spider-web pattern as a Three.js CanvasTexture.
 * Renders concentric circles + radial spokes + cross-connecting threads
 * in magenta on a transparent background.
 */
export function createWebTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const cx = size / 2
  const cy = size / 2
  const maxRadius = size * 0.48
  const spokes = 12
  const rings = 8

  ctx.clearRect(0, 0, size, size)

  // Magenta line style
  ctx.strokeStyle = 'rgba(233, 30, 140, 0.85)'
  ctx.lineWidth = size * 0.008
  ctx.lineCap = 'round'

  // ── Radial spokes ───────────────────────────────────────────────────────────
  for (let s = 0; s < spokes; s++) {
    const angle = (s / spokes) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius)
    ctx.stroke()
  }

  // ── Concentric rings ────────────────────────────────────────────────────────
  for (let r = 1; r <= rings; r++) {
    const radius = (r / rings) * maxRadius
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  // ── Cross-threads (connecting spokes between rings) ─────────────────────────
  ctx.lineWidth = size * 0.005
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)'
  for (let r = 1; r < rings; r++) {
    const r1 = ((r - 0.5) / rings) * maxRadius
    const r2 = ((r + 0.5) / rings) * maxRadius
    for (let s = 0; s < spokes; s++) {
      const a1 = (s / spokes) * Math.PI * 2
      const a2 = ((s + 0.5) / spokes) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1)
      ctx.quadraticCurveTo(
        cx + Math.cos(a2) * r2,
        cy + Math.sin(a2) * r2,
        cx + Math.cos(a2) * r1,
        cy + Math.sin(a2) * r1
      )
      ctx.stroke()
    }
  }

  // ── Centre dot ──────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(233, 30, 140, 0.9)'
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.012, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Creates a small repeating web tile texture for use on costumes.
 */
export function createWebTileTexture(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.46
  const spokes = 8
  const rings = 5

  ctx.strokeStyle = 'rgba(233, 30, 140, 0.6)'
  ctx.lineWidth = size * 0.015
  ctx.lineCap = 'round'

  for (let s = 0; s < spokes; s++) {
    const angle = (s / spokes) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR)
    ctx.stroke()
  }

  for (let r = 1; r <= rings; r++) {
    ctx.beginPath()
    ctx.arc(cx, cy, (r / rings) * maxR, 0, Math.PI * 2)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  texture.needsUpdate = true
  return texture
}

