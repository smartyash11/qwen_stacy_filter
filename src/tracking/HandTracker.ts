import type { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Returns true if a finger is extended.
 * Compares distance of tip vs pip/mcp from wrist.
 */
function isFingerExtended(
  landmarks: NormalizedLandmark[],
  tipIdx: number,
  pipIdx: number,
  mcpIdx: number,
  wristIdx: number = 0
): boolean {
  const wrist = landmarks[wristIdx]
  const mcp = landmarks[mcpIdx]
  const pip = landmarks[pipIdx]
  const tip = landmarks[tipIdx]

  const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y)
  const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y)
  const dMcp = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y)

  // Tip should be further from wrist than PIP and MCP
  return dTip > dPip * 1.05 && dTip > dMcp * 1.15
}

function isThumbExtended(landmarks: NormalizedLandmark[]): boolean {
  const wrist = landmarks[0]
  const cmc = landmarks[1]
  const mcp = landmarks[2]
  const tip = landmarks[4]

  const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y)
  const dMcp = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y)
  
  const dx1 = mcp.x - cmc.x
  const dy1 = mcp.y - cmc.y
  const dx2 = tip.x - mcp.x
  const dy2 = tip.y - mcp.y
  const len1 = Math.hypot(dx1, dy1)
  const len2 = Math.hypot(dx2, dy2)
  if (len1 < 1e-5 || len2 < 1e-5) return dTip > dMcp

  const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2)
  return dot > 0.3 || dTip > dMcp * 1.15
}

/**
 * Checks if a hand is forming an L-shape or pointing gesture
 * (Index finger pointing up/forward, Thumb extended sideways, others curled or relaxed)
 */
export function detectLShape(landmarks: NormalizedLandmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false

  const indexExt = isFingerExtended(landmarks, 8, 6, 5)
  const thumbExt = isThumbExtended(landmarks)
  
  // Middle, Ring, Pinky should ideally NOT both be fully straight like a high-five
  const middleExt = isFingerExtended(landmarks, 12, 10, 9)
  const pinkyExt = isFingerExtended(landmarks, 20, 18, 17)

  // To be forgiving for users in webcam:
  // If index is extended and at least thumb is extended or middle/ring/pinky are curled
  const othersCurled = !middleExt || !pinkyExt
  return indexExt && (thumbExt || othersCurled)
}

export interface HandFrameCorners {
  // Mirror-corrected normalized coordinates [0, 1]
  leftHand: {
    indexTip: { x: number; y: number }
    thumbTip: { x: number; y: number }
    wrist: { x: number; y: number }
  }
  rightHand: {
    indexTip: { x: number; y: number }
    thumbTip: { x: number; y: number }
    wrist: { x: number; y: number }
  }
  // The bounding box defined by the two L-hands
  box: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    width: number
    height: number
    centerX: number
    centerY: number
    angle: number
  }
  // Quad vertices (top-left, top-right, bottom-right, bottom-left)
  quad: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number }
  ]
}

/**
 * Detects the two hands forming the L-frame and returns the exact screen rectangle/quad
 */
export function getLFrameTransform(
  handResults: HandLandmarkerResult | null
): HandFrameCorners | null {
  if (!handResults || !handResults.landmarks || handResults.landmarks.length < 2) {
    return null
  }

  const hand0 = handResults.landmarks[0]
  const hand1 = handResults.landmarks[1]

  // Check if both hands are present
  // For the filter to be responsive and fun, check if both hands are showing fingers
  const isL0 = detectLShape(hand0)
  const isL1 = detectLShape(hand1)

  // Even if gesture is slightly imperfect, if two hands are detected near each other
  // we can create the portal frame between them
  if (!isL0 && !isL1) return null

  // Determine which is screen-left and screen-right
  // Note: in selfie camera (mirrored), x is mirrored
  const h0Index = hand0[8]
  const h0Thumb = hand0[4]
  const h0Wrist = hand0[0]

  const h1Index = hand1[8]
  const h1Thumb = hand1[4]
  const h1Wrist = hand1[0]

  const h0X = (h0Index.x + h0Thumb.x) / 2
  const h1X = (h1Index.x + h1Thumb.x) / 2

  let leftHandPts = h0X < h1X ? { index: h0Index, thumb: h0Thumb, wrist: h0Wrist } : { index: h1Index, thumb: h1Thumb, wrist: h1Wrist }
  let rightHandPts = h0X < h1X ? { index: h1Index, thumb: h1Thumb, wrist: h1Wrist } : { index: h0Index, thumb: h0Thumb, wrist: h0Wrist }

  // Points on left hand
  const lx = Math.min(leftHandPts.index.x, leftHandPts.thumb.x)
  const rx = Math.max(rightHandPts.index.x, rightHandPts.thumb.x)

  // Vertical span of the frame
  const topY = Math.min(leftHandPts.index.y, rightHandPts.index.y)
  const bottomY = Math.max(leftHandPts.thumb.y, rightHandPts.thumb.y, leftHandPts.wrist.y, rightHandPts.wrist.y)

  // Padding to make the cutout window feel naturally enclosed by hands
  const padX = (rx - lx) * 0.05
  const minX = Math.max(0, lx - padX)
  const maxX = Math.min(1, rx + padX)
  
  // Height should be at least some proportion of width if thumbs are high
  const hMin = Math.max(bottomY - topY, (maxX - minX) * 0.28)
  const minY = Math.max(0, topY - (bottomY - topY) * 0.1)
  const maxY = Math.min(1, minY + hMin)

  const width = maxX - minX
  const height = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // Tilt angle between the two index fingers
  const angle = Math.atan2(rightHandPts.index.y - leftHandPts.index.y, rightHandPts.index.x - leftHandPts.index.x)

  return {
    leftHand: {
      indexTip: { x: leftHandPts.index.x, y: leftHandPts.index.y },
      thumbTip: { x: leftHandPts.thumb.x, y: leftHandPts.thumb.y },
      wrist: { x: leftHandPts.wrist.x, y: leftHandPts.wrist.y }
    },
    rightHand: {
      indexTip: { x: rightHandPts.index.x, y: rightHandPts.index.y },
      thumbTip: { x: rightHandPts.thumb.x, y: rightHandPts.thumb.y },
      wrist: { x: rightHandPts.wrist.x, y: rightHandPts.wrist.y }
    },
    box: {
      minX,
      maxX,
      minY,
      maxY,
      width,
      height,
      centerX,
      centerY,
      angle
    },
    quad: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ]
  }
}

// Backwards-compatibility aliases for GwenPortal if imported
export function detectBothLShapes(handResults: HandLandmarkerResult | null) {
  const frame = getLFrameTransform(handResults)
  return { left: !!frame, right: !!frame, bothActive: !!frame }
}

export function getPortalTransform(handResults: HandLandmarkerResult | null) {
  const frame = getLFrameTransform(handResults)
  if (!frame) return null
  return {
    center: { x: frame.box.centerX, y: frame.box.centerY },
    radius: frame.box.width / 2,
    angle: frame.box.angle
  }
}

