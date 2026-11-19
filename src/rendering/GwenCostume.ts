import * as THREE from 'three'
import type { FaceLandmarkerResult, HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { createWebTileTexture } from './WebPattern'
import { GWEN_PALETTE } from '../utils/colors'
import { landmarkToWorld, computeHeadPose, computeShoulderLine, computeArmRig } from '../utils/geometry'
import { Vec3Smoother, QuaternionSmoother } from '../utils/smoothing'

export interface ARSettings {
  maskSize: number       // 0–1 (default 0.5)
  costumeFit: number     // 0–1 (default 0.5)
  glowStrength: number   // 0–1
  comicStrength: number  // 0–1
}

// ─── Helper: build a Mesh with shared dispose ─────────────────────────────────

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose()
  if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
  else mesh.material.dispose()
}

// ─── GwenCostume ─────────────────────────────────────────────────────────────

export class GwenCostume {
  private scene: THREE.Scene
  private settings: ARSettings
  private group: THREE.Group

  // Sub-groups
  private maskGroup: THREE.Group
  private hoodGroup: THREE.Group
  private torsoGroup: THREE.Group
  private leftArmGroup: THREE.Group
  private rightArmGroup: THREE.Group
  private glowGroup: THREE.Group

  // Textures
  private webTex: THREE.CanvasTexture

  // Face glow light
  private faceLight: THREE.PointLight

  // Smoothers
  private headPosSmoother = new Vec3Smoother(30, 1.2, 0.07)
  private headRotSmoother = new QuaternionSmoother(0.25)
  private shoulderSmoother = new Vec3Smoother(30, 1.0, 0.05)
  private leftWristSmoother = new Vec3Smoother(30, 1.5, 0.1)
  private rightWristSmoother = new Vec3Smoother(30, 1.5, 0.1)

  // Reused geometries
  private leftSleeveRef: THREE.Mesh | null = null
  private rightSleeveRef: THREE.Mesh | null = null

  constructor(scene: THREE.Scene, settings: ARSettings) {
    this.scene = scene
    this.settings = settings
    this.webTex = createWebTileTexture(256)

    this.group = new THREE.Group()
    this.maskGroup = new THREE.Group()
    this.hoodGroup = new THREE.Group()
    this.torsoGroup = new THREE.Group()
    this.leftArmGroup = new THREE.Group()
    this.rightArmGroup = new THREE.Group()
    this.glowGroup = new THREE.Group()

    this.group.add(
      this.maskGroup,
      this.hoodGroup,
      this.torsoGroup,
      this.leftArmGroup,
      this.rightArmGroup,
      this.glowGroup
    )
    scene.add(this.group)

    // Face glow point light
    this.faceLight = new THREE.PointLight(GWEN_PALETTE.magentaHex, 0, 4)
    this.group.add(this.faceLight)

    this._buildMask()
    this._buildHood()
    this._buildTorso()

    this.group.visible = false
  }

  // ── Build Mask ──────────────────────────────────────────────────────────────

