import { useState } from 'react'

const VERDICT_META = {
  TRUE: { color: '#10b981', emoji: '', cls: 'true' },
  FALSE: { color: '#ef4444', emoji: '', cls: 'false' },
  'PARTIALLY TRUE': { color: '#f59e0b', emoji: '', cls: 'partial' },
  UNVERIFIABLE: { color: '#94a3b8', emoji: '', cls: 'unverifiable' },
  OUTDATED: { color: '#a78bfa', emoji: '', cls: 'outdated' },
}

const METHOD_COLORS = {
  bs4: '#3b82f6',
  selenium: '#f97316',
  playwright: '#a855f7',
  scrapling: '#10b981',
}

export default function ClaimCard({ claim, index }) {
  const [open, setOpen] = useState(false)

  const verdict = claim.verdict || 'UNVERIFIABLE'
  const meta = VERDICT_META[verdict] || VERDICT_META.UNVERIFIABLE
  const conf = claim.confidence_score || 0
  const confColor = conf >= 70 ? '#10b981' : conf >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div
      className="glass-card-static"
      style={{
        marginBottom: 12,
        overflow: 'hidden',
        borderLeft: `3px solid ${meta.color}`,
        animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
      }}
    >
      {/* Header */}
      <div
        className="expander-header"
        onClick={() => setOpen(!open)}
        style={{ padding: '14px 20px' }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span className={`verdict-badge ${meta.cls}`}>
            {verdict}
          </span>
          <span style={{
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}>
            [{(claim.id || '?').toUpperCase()}]
          </span>
          <span style={{
            fontSize: '0.88rem',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {claim.text || ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: confColor,
          }}>
            {conf}%
          </div>
          <span className={`expander-arrow ${open ? 'open' : ''}`}>▼</span>
        </div>
      </div>

      {/* Expanded Content */}
      {open && (
        <div style={{
          padding: '0 20px 20px',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 24,
          }}>
            {/* Left: Details */}
            <div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 12 }}>
                <strong>Full Claim:</strong> {claim.text}
              </div>

              <div style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}>
                <strong>Type:</strong>{' '}
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  background: 'rgba(227,106,106,0.06)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  {claim.type || 'GENERAL'}
                </span>
                {claim.temporally_sensitive && (
                  <span style={{ marginLeft: 8, color: '#f59e0b' }}>Temporally Sensitive</span>
                )}
              </div>

              {/* Reasoning */}
              {claim.reasoning && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    Verification Reasoning:
                  </div>
                  <div style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    borderLeft: '2px solid var(--border-glass)',
                    paddingLeft: 12,
                    lineHeight: 1.7,
                  }}>
                    {claim.reasoning}
                  </div>
                </div>
              )}

              {/* Self-reflection */}
              {claim.self_reflection && (
                <div style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  marginBottom: 12,
                }}>
                  <strong>Self-Reflection:</strong> {claim.self_reflection}
                </div>
              )}

              {/* Contradiction */}
              {claim.contradictions_detected && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.06)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  fontSize: '0.82rem',
                  color: '#ef4444',
                  marginBottom: 12,
                }}>
                  <strong>Conflict Detected:</strong> {claim.contradiction_explanation || 'Sources disagree.'}
                </div>
              )}

              {/* Temporal note */}
              {claim.temporal_note && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(59,130,246,0.06)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  fontSize: '0.82rem',
                  color: '#3b82f6',
                  marginBottom: 12,
                }}>
                  {claim.temporal_note}
                </div>
              )}
            </div>

            {/* Right: Confidence */}
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                letterSpacing: '1px',
                marginBottom: 4,
              }}>
                CONFIDENCE
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2rem',
                fontWeight: 700,
                color: confColor,
              }}>
                {conf}%
              </div>
              <div className="confidence-bar-track">
                <div
                  className="confidence-bar-fill"
                  style={{ width: `${conf}%`, background: confColor }}
                />
              </div>
            </div>
          </div>

          {/* Evidence Sources */}
          {claim.evidence && claim.evidence.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: 8,
              }}>
                Evidence Sources:
              </div>
              {claim.evidence.slice(0, 5).map((ev, i) => {
                const tier = ev.domain_tier || 4
                const tierColor = { 1: '#10b981', 2: '#3b82f6', 3: '#f59e0b', 4: '#94a3b8' }[tier]
                const methodColor = METHOD_COLORS[ev.method] || '#94a3b8'
                const isSupporting = (claim.supporting_citations || []).includes(ev.url)
                const isContradicting = (claim.contradicting_citations || []).includes(ev.url)

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.4)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isSupporting ? '#10b98133' : isContradicting ? '#ef444433' : 'var(--border-subtle)'}`,
                      marginBottom: 6,
                      fontSize: '0.8rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${methodColor}15`,
                      color: methodColor,
                      fontWeight: 600,
                    }}>
                      {(ev.method || '').toUpperCase()}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      color: tierColor,
                    }}>
                      T{tier}
                    </span>
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--coral)',
                        textDecoration: 'none',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ev.domain || ev.url}
                    </a>
                    {isSupporting && (
                      <span style={{ fontSize: '0.68rem', color: '#10b981' }}>Supporting</span>
                    )}
                    {isContradicting && (
                      <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>Contradicting</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
