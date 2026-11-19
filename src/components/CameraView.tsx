import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { useARRenderer } from '../hooks/useARRenderer'
import type { ARSettings, FilterEntry } from '../rendering/GwenFrameRenderer'
import { soundFX } from '../utils/soundFX'

interface CameraViewProps {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  settings: ARSettings
  activeFilter: FilterEntry
  isLoading: boolean
}

export function CameraView({
  videoRef,
  stream,
  settings,
  activeFilter,
  isLoading
}: CameraViewProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null!)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef        = useRef<number>(0)

  const [snapshotToast, setSnapshotToast] = useState(false)

  // Stream → Video
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node
    videoRef.current = node
    if (node && stream) {
      node.srcObject = stream
      node.play().catch(() => {})
    }
  }, [stream, videoRef])

  useEffect(() => {
    const video = localVideoRef.current
    if (video && stream) {
      if (video.srcObject !== stream) video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [stream])

  // Canvas resize sync
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.clientWidth
      canvas.height = canvas.clientHeight
    })
    ro.observe(canvas)
    canvas.width  = canvas.clientWidth
    canvas.height = canvas.clientHeight
    return () => ro.disconnect()
  }, [])

  const { faceResults, handResults, poseResults, isLoaded, loadError, detect } = useMediaPipe()
  const { updateTracking } = useARRenderer({
    canvasRef,
    videoRef: localVideoRef,
    settings,
    activeFilter
  })

  // Detection Loop
  const loopRef = useRef<() => void>()
  loopRef.current = useCallback(() => {
    const video = localVideoRef.current
    if (video && isLoaded && stream && video.readyState >= 2) {
      const ts = performance.now()
      detect(video, ts)
      updateTracking(faceResults, handResults, poseResults)
    }
    rafRef.current = requestAnimationFrame(() => loopRef.current?.())
  }, [isLoaded, stream, detect, updateTracking, faceResults, handResults, poseResults])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => loopRef.current?.())
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Snapshot Capture
  const takeSnapshot = useCallback(() => {
    const video = localVideoRef.current
    const arCanvas = canvasRef.current
    if (!video || !arCanvas) return

    soundFX.playShutter()
    setSnapshotToast(true)
    setTimeout(() => setSnapshotToast(false), 1500)

    const snapCanvas = document.createElement('canvas')
    const w = arCanvas.width || video.videoWidth || 1280
    const h = arCanvas.height || video.videoHeight || 720
    snapCanvas.width = w
    snapCanvas.height = h

    const sctx = snapCanvas.getContext('2d')
    if (!sctx) return

    // Draw camera video mirrored
    sctx.save()
    sctx.scale(-1, 1)
    sctx.drawImage(video, -w, 0, w, h)
    sctx.restore()

    // Draw AR canvas overlay
    sctx.drawImage(arCanvas, 0, 0, w, h)

    // Watermark tag
    sctx.fillStyle = 'rgba(0,0,0,0.6)'
    sctx.roundRect(16, h - 38, 175, 26, 6)
    sctx.fill()
    sctx.fillStyle = '#f8f8ff'
    sctx.font = '600 13px Inter, sans-serif'
    sctx.fillText('🕷️ Gwen Era Multiverse', 24, h - 21)

    // Trigger download
    const link = document.createElement('a')
    link.download = `GwenEra_${activeFilter.name.replace(/\s+/g, '_')}_${Date.now()}.png`
    link.href = snapCanvas.toDataURL('image/png')
    link.click()
  }, [activeFilter])

  const faceActive  = (faceResults?.faceLandmarks?.length  ?? 0) > 0
  const handsActive = (handResults?.landmarks?.length       ?? 0) > 0
  const poseActive  = (poseResults?.landmarks?.length       ?? 0) > 0

  return (
    <div className="camera-view">
      <video
        ref={setVideoRef}
        className="camera-video"
        autoPlay playsInline muted
        onLoadedMetadata={e => e.currentTarget.play().catch(() => {})}
      />
      <canvas ref={canvasRef} className="ar-canvas" />

      {/* Snapshot Shutter Button */}
      <button className="snap-btn" onClick={takeSnapshot} title="Capture Snapshot PNG">
        <div className="snap-btn-inner">📸</div>
      </button>

      {/* Snapshot toast */}
      {snapshotToast && (
        <div className="snapshot-toast">
          📸 Photo Saved!
        </div>
      )}

      {/* Gesture hint */}
      <div className="gesture-hint">
        <span>👆 Form <strong>L-shape</strong> with both hands to reveal filter</span>
      </div>

      {/* Loading overlay */}
      {!isLoaded && !loadError && (
        <div className="camera-overlay">
          <div className="spinner" />
          <p className="loading-text">Loading Multiverse AI…</p>
          <p className="loading-subtext">Initializing Face & Body Tracking</p>
        </div>
      )}
      {loadError && (
        <div className="camera-overlay">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p className="loading-text">Model load failed</p>
          <p className="loading-subtext" style={{ color: '#f88' }}>{loadError}</p>
        </div>
      )}

      {/* Tracking status pills */}
      {isLoaded && (
        <div className="tracking-status">
          <StatusDot label="Face"  active={faceActive}  />
          <StatusDot label="Hands" active={handsActive} />
          <StatusDot label="Body"  active={poseActive}  />
        </div>
      )}

      <style>{`
        .camera-view {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }
        .camera-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
          display: block;
          z-index: 1;
        }
        .ar-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          display: block;
          z-index: 2;
        }
        .snap-btn {
          position: absolute;
          bottom: 24px;
          right: 24px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(10, 10, 15, 0.75);
          backdrop-filter: blur(12px);
          border: 2px solid #e91e8c;
          box-shadow: 0 0 20px rgba(233, 30, 140, 0.5);
          cursor: pointer;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67);
        }
        .snap-btn:hover {
          transform: scale(1.1);
          border-color: #00f0ff;
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.6);
        }
        .snap-btn:active {
          transform: scale(0.92);
        }
        .snap-btn-inner {
          font-size: 1.4rem;
        }
        .snapshot-toast {
          position: absolute;
          top: 75px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(10, 10, 15, 0.88);
          border: 1px solid #e91e8c;
          box-shadow: 0 0 24px rgba(233, 30, 140, 0.6);
          color: #fff;
          font-size: 0.85rem;
          padding: 8px 22px;
          border-radius: 30px;
          z-index: 10;
          pointer-events: none;
          animation: toastPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes toastPop {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.85); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        .gesture-hint {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(10,10,15,0.78);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(233,30,140,0.45);
          color: #f8f8ff;
          padding: 8px 18px;
          border-radius: 24px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          z-index: 4;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .camera-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(10,10,15,0.88);
          gap: 12px;
          z-index: 5;
        }
        .loading-text { font-size: 1.05rem; font-weight: 600; color: #f8f8ff; }
        .loading-subtext { font-size: 0.82rem; color: #c084fc; }
        .spinner {
          width: 44px; height: 44px;
          border: 3px solid rgba(233,30,140,0.2);
          border-top-color: #e91e8c;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tracking-status {
          position: absolute;
          top: 14px;
          right: 14px;
          display: flex;
          gap: 6px;
          z-index: 4;
        }
        .status-dot {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(10,10,15,0.65);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 3px 9px;
          font-size: 0.72rem;
          color: #aaa;
          backdrop-filter: blur(6px);
        }
        .status-dot.active { color: #fff; border-color: rgba(233,30,140,0.5); }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #555; }
        .status-dot.active .dot { background: #e91e8c; box-shadow: 0 0 6px #e91e8c; }

        @media (max-width: 600px) {
          .snap-btn { bottom: 18px; right: 16px; width: 50px; height: 50px; }
          .gesture-hint { font-size: 0.72rem; padding: 6px 14px; bottom: 85px; }
        }
      `}</style>
    </div>
  )
}

function StatusDot({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`status-dot ${active ? 'active' : ''}`}>
      <span className="dot" />
      <span>{label}</span>
    </div>
  )
}
