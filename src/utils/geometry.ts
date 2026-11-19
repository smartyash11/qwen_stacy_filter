import * as THREE from 'three'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// ─── Landmark → World Space ───────────────────────────────────────────────────

/**
 * Convert a normalized [0,1] landmark coordinate to Three.js world space.
 * The Three.js camera sits at z=5 looking toward z=0 (origin).
 * We project onto the z=0 plane using the camera frustum.
 */
export function landmarkToWorld(
  x: number,
  y: number,
  z: number,
  camera: THREE.PerspectiveCamera,
  aspect: number
): THREE.Vector3 {
  const fovRad = (camera.fov * Math.PI) / 180
  const height = 2 * Math.tan(fovRad / 2) * 5 // at z=0, distance=5
  const width = height * aspect
  return new THREE.Vector3(
    (x - 0.5) * width,
    -(y - 0.5) * height,
    -z * 2 // depth from landmark z
  )
}

// ─── Head Pose ────────────────────────────────────────────────────────────────

export interface HeadPose {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  /** Inter-ocular distance in world units (proxy for head size) */
  iod: number
}

/**
 * Derive head pose from MediaPipe face landmarks.
 * Key landmarks:
 *   1  = nose tip
 *   33 = left eye outer
 *  263 = right eye outer
 *   61 = mouth left
 *  291 = mouth right
 *  199 = chin
 *  10  = forehead top
 */
export function computeHeadPose(
  faceLandmarks: NormalizedLandmark[],
  camera: THREE.PerspectiveCamera,
  aspect: number
): HeadPose {
  const lm = (i: number) =>
    landmarkToWorld(faceLandmarks[i].x, faceLandmarks[i].y, faceLandmarks[i].z, camera, aspect)

  const nose = lm(1)
  const leftEye = lm(33)
  const rightEye = lm(263)
  const mouthLeft = lm(61)
  const mouthRight = lm(291)
  const chin = lm(199)

  // Face center (between eyes)
  const eyeCenter = new THREE.Vector3().addVectors(leftEye, rightEye).multiplyScalar(0.5)

  // Position: use midpoint of eyes and nose
  const position = new THREE.Vector3()
    .addVectors(eyeCenter, nose)
    .multiplyScalar(0.5)

  // Inter-ocular distance
  const iod = leftEye.distanceTo(rightEye)

  // Head roll: angle of eye line relative to horizontal
  const eyeDelta = new THREE.Vector3().subVectors(rightEye, leftEye)
  const roll = Math.atan2(eyeDelta.y, eyeDelta.x)

  // Head yaw: derived from nose offset vs eye center
  const noseLateral = nose.x - eyeCenter.x
  const yaw = Math.atan2(noseLateral, iod * 2) * 1.5

  // Head pitch: derived from nose offset vs mouth-eye axis
  const faceHeight = eyeCenter.distanceTo(chin)
  const noseVertical = eyeCenter.y - nose.y
  const pitch = Math.atan2(noseVertical, faceHeight) * 0.5

  // Mouth center for scale reference
  const mouthCenter = new THREE.Vector3().addVectors(mouthLeft, mouthRight).multiplyScalar(0.5)
  const scale = Math.max(eyeCenter.distanceTo(mouthCenter) * 2.2, 0.1)

  return {
    position,
    rotation: new THREE.Euler(pitch, yaw, -roll, 'YXZ'),
    scale,
    iod,
  }
}

// ─── Shoulder Line ────────────────────────────────────────────────────────────

export interface ShoulderLine {
  center: THREE.Vector3
  leftShoulder: THREE.Vector3
  rightShoulder: THREE.Vector3
  angle: number
  width: number
}

/**
 * Compute shoulder geometry from pose landmarks.
 * Landmark indices: 11=left shoulder, 12=right shoulder
 */
export function computeShoulderLine(
  poseLandmarks: NormalizedLandmark[],
  camera: THREE.PerspectiveCamera,
  aspect: number
): ShoulderLine {
  const lm = (i: number) =>
    landmarkToWorld(poseLandmarks[i].x, poseLandmarks[i].y, poseLandmarks[i].z, camera, aspect)

  const leftShoulder = lm(11)
  const rightShoulder = lm(12)
  const center = new THREE.Vector3().addVectors(leftShoulder, rightShoulder).multiplyScalar(0.5)

  const delta = new THREE.Vector3().subVectors(rightShoulder, leftShoulder)
  const angle = Math.atan2(delta.y, delta.x)
  const width = delta.length()

  return { center, leftShoulder, rightShoulder, angle, width }
}

// ─── Arm Rig ──────────────────────────────────────────────────────────────────

export interface ArmRig {
  shoulder: THREE.Vector3
  elbow: THREE.Vector3
  wrist: THREE.Vector3
}

/**
 * Compute arm joint positions from pose landmarks.
 * Left:  shoulder=11, elbow=13, wrist=15
 * Right: shoulder=12, elbow=14, wrist=16
 */
export function computeArmRig(
  poseLandmarks: NormalizedLandmark[],
  side: 'left' | 'right',
  camera: THREE.PerspectiveCamera,
  aspect: number
): ArmRig {
  const lm = (i: number) =>
    landmarkToWorld(poseLandmarks[i].x, poseLandmarks[i].y, poseLandmarks[i].z, camera, aspect)

  if (side === 'left') {
    return { shoulder: lm(11), elbow: lm(13), wrist: lm(15) }
  } else {
    return { shoulder: lm(12), elbow: lm(14), wrist: lm(16) }
  }
}

