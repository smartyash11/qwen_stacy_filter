import React, { useState, useCallback, useRef } from 'react'
import { useCamera } from './hooks/useCamera'
import { CameraView } from './components/CameraView'
import { ControlPanel } from './components/ControlPanel'
import { PermissionState } from './components/PermissionState'
import type { ARSettings, FilterEntry, DeviceMode } from './rendering/GwenFrameRenderer'
import { PRESET_FILTERS } from './rendering/GwenFrameRenderer'

type AppStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'not-found' | 'error'

const DEFAULT_SETTINGS: ARSettings = {
  autoFaceTrack: true,
  maskSize: 0.5,
  costumeFit: 0.5,
  horizontalOffset: 0.5,
  glowStrength: 0.85,
  comicStrength: 0.35,
  filterRotation: 0,
}

export default function App() {
  const [settings, setSettings]         = useState<ARSettings>(DEFAULT_SETTINGS)
  const [status, setStatus]             = useState<AppStatus>('idle')
  const [activeFilter, setActiveFilter] = useState<FilterEntry>(PRESET_FILTERS[0])
  const [deviceMode, setDeviceMode]     = useState<DeviceMode>('laptop')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { stream, error, isLoading, startCamera, stopCamera } = useCamera()

  const handleStart = useCallback(async () => {
    setStatus('requesting')
    await startCamera()
  }, [startCamera])

  React.useEffect(() => {
    if (error) {
      setStatus(error.type === 'denied' ? 'denied' : error.type === 'not-found' ? 'not-found' : 'error')
    } else if (stream) {
      setStatus('active')
    } else if (!isLoading) {
      setStatus('idle')
    }
  }, [error, stream, isLoading])

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream, status])

  const handleFilterSelect = useCallback((f: FilterEntry) => {
    setActiveFilter(f)
  }, [])

  return (
    <div className="app-layout">
      <header className="app-header glass">
        <div className="app-logo">
          <span className="logo-badge" style={{ background: activeFilter.theme.primary }}>🕷️</span>
          <span className="logo-text">
            Multiverse<span className="logo-accent"> AR</span>
          </span>
          <span className="active-hero-tag" style={{ borderColor: activeFilter.theme.primary, color: activeFilter.theme.accent }}>
            {activeFilter.name}
          </span>
          <span className="device-mode-badge" title="Active Screen Orientation Mode">
            {deviceMode === 'laptop' ? '💻 Laptop (16:9)' : deviceMode === 'mobile_landscape' ? '📱 Mobile Landscape' : '📱 Mobile Portrait'}
          </span>
        </div>

        <div className="header-actions">
          {status === 'active'
            ? <button className="btn btn-secondary btn-sm" onClick={stopCamera}>⏹ Stop</button>
            : <button className="btn btn-primary btn-sm" onClick={handleStart} disabled={status === 'requesting'}>
                {status === 'requesting' ? 'Starting…' : '▶ Start AR'}
              </button>
          }
        </div>
      </header>

      <main className="app-main">
        {status === 'active' ? (
          <>
            <CameraView
              videoRef={videoRef}
              stream={stream}
              settings={settings}
              activeFilter={activeFilter}
              isLoading={isLoading}
            />
            <ControlPanel
              settings={settings}
              onChange={setSettings}
              activeFilter={activeFilter}
              onFilterSelect={handleFilterSelect}
              deviceMode={deviceMode}
              onDeviceModeChange={setDeviceMode}
              faceDetected={true}
              handsDetected={true}
              poseDetected={true}
            />
          </>
        ) : (
          <div className="idle-state">
            <PermissionState status={status} error={error} onRetry={handleStart} />
          </div>
        )}
      </main>

      <style>{`
        .logo-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          font-size: 1rem;
          box-shadow: 0 0 10px rgba(233, 30, 140, 0.4);
        }
        .active-hero-tag {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 20px;
          border: 1px solid;
          background: rgba(10, 10, 15, 0.6);
          backdrop-filter: blur(8px);
          margin-left: 6px;
        }
        .device-mode-badge {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.65);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: 4px;
        }
        @media (max-width: 680px) {
          .device-mode-badge { display: none; }
        }
        @media (max-width: 500px) {
          .active-hero-tag { display: none; }
        }
      `}</style>
    </div>
  )
}
