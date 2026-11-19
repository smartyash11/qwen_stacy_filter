import React from 'react'
import type { CameraError } from '../hooks/useCamera'

type PermissionStatus = 'idle' | 'requesting' | 'denied' | 'not-found' | 'error'

interface PermissionStateProps {
  status: PermissionStatus
  error?: CameraError | null
  onRetry?: () => void
}

const CONFIG: Record<
  PermissionStatus,
  { icon: string; title: string; color: string }
> = {
  idle: {
    icon: '🕷️',
    title: 'Ready to Activate',
    color: 'var(--lavender)',
  },
  requesting: {
    icon: '📷',
    title: 'Requesting Camera…',
    color: 'var(--magenta)',
  },
  denied: {
    icon: '🚫',
    title: 'Camera Access Denied',
    color: 'var(--magenta)',
  },
  'not-found': {
    icon: '🔍',
    title: 'No Camera Found',
    color: 'var(--lavender)',
  },
  error: {
    icon: '⚠️',
    title: 'Camera Error',
    color: 'var(--magenta)',
  },
}

export function PermissionState({ status, error, onRetry }: PermissionStateProps) {
  const cfg = CONFIG[status]

  return (
    <div className="permission-state">
      <div className="permission-card glass fade-in">
        {/* Spider-web decoration */}
        <div className="web-deco" aria-hidden="true">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="web-line"
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="web-ring"
              style={{
                width: `${(i + 1) * 22}%`,
                height: `${(i + 1) * 22}%`,
              }}
            />
          ))}
        </div>

        <div className="permission-content">
          <span
            className="permission-icon"
            style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.color}` }}
          >
            {cfg.icon}
          </span>

          <h2 className="permission-title" style={{ color: cfg.color }}>
            {cfg.title}
          </h2>

          {error && (
            <p className="permission-message">{error.message}</p>
          )}

          {status === 'idle' && (
            <p className="permission-message">
              Activate your camera to enter the Spider-Gwen AR experience.
              <br />
              Show L-shapes with both hands to open the multiverse portal.
            </p>
          )}

          {status === 'requesting' && (
            <div className="spinner" style={{ marginTop: 8 }} />
          )}

          {status === 'denied' && (
            <div className="permission-steps">
              <p className="steps-title">How to re-enable:</p>
              <ol className="steps-list">
                <li>Click the 🔒 lock icon in the address bar</li>
                <li>Find "Camera" in site permissions</li>
                <li>Change to "Allow" and reload the page</li>
              </ol>
            </div>
          )}

          {(status === 'denied' || status === 'not-found' || status === 'error') && onRetry && (
            <button className="btn btn-secondary" onClick={onRetry} style={{ marginTop: 16 }}>
              Try Again
            </button>
          )}
        </div>
      </div>

      <style>{`
        .permission-state {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: var(--bg);
          padding: 24px;
        }
        .permission-card {
          position: relative;
          max-width: 460px;
          width: 100%;
          padding: 48px 36px;
          text-align: center;
          overflow: hidden;
        }
        .web-deco {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: 0.08;
        }
        .web-line {
          position: absolute;
          width: 2px;
          height: 100%;
          background: var(--magenta);
          transform-origin: center center;
        }
        .web-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid var(--magenta);
        }
        .permission-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .permission-icon {
          font-size: 64px;
          line-height: 1;
        }
        .permission-title {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .permission-message {
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 340px;
        }
        .permission-steps {
          background: rgba(232, 30, 140, 0.08);
          border: 1px solid var(--magenta-dim);
          border-radius: 10px;
          padding: 14px 20px;
          text-align: left;
          max-width: 320px;
          width: 100%;
        }
        .steps-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--magenta);
          margin-bottom: 8px;
        }
        .steps-list {
          list-style: decimal;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}

