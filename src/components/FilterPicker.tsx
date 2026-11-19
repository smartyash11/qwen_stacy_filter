import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { FilterEntry, FilterOrientationType, DeviceMode } from '../rendering/GwenFrameRenderer'
import { PRESET_FILTERS } from '../rendering/GwenFrameRenderer'
import { extractDominantTheme } from '../utils/colorExtractor'

interface FilterPickerProps {
  activeFilter: FilterEntry
  onSelect: (filter: FilterEntry) => void
  deviceMode: DeviceMode
  onDeviceModeChange: (mode: DeviceMode) => void
}

interface UploadModalData {
  file: File
  previewUrl: string
  detectedAspect: 'landscape' | 'portrait'
  width: number
  height: number
}

export function FilterPicker({
  activeFilter,
  onSelect,
  deviceMode,
  onDeviceModeChange
}: FilterPickerProps) {
  const [userFilters, setUserFilters] = useState<FilterEntry[]>([])
  const [filterTab, setFilterTab] = useState<'all' | 'laptop' | 'mobile'>('all')
  const [uploadModal, setUploadModal] = useState<UploadModalData | null>(null)
  const [selectedTargetOrientation, setSelectedTargetOrientation] = useState<FilterOrientationType>('landscape')
  const [customName, setCustomName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect device mode on mount or window resize
  useEffect(() => {
    const checkMode = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768
      if (isMobile) {
        if (window.innerWidth > window.innerHeight) {
          onDeviceModeChange('mobile_landscape')
          setFilterTab('laptop') // landscape photos work for mobile landscape too!
        } else {
          onDeviceModeChange('mobile_portrait')
          setFilterTab('mobile')
        }
      } else {
        onDeviceModeChange('laptop')
        setFilterTab('laptop')
      }
    }
    checkMode()
    window.addEventListener('resize', checkMode)
    return () => window.removeEventListener('resize', checkMode)
  }, [onDeviceModeChange])

  // When a user selects a file, inspect its dimensions and open the upload guidance modal
  const handleFileChosen = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return

    const previewUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = previewUrl
    img.onload = () => {
      const detectedAspect: 'landscape' | 'portrait' = img.naturalWidth >= img.naturalHeight ? 'landscape' : 'portrait'
      // Default recommendation based on image or current device
      const recommended: FilterOrientationType = detectedAspect

      setSelectedTargetOrientation(recommended)
      setCustomName(file.name.replace(/\.[^.]+$/, ''))
      setUploadModal({
        file,
        previewUrl,
        detectedAspect,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
  }, [])

  // Confirm and add the filter with user selected orientation
  const handleConfirmUpload = async () => {
    if (!uploadModal) return
    const { file, previewUrl, width, height } = uploadModal

    const theme = await extractDominantTheme(previewUrl)
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const isLandscape = selectedTargetOrientation === 'landscape'
    const newEntry: FilterEntry = {
      id,
      name: customName || file.name.replace(/\.[^.]+$/, ''),
      character: isLandscape ? 'Laptop / Wide' : 'Mobile / Portrait',
      src: previewUrl,
      thumb: previewUrl,
      theme,
      orientation: selectedTargetOrientation,
      idealResolution: isLandscape ? '1920x1080 (16:9 Landscape)' : '1080x1920 (9:16 Portrait)',
      faceCenterX: 0.50,
      faceCenterY: isLandscape ? 0.42 : 0.40,
      faceFraction: isLandscape ? 0.29 : 0.31,
    }

    setUserFilters(prev => [newEntry, ...prev])
    onSelect(newEntry)
    setUploadModal(null)
  }

  const allFilters = [...PRESET_FILTERS, ...userFilters]

  // Filter list by selected category tab
  const displayedFilters = allFilters.filter(f => {
    if (filterTab === 'all') return true
    if (filterTab === 'laptop') return f.orientation === 'landscape'
    if (filterTab === 'mobile') return f.orientation === 'portrait'
    return true
  })

  return (
    <div className="filter-picker">
      {/* Category Tabs: Laptop (Landscape) vs Mobile (Portrait) */}
      <div className="fp-header-row">
        <span className="fp-label">Category</span>
        <div className="fp-tabs">
          <button
            className={`fp-tab ${filterTab === 'laptop' ? 'active' : ''}`}
            onClick={() => setFilterTab('laptop')}
            title="Landscape 16:9 (Recommended for Laptop & Horizontal Phone)"
          >
            💻 Laptop (Wide)
          </button>
          <button
            className={`fp-tab ${filterTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setFilterTab('mobile')}
            title="Portrait 9:16 (Recommended for Mobile Vertical)"
          >
            📱 Mobile (Tall)
          </button>
          <button
            className={`fp-tab ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All ({allFilters.length})
          </button>
        </div>
      </div>

      {/* Resolution Guidance Banner */}
      <div className="resolution-guide">
        {filterTab === 'laptop' ? (
          <span>💻 <strong>Laptop Mode:</strong> Use Landscape <strong>1920×1080 (16:9)</strong> images</span>
        ) : filterTab === 'mobile' ? (
          <span>📱 <strong>Mobile Mode:</strong> Use Portrait <strong>1080×1920 (9:16)</strong> images</span>
        ) : (
          <span>💡 Choose <strong>Laptop</strong> or <strong>Mobile</strong> to match your screen</span>
        )}
      </div>

      {/* Scrollable Filter Cards */}
      <div className="fp-scroll-container">
        {displayedFilters.map(f => (
          <FilterCard
            key={f.id}
            filter={f}
            active={activeFilter.id === f.id}
            onClick={() => onSelect(f)}
          />
        ))}

        {/* Upload Card */}
        <div
          className="fp-card fp-upload"
          onClick={() => fileInputRef.current?.click()}
          title="Upload new image with resolution guidance"
        >
          <span className="fp-upload-icon">＋</span>
          <span className="fp-upload-text">Upload</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileChosen(e.target.files)}
      />

      {/* ─── UPLOAD DIALOG MODAL (Asking user Laptop vs Mobile + Resolution Info) ─── */}
      {uploadModal && (
        <div className="upload-modal-backdrop">
          <div className="upload-modal glass">
            <h3 className="modal-title">🖼️ Upload Character Filter</h3>

            <div className="modal-preview-box">
              <img src={uploadModal.previewUrl} alt="Preview" className="modal-img-preview" />
              <div className="modal-img-dims">
                Detected: {uploadModal.width}×{uploadModal.height} ({uploadModal.detectedAspect})
              </div>
            </div>

            <div className="modal-field">
              <label className="field-label">Filter Name:</label>
              <input
                type="text"
                className="field-input"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Spider-Man 2099"
              />
            </div>

            <div className="modal-field">
              <label className="field-label">Choose Screen Orientation & Target Device:</label>
              <div className="orientation-choice-grid">
                <button
                  type="button"
                  className={`choice-card ${selectedTargetOrientation === 'landscape' ? 'active' : ''}`}
                  onClick={() => setSelectedTargetOrientation('landscape')}
                >
                  <span className="choice-icon">💻</span>
                  <div className="choice-text">
                    <strong>Landscape (Laptop / Wide)</strong>
                    <small>Ideal: 1920×1080 (16:9)</small>
                    <span className="choice-badge">For Laptops & Landscape Phones</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`choice-card ${selectedTargetOrientation === 'portrait' ? 'active' : ''}`}
                  onClick={() => setSelectedTargetOrientation('portrait')}
                >
                  <span className="choice-icon">📱</span>
                  <div className="choice-text">
                    <strong>Portrait (Mobile / Vertical)</strong>
                    <small>Ideal: 1080×1920 (9:16)</small>
                    <span className="choice-badge">For Vertical Handheld Phones</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setUploadModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirmUpload}>
                ✓ Add to Filter Library
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .filter-picker {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .fp-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 6px;
        }
        .fp-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #c084fc;
          font-weight: 700;
        }
        .fp-tabs {
          display: flex;
          gap: 4px;
        }
        .fp-tab {
          padding: 3px 8px;
          font-size: 0.66rem;
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #bbb;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fp-tab:hover {
          color: #fff;
          border-color: rgba(233, 30, 140, 0.4);
        }
        .fp-tab.active {
          background: #e91e8c;
          border-color: #ff60b0;
          color: #fff;
          box-shadow: 0 0 10px rgba(233, 30, 140, 0.5);
        }
        .resolution-guide {
          background: rgba(233, 30, 140, 0.1);
          border: 1px solid rgba(233, 30, 140, 0.25);
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 0.67rem;
          color: #e0e0f8;
          line-height: 1.35;
        }
        .fp-scroll-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          scrollbar-width: thin;
        }
        .fp-scroll-container::-webkit-scrollbar {
          height: 4px;
        }
        .fp-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(233, 30, 140, 0.4);
          border-radius: 4px;
        }
        .fp-card {
          width: 62px;
          height: 62px;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.12);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          flex-shrink: 0;
          background: #111;
        }
        .fp-card:hover {
          border-color: rgba(233, 30, 140, 0.7);
          transform: translateY(-2px) scale(1.04);
        }
        .fp-card.active {
          border-color: #fff;
          box-shadow: 0 0 14px var(--card-primary, #e91e8c), 0 0 28px rgba(233, 30, 140, 0.4);
          transform: translateY(-2px) scale(1.06);
        }
        .fp-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .fp-badge-type {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 0.55rem;
          padding: 1px 3px;
          border-radius: 4px;
          background: rgba(0,0,0,0.7);
        }
        .fp-name {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
          font-size: 0.54rem;
          color: #fff;
          font-weight: 600;
          text-align: center;
          padding: 2px 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fp-upload {
          background: rgba(255,255,255,0.04);
          border: 2px dashed rgba(233, 30, 140, 0.45);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }
        .fp-upload:hover {
          background: rgba(233, 30, 140, 0.15);
          border-color: #e91e8c;
        }
        .fp-upload-icon {
          font-size: 1.25rem;
          color: #e91e8c;
          line-height: 1;
        }
        .fp-upload-text {
          font-size: 0.6rem;
          color: #c084fc;
          font-weight: 600;
        }

        /* ── Upload Guidance Modal ── */
        .upload-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .upload-modal {
          width: 100%;
          max-width: 440px;
          border-radius: 16px;
          padding: 20px;
          background: rgba(14, 14, 22, 0.95);
          border: 1px solid rgba(233, 30, 140, 0.4);
          box-shadow: 0 12px 48px rgba(0,0,0,0.8), 0 0 30px rgba(233, 30, 140, 0.2);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .modal-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .modal-preview-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 8px 12px;
        }
        .modal-img-preview {
          width: 54px;
          height: 54px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .modal-img-dims {
          font-size: 0.76rem;
          color: #c084fc;
          font-weight: 600;
        }
        .modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 0.75rem;
          color: #e0e0f8;
          font-weight: 600;
        }
        .field-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-size: 0.85rem;
          outline: none;
        }
        .field-input:focus {
          border-color: #e91e8c;
          box-shadow: 0 0 8px rgba(233, 30, 140, 0.4);
        }
        .orientation-choice-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .choice-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #ccc;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .choice-card:hover {
          border-color: rgba(233, 30, 140, 0.5);
          background: rgba(255,255,255,0.08);
        }
        .choice-card.active {
          border-color: #e91e8c;
          background: rgba(233, 30, 140, 0.15);
          color: #fff;
          box-shadow: 0 0 14px rgba(233, 30, 140, 0.35);
        }
        .choice-icon {
          font-size: 1.6rem;
        }
        .choice-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .choice-text strong {
          font-size: 0.82rem;
        }
        .choice-text small {
          font-size: 0.7rem;
          color: #c084fc;
        }
        .choice-badge {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.6);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  )
}

function FilterCard({ filter, active, onClick }: { filter: FilterEntry; active: boolean; onClick: () => void }) {
  const isLandscape = filter.orientation === 'landscape'
  return (
    <div
      className={`fp-card${active ? ' active' : ''}`}
      onClick={onClick}
      title={`${filter.name} [${filter.idealResolution}]`}
      style={{ '--card-primary': filter.theme.primary } as React.CSSProperties}
    >
      <img className="fp-thumb" src={filter.thumb ?? filter.src} alt={filter.name} loading="lazy" />
      <span className="fp-badge-type">{isLandscape ? '💻' : '📱'}</span>
      <div className="fp-name">{filter.name}</div>
    </div>
  )
}
