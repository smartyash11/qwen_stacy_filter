import { useRef, useState, useCallback, useEffect } from 'react'
import {
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export interface UseMediaPipeReturn {
  faceResults: FaceLandmarkerResult | null
  handResults: HandLandmarkerResult | null
  poseResults: PoseLandmarkerResult | null
  isLoaded: boolean
  loadError: string | null
  detect: (video: HTMLVideoElement, timestamp: number) => void
}

export function useMediaPipe(): UseMediaPipeReturn {
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)

  const [faceResults, setFaceResults] = useState<FaceLandmarkerResult | null>(null)
  const [handResults, setHandResults] = useState<HandLandmarkerResult | null>(null)
  const [poseResults, setPoseResults] = useState<PoseLandmarkerResult | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Track last timestamp to avoid duplicate calls
  const lastTimestampRef = useRef<number>(-1)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)

        const [face, hand, pose] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_MODEL,
              delegate: 'GPU',
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
            runningMode: 'VIDEO',
            numFaces: 1,
          }),
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: HAND_MODEL,
              delegate: 'GPU',
            },
            numHands: 2,
            runningMode: 'VIDEO',
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: POSE_MODEL,
              delegate: 'GPU',
            },
            numPoses: 1,
            outputSegmentationMasks: false,
            runningMode: 'VIDEO',
          }),
        ])

        if (cancelled) {
          face.close()
          hand.close()
          pose.close()
          return
        }

        faceLandmarkerRef.current = face
        handLandmarkerRef.current = hand
        poseLandmarkerRef.current = pose
        setIsLoaded(true)
      } catch (err) {
        if (!cancelled) {
          console.error('[MediaPipe] init error:', err)
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load MediaPipe models'
          )
        }
      }
    }

    init()

    return () => {
      cancelled = true
      faceLandmarkerRef.current?.close()
      handLandmarkerRef.current?.close()
      poseLandmarkerRef.current?.close()
      faceLandmarkerRef.current = null
      handLandmarkerRef.current = null
      poseLandmarkerRef.current = null
    }
  }, [])

  const detect = useCallback((video: HTMLVideoElement, timestamp: number) => {
    if (!isLoaded) return
    if (timestamp <= lastTimestampRef.current) return
    if (video.readyState < 2) return

    lastTimestampRef.current = timestamp

    try {
      if (faceLandmarkerRef.current) {
        const result = faceLandmarkerRef.current.detectForVideo(video, timestamp)
        setFaceResults(result)
      }
    } catch (e) {
      // Suppress individual frame errors
    }

    try {
      if (handLandmarkerRef.current) {
        const result = handLandmarkerRef.current.detectForVideo(video, timestamp)
        setHandResults(result)
      }
    } catch (e) {
      // Suppress individual frame errors
    }

    try {
      if (poseLandmarkerRef.current) {
        const result = poseLandmarkerRef.current.detectForVideo(video, timestamp)
        setPoseResults(result)
      }
    } catch (e) {
      // Suppress individual frame errors
    }
  }, [isLoaded])

  return { faceResults, handResults, poseResults, isLoaded, loadError, detect }
}

