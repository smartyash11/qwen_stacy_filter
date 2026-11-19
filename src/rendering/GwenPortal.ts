import * as THREE from 'three'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { GWEN_PALETTE } from '../utils/colors'
import { landmarkToWorld } from '../utils/geometry'
import { detectBothLShapes, getPortalTransform } from '../tracking/HandTracker'

// ─── Portal fragment shader ───────────────────────────────────────────────────

const PORTAL_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PORTAL_FRAG = /* glsl */`
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float r = length(uv);
  float angle = atan(uv.y, uv.x);

  // Vortex spiral
  float spiral = sin(r * 8.0 - time * 2.0 + angle * 3.0) * 0.5 + 0.5;

  // Web lines
  float webLines = abs(sin(angle * 6.0 + time * 0.5)) * abs(sin(r * 5.0 - time));

  // Fade at edges
  float fade = 1.0 - smoothstep(0.7, 1.0, r);

  vec3 magenta = vec3(0.914, 0.118, 0.549);
  vec3 lavender = vec3(0.753, 0.514, 0.988);
  vec3 white = vec3(0.97, 0.97, 1.0);

  vec3 color = mix(magenta, lavender, spiral);
  color = mix(color, white, webLines * 0.3);

  gl_FragColor = vec4(color * fade, fade * 0.9);
}
`

// ─── Particle system helper ───────────────────────────────────────────────────

function createPortalParticles(count: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const colors    = new Float32Array(count * 3)

  const magenta = new THREE.Color(GWEN_PALETTE.magentaHex)
  const lavender = new THREE.Color(GWEN_PALETTE.lavenderHex)

  for (let i = 0; i < count; i++) {
    const angle  = Math.random() * Math.PI * 2
    const radius = 0.9 + Math.random() * 0.3
    positions[i * 3 + 0] = Math.cos(angle) * radius
    positions[i * 3 + 1] = Math.sin(angle) * radius
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2

    const mix = Math.random()
    const c   = new THREE.Color().lerpColors(magenta, lavender, mix)
    colors[i * 3 + 0] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  return new THREE.Points(geo, mat)
}

// ─── GwenPortal ──────────────────────────────────────────────────────────────

export class GwenPortal {
  private scene: THREE.Scene
  private group: THREE.Group

  // Portal elements
  private ring: THREE.Mesh
  private ringGlow: THREE.Mesh
  private interior: THREE.Mesh
  private particles: THREE.Points
  private particleAngles: Float32Array

  // Shader uniforms
  private timeUniform: THREE.IUniform<number>

  // Visibility state
  private _visible = false
  private _targetScale = 0
  private _currentScale = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.group = new THREE.Group()
    scene.add(this.group)

    // ── Portal ring ─────────────────────────────────────────────────────────
    const ringGeo = new THREE.TorusGeometry(1.0, 0.07, 16, 80)
    const ringMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.4,
    })
    this.ring = new THREE.Mesh(ringGeo, ringMat)
    this.group.add(this.ring)

    // ── Outer glow ring (semi-transparent, larger) ───────────────────────────
    const ringGlowGeo = new THREE.TorusGeometry(1.0, 0.18, 12, 60)
    const ringGlowMat = new THREE.MeshBasicMaterial({
      color: GWEN_PALETTE.lavenderHex,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.ringGlow = new THREE.Mesh(ringGlowGeo, ringGlowMat)
    this.group.add(this.ringGlow)

    // ── Portal interior (animated shader) ────────────────────────────────────
    const interiorGeo = new THREE.CircleGeometry(0.93, 64)
    this.timeUniform = { value: 0 }
    const interiorMat = new THREE.ShaderMaterial({
      vertexShader: PORTAL_VERT,
      fragmentShader: PORTAL_FRAG,
      uniforms: {
        time: this.timeUniform,
        resolution: { value: new THREE.Vector2(512, 512) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    this.interior = new THREE.Mesh(interiorGeo, interiorMat)
    this.interior.position.z = -0.01
    this.group.add(this.interior)

    // ── Particles ────────────────────────────────────────────────────────────
    const PARTICLE_COUNT = 200
    this.particles = createPortalParticles(PARTICLE_COUNT)
    this.particleAngles = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particleAngles[i] = Math.random() * Math.PI * 2
    }
    this.group.add(this.particles)

    this.group.visible = false
    this.group.scale.setScalar(0)
  }

  // ─── Update from hand tracking ────────────────────────────────────────────

  updateFromHands(
    handResults: HandLandmarkerResult | null,
    videoWidth: number,
    videoHeight: number
  ) {
    if (!handResults || handResults.landmarks.length < 2) {
      this._targetScale = 0
      return
    }

    const lShapes = detectBothLShapes(handResults)

    if (!lShapes.bothActive) {
      this._targetScale = 0
      return
    }

    const transform = getPortalTransform(handResults)
    if (!transform) {
      this._targetScale = 0
      return
    }

    const aspect = videoWidth / videoHeight
    const cam = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
    cam.position.z = 5

    const center = landmarkToWorld(
      transform.center.x,
      transform.center.y,
      0,
      cam,
      aspect
    )

    this.group.position.copy(center)

    // Map radius (normalized) to world units
    const fovRad = (60 * Math.PI) / 180
    const frustumH = 2 * Math.tan(fovRad / 2) * 5
    const frustumW = frustumH * aspect
    const worldRadius = transform.radius * frustumW * 1.4

    this._targetScale = Math.max(worldRadius, 0.3)
    this.group.rotation.z = transform.angle
  }

  // ─── Animation tick ───────────────────────────────────────────────────────

  update(deltaTime: number) {
    this.timeUniform.value += deltaTime

    // Smooth scale in/out
    const lerpSpeed = 6
    this._currentScale += (this._targetScale - this._currentScale) * Math.min(lerpSpeed * deltaTime, 1)

    if (this._currentScale < 0.01) {
      this.group.visible = false
      return
    }

    this.group.visible = true
    this.group.scale.setScalar(this._currentScale)

    // Pulsing ring scale
    const pulse = 1.0 + Math.sin(this.timeUniform.value * 3.0) * 0.03
    this.ring.scale.setScalar(pulse)
    this.ringGlow.scale.setScalar(pulse * 1.05)

    // Rotate particles
    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute
    const count = this.particleAngles.length
    for (let i = 0; i < count; i++) {
      this.particleAngles[i] += deltaTime * (0.4 + (i % 5) * 0.1)
      const radius = 0.9 + 0.3 * ((i * 7) % 10) / 10
      posAttr.setXYZ(
        i,
        Math.cos(this.particleAngles[i]) * radius,
        Math.sin(this.particleAngles[i]) * radius,
        Math.sin(this.particleAngles[i] * 2 + i) * 0.1
      )
    }
    posAttr.needsUpdate = true
  }

  setVisible(visible: boolean) {
    this._visible = visible
    if (!visible) {
      this.group.visible = false
      this._targetScale = 0
    }
  }

  dispose() {
    this.ring.geometry.dispose()
    ;(this.ring.material as THREE.Material).dispose()
    this.ringGlow.geometry.dispose()
    ;(this.ringGlow.material as THREE.Material).dispose()
    this.interior.geometry.dispose()
    ;(this.interior.material as THREE.Material).dispose()
    this.particles.geometry.dispose()
    ;(this.particles.material as THREE.Material).dispose()
    this.scene.remove(this.group)
  }
}