  private _buildMask() {
    // Clear previous
    this.maskGroup.clear()

    // ── Mask face plate (white ellipse) ───────────────────────────────────────
    const maskShape = new THREE.Shape()
    maskShape.ellipse(0, 0, 0.42, 0.52, 0, Math.PI * 2, false, 0)

    const maskGeo = new THREE.ShapeGeometry(maskShape, 48)
    const maskMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.whiteHex,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    })
    const maskMesh = new THREE.Mesh(maskGeo, maskMat)
    maskMesh.position.z = 0.01
    this.maskGroup.add(maskMesh)

    // ── Magenta outline ───────────────────────────────────────────────────────
    const outlineShape = new THREE.Shape()
    outlineShape.ellipse(0, 0, 0.44, 0.54, 0, Math.PI * 2, false, 0)
    const outlineHole = new THREE.Path()
    outlineHole.ellipse(0, 0, 0.42, 0.52, 0, Math.PI * 2, false, 0)
    outlineShape.holes.push(outlineHole)
    const outlineGeo = new THREE.ShapeGeometry(outlineShape, 48)
    const outlineMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
    })
    const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat)
    outlineMesh.position.z = 0.0
    this.maskGroup.add(outlineMesh)

    // ── Left Eye (from viewer perspective) ───────────────────────────────────
    this.maskGroup.add(this._buildEye(-0.15, 0.08))

    // ── Right Eye ────────────────────────────────────────────────────────────
    this.maskGroup.add(this._buildEye(0.15, 0.08))
  }

  private _buildEye(offsetX: number, offsetY: number): THREE.Group {
    const eyeGroup = new THREE.Group()
    eyeGroup.position.set(offsetX, offsetY, 0.025)

    // White lens – large almond/ellipse shape
    const lensShape = new THREE.Shape()
    lensShape.ellipse(0, 0, 0.14, 0.1, 0, Math.PI * 2, false, 0)
    const lensGeo = new THREE.ShapeGeometry(lensShape, 32)
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xddddff,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
    })
    const lens = new THREE.Mesh(lensGeo, lensMat)
    eyeGroup.add(lens)

    // Magenta ring outline around lens
    const ringShape = new THREE.Shape()
    ringShape.ellipse(0, 0, 0.155, 0.115, 0, Math.PI * 2, false, 0)
    const ringHole = new THREE.Path()
    ringHole.ellipse(0, 0, 0.14, 0.1, 0, Math.PI * 2, false, 0)
    ringShape.holes.push(ringHole)
    const ringGeo = new THREE.ShapeGeometry(ringShape, 32)
    const ringMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.z = -0.005
    eyeGroup.add(ring)

    return eyeGroup
  }

  // ── Build Hood ──────────────────────────────────────────────────────────────

  private _buildHood() {
    this.hoodGroup.clear()

    // Hood shape: rounded large teardrop behind head
    const hoodShape = new THREE.Shape()
    hoodShape.moveTo(0, 0.55)
    hoodShape.bezierCurveTo( 0.6,  0.5,  0.75,  0.1,  0.5,  -0.3)
    hoodShape.bezierCurveTo( 0.4, -0.65,  0.2,  -0.8,  0.0,  -0.8)
    hoodShape.bezierCurveTo(-0.2, -0.8, -0.4,  -0.65, -0.5,  -0.3)
    hoodShape.bezierCurveTo(-0.75, 0.1, -0.6,   0.5,   0.0,  0.55)

    const hoodGeo = new THREE.ShapeGeometry(hoodShape, 48)
    const hoodMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.whiteHex,
      map: this.webTex,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    })
    const hood = new THREE.Mesh(hoodGeo, hoodMat)
    hood.position.z = -0.05
    this.hoodGroup.add(hood)

    // Magenta web overlay on hood (additive blend for glow)
    const webOverlayGeo = new THREE.ShapeGeometry(hoodShape, 48)
    const webOverlayMat = new THREE.MeshBasicMaterial({
      map: this.webTex,
      color: GWEN_PALETTE.magentaHex,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const webOverlay = new THREE.Mesh(webOverlayGeo, webOverlayMat)
    webOverlay.position.z = -0.04
    this.hoodGroup.add(webOverlay)
  }

  // ── Build Torso ─────────────────────────────────────────────────────────────

  private _buildTorso() {
    this.torsoGroup.clear()

    // ── Black bodysuit base ───────────────────────────────────────────────────
    const bodySuitGeo = new THREE.PlaneGeometry(1.6, 1.4)
    const bodySuitMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0f,
      map: this.webTex,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    })
    const bodySuit = new THREE.Mesh(bodySuitGeo, bodySuitMat)
    bodySuit.position.z = -0.08
    this.torsoGroup.add(bodySuit)

    // ── White chest panel (inverted triangle / diamond) ───────────────────────
    const chestShape = new THREE.Shape()
    chestShape.moveTo(0, 0.4)
    chestShape.lineTo(0.3, 0.1)
    chestShape.lineTo(0.2, -0.35)
    chestShape.lineTo(0, -0.5)
    chestShape.lineTo(-0.2, -0.35)
    chestShape.lineTo(-0.3, 0.1)
    chestShape.closePath()

    const chestGeo = new THREE.ShapeGeometry(chestShape, 24)
    const chestMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.whiteHex,
      roughness: 0.3,
      metalness: 0.05,
      transparent: true,
      opacity: 0.9,
    })
    const chest = new THREE.Mesh(chestGeo, chestMat)
    chest.position.z = -0.07
    this.torsoGroup.add(chest)

    // ── Chest outline ─────────────────────────────────────────────────────────
    const chestOutlineShape = new THREE.Shape()
    chestOutlineShape.moveTo(0, 0.42)
    chestOutlineShape.lineTo(0.32, 0.11)
    chestOutlineShape.lineTo(0.22, -0.37)
    chestOutlineShape.lineTo(0, -0.52)
    chestOutlineShape.lineTo(-0.22, -0.37)
    chestOutlineShape.lineTo(-0.32, 0.11)
    chestOutlineShape.closePath()
    const chestHole = new THREE.Path()
    chestHole.moveTo(0, 0.4)
    chestHole.lineTo(0.3, 0.1)
    chestHole.lineTo(0.2, -0.35)
    chestHole.lineTo(0, -0.5)
    chestHole.lineTo(-0.2, -0.35)
    chestHole.lineTo(-0.3, 0.1)
    chestHole.closePath()
    chestOutlineShape.holes.push(chestHole)

    const chestOutlineGeo = new THREE.ShapeGeometry(chestOutlineShape, 24)
    const chestOutlineMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    })
    const chestOutline = new THREE.Mesh(chestOutlineGeo, chestOutlineMat)
    chestOutline.position.z = -0.065
    this.torsoGroup.add(chestOutline)
  }

  // ── Build/Update Sleeve ──────────────────────────────────────────────────────

  private _buildSleeve(
    group: THREE.Group,
    shoulder: THREE.Vector3,
    elbow: THREE.Vector3,
    wrist: THREE.Vector3,
    radius: number,
    isLeft: boolean
  ) {
    group.clear()

    // CatmullRom curve through joints
    const curve = new THREE.CatmullRomCurve3([
      shoulder,
      elbow,
      wrist,
    ])

    const tubeGeo = new THREE.TubeGeometry(curve, 20, radius, 8, false)
    const tubeMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      map: this.webTex,
      roughness: 0.3,
      metalness: 0.2,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.9,
    })
    const tube = new THREE.Mesh(tubeGeo, tubeMat)
    group.add(tube)

    if (isLeft) this.leftSleeveRef = tube
    else this.rightSleeveRef = tube
  }

  // ── Build/Update Glove ───────────────────────────────────────────────────────

  private _buildGlove(group: THREE.Group, wrist: THREE.Vector3, radius: number) {
    group.clear()

    // Palm sphere
    const palmGeo = new THREE.SphereGeometry(radius * 1.2, 12, 8)
    const palmMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      map: this.webTex,
      roughness: 0.3,
      metalness: 0.2,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 0.3,
    })
    const palm = new THREE.Mesh(palmGeo, palmMat)
    palm.position.copy(wrist)
    group.add(palm)

    // Knuckle bumps
    const knuckleGeo = new THREE.SphereGeometry(radius * 0.5, 8, 6)
    const knuckleMat = new THREE.MeshStandardMaterial({
      color: GWEN_PALETTE.magentaHex,
      emissive: GWEN_PALETTE.magentaHex,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    })
    for (let i = -1; i <= 1; i++) {
      const knuckle = new THREE.Mesh(knuckleGeo, knuckleMat)
      knuckle.position.copy(wrist)
      knuckle.position.x += i * radius * 0.6
      knuckle.position.y += radius * 0.9
      group.add(knuckle)
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  updateFromLandmarks(
    face: FaceLandmarkerResult | null,
    pose: PoseLandmarkerResult | null,
    _hand: HandLandmarkerResult | null,
    videoWidth: number,
    videoHeight: number
  ) {
    if (!face || face.faceLandmarks.length === 0) {
      this.group.visible = false
      return
    }
    this.group.visible = true

    const aspect = videoWidth / videoHeight
    // Build a temporary camera for coordinate conversion
    const cam = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
    cam.position.z = 5

    const ts = performance.now()

    // ── Head transform ──────────────────────────────────────────────────────
    const faceLm = face.faceLandmarks[0]
    const headPose = computeHeadPose(faceLm, cam, aspect)

    const smoothPos = this.headPosSmoother.filter(headPose.position, ts)
    const rawQuat = new THREE.Quaternion().setFromEuler(headPose.rotation)
    const smoothQuat = this.headRotSmoother.filter(rawQuat)

    const maskScale = 0.8 + this.settings.maskSize * 1.4
    const faceScale = headPose.scale * maskScale

    this.maskGroup.position.copy(smoothPos)
    this.maskGroup.quaternion.copy(smoothQuat)
    this.maskGroup.scale.setScalar(faceScale)

    this.hoodGroup.position.copy(smoothPos)
    this.hoodGroup.quaternion.copy(smoothQuat)
    this.hoodGroup.scale.setScalar(faceScale * 1.1)

    // Face glow
    this.faceLight.position.copy(smoothPos)
    const glowIntensity = this.settings.glowStrength * 2.0
    this.faceLight.intensity = glowIntensity
    this.faceLight.color.set(GWEN_PALETTE.magentaHex)

    // ── Torso + arms ────────────────────────────────────────────────────────
    if (pose && pose.worldLandmarks.length > 0) {
      const poseLm = pose.landmarks[0]

      const shoulders = computeShoulderLine(poseLm, cam, aspect)
      const smoothShoulderCenter = this.shoulderSmoother.filter(shoulders.center, ts)

      const fitScale = 0.8 + this.settings.costumeFit * 1.0
      const shoulderWidth = Math.max(shoulders.width, 0.5)

      this.torsoGroup.position.copy(smoothShoulderCenter)
      this.torsoGroup.position.y -= shoulderWidth * 0.3
      this.torsoGroup.scale.setScalar(shoulderWidth * fitScale * 0.9)
      this.torsoGroup.rotation.z = -shoulders.angle

      // Sleeves
      const leftArm = computeArmRig(poseLm, 'left', cam, aspect)
      const rightArm = computeArmRig(poseLm, 'right', cam, aspect)

      const sleeveRadius = shoulderWidth * 0.08 * fitScale

      this._buildSleeve(
        this.leftArmGroup,
        leftArm.shoulder,
        leftArm.elbow,
        leftArm.wrist,
        sleeveRadius,
        true
      )
      this._buildSleeve(
        this.rightArmGroup,
        rightArm.shoulder,
        rightArm.elbow,
        rightArm.wrist,
        sleeveRadius,
        false
      )

      // Smooth wrist positions for gloves
      const smoothLeftWrist = this.leftWristSmoother.filter(leftArm.wrist, ts)
      const smoothRightWrist = this.rightWristSmoother.filter(rightArm.wrist, ts)
      this._buildGlove(new THREE.Group(), smoothLeftWrist, sleeveRadius * 1.3)
      this._buildGlove(new THREE.Group(), smoothRightWrist, sleeveRadius * 1.3)

    } else {
      this.torsoGroup.position.copy(smoothPos)
      this.torsoGroup.position.y -= faceScale * 1.1
      this.torsoGroup.scale.setScalar(faceScale * 0.85)
      this.leftArmGroup.clear()
      this.rightArmGroup.clear()
    }
  }

  setVisible(visible: boolean) {
    this.group.visible = visible
  }

  updateSettings(settings: ARSettings) {
    this.settings = settings
  }

  dispose() {
    this.webTex.dispose()
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) disposeMesh(obj)
    })
    this.scene.remove(this.group)
  }
}

