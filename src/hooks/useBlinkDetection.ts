import { useRef, useCallback } from 'react'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'

interface BlinkDetectorOptions {
  onBlink?: () => void
  cooldownMs?: number
}

/**
 * Robust Blink Detection using EAR (Eye Aspect Ratio) from landmarks
 * and Blendshapes as fallback. Works reliably across laptops and phones!
 */
export function useBlinkDetection({ onBlink, cooldownMs = 1000 }: BlinkDetectorOptions) {
  const lastBlinkRef = useRef<number>(0)
  const closedFramesRef = useRef<number>(0)
  const isEyeClosedRef = useRef<boolean>(false)

  const processFace = useCallback((face: FaceLandmarkerResult | null) => {
    if (!face || !face.faceLandmarks || face.faceLandmarks.length === 0) return
    if (!onBlink) return

    const now = performance.now()
    if (now - lastBlinkRef.current < cooldownMs) return

    const landmarks = face.faceLandmarks[0]

    // 1. Calculate EAR for Left Eye (landmarks 33, 160, 158, 133, 153, 144)
    const l_v1 = Math.hypot(landmarks[160].x - landmarks[144].x, landmarks[160].y - landmarks[144].y)
    const l_v2 = Math.hypot(landmarks[158].x - landmarks[153].x, landmarks[158].y - landmarks[153].y)
    const l_h  = Math.hypot(landmarks[33].x  - landmarks[133].x, landmarks[33].y  - landmarks[133].y)
    const leftEAR = (l_v1 + l_v2) / (2.0 * Math.max(0.001, l_h))

    // 2. Calculate EAR for Right Eye (landmarks 362, 385, 387, 263, 373, 380)
    const r_v1 = Math.hypot(landmarks[385].x - landmarks[380].x, landmarks[385].y - landmarks[380].y)
    const r_v2 = Math.hypot(landmarks[387].x - landmarks[373].x, landmarks[387].y - landmarks[373].y)
    const r_h  = Math.hypot(landmarks[362].x - landmarks[263].x, landmarks[362].y - landmarks[263].y)
    const rightEAR = (r_v1 + r_v2) / (2.0 * Math.max(0.001, r_h))

    const avgEAR = (leftEAR + rightEAR) / 2.0

    // 3. Blendshape eye blink check
    let blendshapeBlink = false
    if (face.faceBlendshapes && face.faceBlendshapes.length > 0) {
      const cats = face.faceBlendshapes[0].categories
      const lb = cats.find(c => c.categoryName === 'eyeBlinkLeft')?.score ?? 0
      const rb = cats.find(c => c.categoryName === 'eyeBlinkRight')?.score ?? 0
      if (lb > 0.40 && rb > 0.40) {
        blendshapeBlink = true
      }
    }

    // A closed eye drops below 0.18 EAR or blendshape > 0.40
    const isClosed = avgEAR < 0.18 || blendshapeBlink

    if (isClosed) {
      closedFramesRef.current++
      if (closedFramesRef.current >= 1 && !isEyeClosedRef.current) {
        isEyeClosedRef.current = true
      }
    } else {
      // Transition from closed to open = COMPLETED BLINK
      if (isEyeClosedRef.current && closedFramesRef.current >= 1) {
        lastBlinkRef.current = now
        isEyeClosedRef.current = false
        closedFramesRef.current = 0
        onBlink()
      } else {
        isEyeClosedRef.current = false
        closedFramesRef.current = 0
      }
    }
  }, [cooldownMs, onBlink])

  return { processFace }
}
