import React, { useState } from 'react'
import type { ARSettings, FilterEntry, DeviceMode } from '../rendering/GwenFrameRenderer'
import { FilterPicker } from './FilterPicker'

interface ControlPanelProps {
  settings: ARSettings
  onChange: (s: ARSettings) => void
  activeFilter: FilterEntry
  onFilterSelect: (f: FilterEntry) => void
  deviceMode: DeviceMode
  onDeviceModeChange: (mode: DeviceMode) => void
  faceDetected: boolean
  handsDetected: boolean
  poseDetected: boolean
}

export function ControlPanel({
  settings,
  onChange,
  activeFilter,
  onFilterSelect,
  deviceMode,
  onDeviceModeChange,
  faceDetected,
  handsDetected,
  poseDetected,
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  const up = <K extends keyof ARSettings>(k: K, v: ARSettings[K]) => onChange({ ...settings, [k]: v })

  return (
    <div className={`control-panel glass${collapsed ? ' collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setCollapsed(c => !c)}>
        <span className="panel-title">⚡ AR Settings</span>
        <span className="collapse-icon">{collapsed ? '＋' : '－'}</span>
      </div>

      {!collapsed && (
        <div className="panel-body fade-in">
          {/* Categorized Filter Picker with Laptop vs Mobile Resolution Guidance */}
          <section className="panel-section">
            <FilterPicker
              activeFilter={activeFilter}
              onSelect={onFilterSelect}
              deviceMode={deviceMode}
              onDeviceModeChange={onDeviceModeChange}
            />
          </section>

          <div className="divider" />

          {/* 1:1 Live Face & Body Distance Sync */}
          <section className="panel-section">
            <div className="toggle-row">
              <div>
                <h4 className="section-label" style={{ marginBottom: 2 }}>Auto Face Zoom Sync</h4>
                <span className="subtext">Auto zoom-in near & zoom-out far</span>
              </div>
              <button
                className={`mode-pill ${settings.autoFaceTrack ? 'active' : ''}`}
                onClick={() => up('autoFaceTrack', !settings.autoFaceTrack)}
              >
                {settings.autoFaceTrack ? 'SYNC ON ✨' : 'MANUAL'}
              </button>
            </div>
          </section>

          <div className="divider" />

          {/* Rotation Adjust */}
          <section className="panel-section">
            <h4 className="section-label">Filter Image Orientation</h4>
            <div className="rotation-grid">
              {[0, 90, 180, 270].map(r => (
                <button
                  key={r}
                  className={`rot-btn ${settings.filterRotation === r ? 'active' : ''}`}
                  onClick={() => up('filterRotation', r)}
                >
                  {r === 0 ? '↑' : r === 90 ? '→' : r === 180 ? '↓' : '←'}
                  <span style={{ fontSize: '0.58rem' }}>{r}°</span>
                </button>
              ))}
            </div>
          </section>

          <div className="divider" />

          {/* Live tracking status */}
          <section className="panel-section">
            <h4 className="section-label">Tracking Sensors</h4>
            <TrackingRow label="Face & Proportions" active={faceDetected}  icon="😊" />
            <TrackingRow label="L-Shape Hands" active={handsDetected} icon="✋" />
            <TrackingRow label="Body Landmarks" active={poseDetected} icon="🧍" />
          </section>

          <div className="divider" />

          {/* Sliders */}
          <section className="panel-section">
            <h4 className="section-label">Fine Adjustments</h4>

            <SliderRow label="Face Scale Multiplier" value={settings.maskSize} min={0} max={1} step={0.01}
              onChange={v => up('maskSize', v)} display={`${Math.round(settings.maskSize * 100)}%`} />

            {!settings.autoFaceTrack && <>
              <SliderRow label="Vertical Align" value={settings.costumeFit} min={0} max={1} step={0.01}
                onChange={v => up('costumeFit', v)} display={`${Math.round(settings.costumeFit * 100)}%`} />
              <SliderRow label="Horizontal Align" value={settings.horizontalOffset} min={0} max={1} step={0.01}
                onChange={v => up('horizontalOffset', v)} display={`${Math.round(settings.horizontalOffset * 100)}%`} />
            </>}

            <SliderRow label="Neon Portal Glow" value={settings.glowStrength} min={0} max={1} step={0.01}
              onChange={v => up('glowStrength', v)} display={`${Math.round(settings.glowStrength * 100)}%`} />
            <SliderRow label="Spider-Verse FX" value={settings.comicStrength} min={0} max={1} step={0.01}
              onChange={v => up('comicStrength', v)} display={`${Math.round(settings.comicStrength * 100)}%`} />
          </section>
        </div>
      )}

      <style>{`
        .control-panel {
          position: absolute;
          top: 66px;
          right: 14px;
          width: 290px;
          max-height: calc(100vh - 85px);
          overflow-y: auto;
          border-radius: 14px;
          z-index: 10;
          background: rgba(10,10,15,0.92);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(233,30,140,0.35);
          box-shadow: 0 8px 40px rgba(0,0,0,0.65), 0 0 20px rgba(233,30,140,0.1);
          transition: all 0.25s;
        }
        .control-panel::-webkit-scrollbar { width: 3px; }
        .control-panel::-webkit-scrollbar-thumb { background: rgba(233,30,140,0.4); border-radius: 4px; }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 16px;
          cursor: pointer;
          user-select: none;
          background: rgba(233,30,140,0.15);
          border-bottom: 1px solid rgba(233,30,140,0.25);
        }
        .panel-title { font-size: 0.86rem; font-weight: 700; color: #f8f8ff; letter-spacing: 0.03em; }
        .collapse-icon { color: #c084fc; font-size: 0.95rem; }
        .panel-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }
        .panel-section { display: flex; flex-direction: column; gap: 7px; }
        .section-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #c084fc;
          font-weight: 700;
          margin: 0;
        }
        .subtext { font-size: 0.65rem; color: rgba(248,248,255,0.55); }
        .divider { height: 1px; background: rgba(255,255,255,0.08); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mode-pill {
          padding: 4px 12px;
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          color: #ccc;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .mode-pill.active {
          background: #e91e8c;
          border-color: #ff60b0;
          color: #fff;
          box-shadow: 0 0 10px rgba(233,30,140,0.5);
        }
        .rotation-grid {
          display: flex;
          gap: 6px;
        }
        .rot-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 2px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #ccc;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          gap: 1px;
        }
        .rot-btn.active {
          background: rgba(233,30,140,0.25);
          border-color: #e91e8c;
          color: #fff;
          box-shadow: 0 0 8px rgba(233,30,140,0.4);
        }
        .tracking-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #ccc;
        }
        .tracking-row-left { display: flex; align-items: center; gap: 6px; }
        .badge {
          font-size: 0.63rem;
          padding: 2px 7px;
          border-radius: 10px;
          font-weight: 600;
        }
        .badge.active {
          background: rgba(233,30,140,0.22);
          color: #ff60b0;
          border: 1px solid rgba(233,30,140,0.4);
        }
        .badge.inactive { background: rgba(255,255,255,0.05); color: #666; }
        .slider-row { display: flex; flex-direction: column; gap: 3px; }
        .slider-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #ccc;
        }
        .slider-value { color: #c084fc; font-weight: 600; }
        .slider-input { accent-color: #e91e8c; cursor: pointer; width: 100%; }

        @media (max-width: 600px) {
          .control-panel {
            position: fixed;
            bottom: 0;
            right: 0;
            left: 0;
            top: auto;
            width: 100%;
            max-height: 52vh;
            border-radius: 20px 20px 0 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  )
}

function TrackingRow({ label, active, icon }: { label: string; active: boolean; icon: string }) {
  return (
    <div className="tracking-row">
      <div className="tracking-row-left"><span>{icon}</span><span>{label}</span></div>
      <span className={`badge ${active ? 'active' : 'inactive'}`}>{active ? 'Active' : 'Searching'}</span>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display: string
}) {
  return (
    <div className="slider-row">
      <div className="slider-label-row"><span>{label}</span><span className="slider-value">{display}</span></div>
      <input type="range" className="slider-input" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
  )
}
