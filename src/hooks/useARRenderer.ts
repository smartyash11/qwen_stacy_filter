import { useEffect, useRef, useCallback } from 'react'
import type { FaceLandmarkerResult, HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { GwenFrameRenderer, type ARSettings, type FilterEntry } from '../rendering/GwenFrameRenderer'
import { getLFrameTransform } from '../tracking/HandTracker'

interface UseARRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  settings: ARSettings
  activeFilter: FilterEntry
}

export function useARRenderer({ canvasRef, videoRef, settings, activeFilter }: UseARRendererProps) {
  const rendererRef = useRef<GwenFrameRenderer | null>(null)
  const rafRef      = useRef<number>(0)

  const faceRef     = useRef<FaceLandmarkerResult | null>(null)
  const handsRef    = useRef<HandLandmarkerResult | null>(null)
  const poseRef     = useRef<PoseLandmarkerResult | null>(null)
  const settingsRef = useRef<ARSettings>(settings)
  const filterRef   = useRef<FilterEntry>(activeFilter)

  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => {
    filterRef.current = activeFilter
    rendererRef.current?.setFilter(activeFilter)
  }, [activeFilter])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new GwenFrameRenderer(canvas)
    renderer.setFilter(filterRef.current)
    rendererRef.current = renderer

    const onResize = () => {
      const w = canvas.clientWidth  || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      canvas.width  = w
      canvas.height = h
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(canvas)
    onResize()

    function animate() {
      rafRef.current = requestAnimationFrame(animate)

      const handCorners = getLFrameTransform(handsRef.current)

      rendererRef.current?.render(
        handCorners,
        faceRef.current,
        poseRef.current,
        settingsRef.current
      )
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [canvasRef, videoRef])

  const updateTracking = useCallback((
    face: FaceLandmarkerResult | null,
    hands: HandLandmarkerResult | null,
    pose: PoseLandmarkerResult | null
  ) => {
    faceRef.current  = face
    handsRef.current = hands
    poseRef.current  = pose
  }, [])

  return { updateTracking }
}
