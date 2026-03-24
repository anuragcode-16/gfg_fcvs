import { useEffect, useRef } from 'react'

const STAGES = [
  { id: 'stage_01', label: 'Source Auth', icon: '🔐' },
  { id: 'stage_02', label: 'Claim Extract', icon: '🔬' },
  { id: 'stage_03', label: 'Query Gen', icon: '🔍' },
  { id: 'stage_04', label: 'Evidence', icon: '🌐' },
  { id: 'stage_05', label: 'Verification', icon: '⚖️' },
  { id: 'stage_06', label: 'Report', icon: '📊' },
  { id: 'stage_07', label: 'AI Detect', icon: '🤖' },
]

function getStageIndex(stageId) {
  return STAGES.findIndex(s => s.id === stageId)
}

export default function PipelineMonitor({
  currentStage, progress, statusMessage, logs, isRunning, onStop
}) {
  const logContainerRef = useRef(null)
  const currentIdx = getStageIndex(currentStage)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="animate-fade-in-up" style={{ marginTop: 24 }}>
      {/* Header + Stop Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="heading-md">
          {isRunning ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙️</span>
              Live Pipeline
            </span>
          ) : '✓ Pipeline Complete'}
        </h2>

        {isRunning && (
          <button
            className="btn-secondary"
            onClick={onStop}
            style={{
              borderColor: '#ef4444',
              color: '#ef4444',
            }}
          >
            🛑 Stop
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-track" style={{ marginBottom: 20 }}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage Indicators */}
      <div className="glass-card-static" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`,
          gap: 8,
        }}>
          {STAGES.map((stage, i) => {
            const isDone = i < currentIdx || (!isRunning && progress >= 100)
            const isCurrent = i === currentIdx && isRunning
            const isPending = i > currentIdx

            return (
              <div
                key={stage.id}
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  borderRadius: 'var(--radius-sm)',
                  background: isDone
                    ? 'rgba(16, 185, 129, 0.08)'
                    : isCurrent
                    ? 'rgba(227, 106, 106, 0.1)'
                    : 'rgba(255, 242, 208, 0.3)',
                  border: `1px solid ${
                    isDone ? 'rgba(16,185,129,0.2)' : isCurrent ? 'rgba(227,106,106,0.3)' : 'transparent'
                  }`,
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{
                  fontSize: '1.2rem',
                  marginBottom: 4,
                  opacity: isPending ? 0.4 : 1,
                }}>
                  {isDone ? '✓' : isCurrent ? stage.icon : '○'}
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: isDone || isCurrent ? 600 : 400,
                  color: isDone
                    ? '#10b981'
                    : isCurrent
                    ? 'var(--coral)'
                    : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {stage.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--coral)',
          marginBottom: 12,
          padding: '8px 0',
        }}>
          {isRunning && <span className="animate-pulse">●</span>} {statusMessage}
        </div>
      )}

      {/* Terminal Log */}
      <div className="terminal-log" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>Waiting for pipeline output...</div>
        ) : (
          logs.slice(-20).map((log, i) => (
            <div key={i} className="terminal-line">
              <span className="line-num">[{String(log.pct || 0).padStart(3, ' ')}%]</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
