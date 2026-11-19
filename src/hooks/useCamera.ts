import { useRef, useState, useCallback, useEffect } from 'react'

export interface CameraError {
  type: 'denied' | 'not-found' | 'other'
  message: string
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  stream: MediaStream | null
  error: CameraError | null
  isLoading: boolean
  startCamera: () => Promise<void>
  stopCamera: () => void
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<CameraError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })

      streamRef.current = mediaStream
      // Setting stream in state triggers CameraView to mount.
      // CameraView's useEffect will attach srcObject once the <video> element exists.
      setStream(mediaStream)
    } catch (err) {
      const e = err as DOMException
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError({
          type: 'denied',
          message:
            'Camera access was denied. Please allow camera permissions in your browser settings and reload the page.',
        })
      } else if (
        e.name === 'NotFoundError' ||
        e.name === 'DevicesNotFoundError'
      ) {
        setError({
          type: 'not-found',
          message:
            'No camera was found on this device. Please connect a webcam and try again.',
        })
      } else {
        setError({
          type: 'other',
          message: `Camera error: ${e.message || e.name || 'Unknown error'}`,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Whenever the stream changes, attach it to the video element.
  // This handles the case where the video element mounts AFTER startCamera() sets the stream.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (stream) {
      video.srcObject = stream
      video.play().catch(() => {/* autoplay policy – silent */})
    } else {
      video.srcObject = null
    }
  }, [stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return { videoRef, stream, error, isLoading, startCamera, stopCamera }
}

