import * as THREE from 'three'

// ─── OneEuroFilter ────────────────────────────────────────────────────────────
// Low-latency signal smoothing. See: https://cristal.univ-lille.fr/~casiez/1euro/

function smoothingFactor(te: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * te
  return r / (r + 1)
}

function exponentialSmoothing(a: number, x: number, prev: number): number {
  return a * x + (1 - a) * prev
}

export class OneEuroFilter {
  private freq: number
  private minCutoff: number
  private beta: number
  private dCutoff: number

  private xPrev: number | null = null
  private dxPrev: number = 0
  private lastTimestamp: number | null = null

  constructor(freq: number, minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.freq = freq
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
  }

  filter(x: number, timestamp: number): number {
    if (this.xPrev === null || this.lastTimestamp === null) {
      this.xPrev = x
      this.lastTimestamp = timestamp
      return x
    }

    // Compute elapsed time
    const te = Math.max((timestamp - this.lastTimestamp) / 1000, 1e-6)
    this.lastTimestamp = timestamp

    // Derivative
    const dx = (x - this.xPrev) / te
    const aDx = smoothingFactor(te, this.dCutoff)
    const dxHat = exponentialSmoothing(aDx, dx, this.dxPrev)

    // Cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat)
    const a = smoothingFactor(te, cutoff)
    const xHat = exponentialSmoothing(a, x, this.xPrev)

    this.dxPrev = dxHat
    this.xPrev = xHat
    return xHat
  }

  reset(): void {
    this.xPrev = null
    this.dxPrev = 0
    this.lastTimestamp = null
  }
}

// ─── Vec3Smoother ─────────────────────────────────────────────────────────────

export class Vec3Smoother {
  private fx: OneEuroFilter
  private fy: OneEuroFilter
  private fz: OneEuroFilter

  constructor(freq = 30, minCutoff = 1.0, beta = 0.05, dCutoff = 1.0) {
    this.fx = new OneEuroFilter(freq, minCutoff, beta, dCutoff)
    this.fy = new OneEuroFilter(freq, minCutoff, beta, dCutoff)
    this.fz = new OneEuroFilter(freq, minCutoff, beta, dCutoff)
  }

  filter(v: THREE.Vector3, timestamp: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.fx.filter(v.x, timestamp),
      this.fy.filter(v.y, timestamp),
      this.fz.filter(v.z, timestamp)
    )
  }

  reset(): void {
    this.fx.reset()
    this.fy.reset()
    this.fz.reset()
  }
}

// ─── QuaternionSmoother ───────────────────────────────────────────────────────

export class QuaternionSmoother {
  private prev: THREE.Quaternion | null = null
  private alpha: number

  constructor(alpha = 0.3) {
    this.alpha = alpha
  }

  filter(q: THREE.Quaternion): THREE.Quaternion {
    if (!this.prev) {
      this.prev = q.clone()
      return q.clone()
    }
    const result = this.prev.clone().slerp(q, this.alpha)
    this.prev = result.clone()
    return result
  }

  reset(): void {
    this.prev = null
  }
}

