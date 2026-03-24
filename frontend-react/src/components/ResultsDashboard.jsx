import { useState } from 'react'

const VERDICT_COLORS = {
  TRUE: '#10b981',
  FALSE: '#ef4444',
  'PARTIALLY TRUE': '#f59e0b',
  UNVERIFIABLE: '#94a3b8',
  OUTDATED: '#a78bfa',
}

function ScoreRing({ value, size = 140, strokeWidth = 10, color, onHover }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div 
      style={{ position: 'relative', width: size, height: size }} 
      className="hover-glow"
      onMouseEnter={(e) => onHover && onHover(true, e, `Credibility: ${value.toFixed(1)}%`)}
      onMouseLeave={() => onHover && onHover(false)}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(227,106,106,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.8rem',
          fontWeight: 700,
          color,
        }}>
          {value.toFixed(0)}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/ 100</div>
      </div>
    </div>
  )
}

function MiniBar({ label, value, total, color, onHover }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div 
      style={{ marginBottom: 16, cursor: 'pointer' }} 
      className="interactive-bar-container"
      onMouseEnter={(e) => onHover(true, e, `${label}: ${value} (${pct.toFixed(1)}%)`)}
      onMouseLeave={() => onHover(false)}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 4,
        fontSize: '0.78rem',
      }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{
        height: 8,
        background: 'rgba(227,106,106,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
          color: color // For currentColor in CSS
        }} className="interactive-bar-fill" />
      </div>
    </div>
  )
}

function PieChart({ data, size = 180, onHover }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let cumulativePercent = 0

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent)
    const y = Math.sin(2 * Math.PI * percent)
    return [x, y]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
      <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {data.map((slice, i) => {
          if (slice.value === 0) return null
          
          const startPercent = cumulativePercent
          cumulativePercent += slice.value / total
          const endPercent = cumulativePercent

          const [startX, startY] = getCoordinatesForPercent(startPercent)
          const [endX, endY] = getCoordinatesForPercent(endPercent)
          const largeArcFlag = slice.value / total > 0.5 ? 1 : 0
          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L 0 0`,
          ].join(' ')

          return (
            <path
              key={i}
              d={pathData}
              fill={slice.color}
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                opacity: 0.8
              }}
              className="interactive-pie-slice"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'scale(1.05)'
                onHover(true, e, `${slice.label}: ${slice.value}`)
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8'
                e.currentTarget.style.transform = 'scale(1)'
                onHover(false)
              }}
            />
          )
        })}
        <circle r="0.4" fill="var(--bg-glass)" style={{ backdropFilter: 'blur(5px)' }} />
      </svg>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: 12, 
        marginTop: 20,
        maxWidth: 240
      }}>
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {d.label} ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ResultsDashboard({ result }) {
  const [fullscreenItem, setFullscreenItem] = useState(null)
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' })
  const [verdictView, setVerdictView] = useState('bar')
  const [confidenceView, setConfidenceView] = useState('bar')

  if (!result) return null
  
  const overall = result.overall_accuracy_score || 0
  const vc = result.verdict_counts || {}
  const totalClaims = result.total_claims || 0
  const aiProb = result.ai_detection?.ensemble_probability || 0
  const aiLabel = result.ai_detection?.label || 'N/A'
  const scoreColor = overall >= 70 ? '#10b981' : overall >= 40 ? '#f59e0b' : '#ef4444'
  const aiColor = aiProb >= 70 ? '#ef4444' : aiProb >= 40 ? '#f59e0b' : '#10b981'

  // Confidence distribution
  const buckets = { 'Low': 0, 'Medium': 0, 'High': 0, 'Very High': 0 }
  const claims = result.claims || []
  claims.forEach(c => {
    const conf = c.confidence_score || 0
    if (conf <= 29) buckets['Low']++
    else if (conf <= 69) buckets['Medium']++
    else if (conf <= 89) buckets['High']++
    else buckets['Very High']++
  })
  const maxBucket = Math.max(...Object.values(buckets), 1)
  const bucketColors = { Low: '#ef4444', Medium: '#f59e0b', High: '#3b82f6', 'Very High': '#10b981' }

  // Source credibility
  const allEvidence = claims.flatMap(c => c.evidence || [])
  const tierCounts = {}
  allEvidence.forEach(e => {
    const tier = e.domain_tier || 4
    const label = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3', 4: 'Tier 4' }[tier] || 'Unknown'
    tierCounts[label] = (tierCounts[label] || 0) + 1
  })
  const maxTier = Math.max(...Object.values(tierCounts), 1)
  const tierColors = { 'Tier 1': '#10b981', 'Tier 2': '#3b82f6', 'Tier 3': '#f59e0b', 'Tier 4': '#94a3b8' }

  const FullscreenButton = ({ id }) => (
    <button
      onClick={() => setFullscreenItem(id)}
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'rgba(227, 106, 106, 0.05)',
        border: '1px solid var(--border-glass)',
        borderRadius: 4,
        width: 24,
        height: 24,
        color: 'var(--coral)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(227, 106, 106, 0.15)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(227, 106, 106, 0.05)'}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6"/>
      </svg>
    </button>
  )

  return (
    <div>
      {/* Main Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 24,
        alignItems: 'stretch',
      }}>
        {/* Score Ring */}
        <div className="glass-card-static" style={{
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          position: 'relative'
        }}>
          <FullscreenButton id="credibility" />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            letterSpacing: '2px',
          }}>
            CREDIBILITY
          </div>
          <ScoreRing 
            value={overall} 
            color={scoreColor}
            onHover={(show, e, content) => {
              if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
              else setTooltip({ ...tooltip, show: false })
            }}
          />
        </div>

        {/* Metrics Grid + AI Strip Side-by-Side with Ring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="glass-card-static metric-card">
              <div className="metric-value verdict-true">{vc.TRUE || 0}</div>
              <div className="metric-label">TRUE</div>
            </div>
            <div className="glass-card-static metric-card">
              <div className="metric-value verdict-false">{vc.FALSE || 0}</div>
              <div className="metric-label">FALSE</div>
            </div>
            <div className="glass-card-static metric-card">
              <div className="metric-value verdict-partial">{vc['PARTIALLY TRUE'] || 0}</div>
              <div className="metric-label">PARTIAL</div>
            </div>
            <div className="glass-card-static metric-card">
              <div className="metric-value verdict-unverifiable">{vc.UNVERIFIABLE || 0}</div>
              <div className="metric-label">UNVERIFIABLE</div>
            </div>
          </div>

          {/* AI Detection Strip - Beside Ring, Below Metrics */}
          <div className="glass-card-static" style={{
            padding: '16px 24px',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                letterSpacing: '2px',
                marginBottom: 4,
              }}>
                AI TEXT PROBABILITY
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {aiLabel}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '2rem',
              fontWeight: 700,
              color: aiColor,
            }}>
              {typeof aiProb === 'number' ? `${aiProb.toFixed(0)}%` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        marginTop: 16,
      }}>
        {/* Verdict Distribution */}
        <div className="glass-card-static" style={{ padding: 24, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, right: 50, display: 'flex', gap: 8, zIndex: 6 }}>
            <button
              onClick={() => setVerdictView('bar')}
              style={{
                background: verdictView === 'bar' ? 'var(--coral)' : 'transparent',
                border: '1px solid var(--border-glass)',
                borderRadius: 4,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: verdictView === 'bar' ? 'white' : 'var(--text-muted)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </button>
            <button
              onClick={() => setVerdictView('pie')}
              style={{
                background: verdictView === 'pie' ? 'var(--coral)' : 'transparent',
                border: '1px solid var(--border-glass)',
                borderRadius: 4,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: verdictView === 'pie' ? 'white' : 'var(--text-muted)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"/>
              </svg>
            </button>
          </div>
          <FullscreenButton id="verdicts" />
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)',
            letterSpacing: '1px', marginBottom: 16,
          }}>
            VERDICT DISTRIBUTION
          </div>
          {verdictView === 'bar' ? (
            Object.entries(vc).filter(([, v]) => v > 0).map(([verdict, count]) => (
              <MiniBar
                key={verdict}
                label={verdict}
                value={count}
                total={totalClaims}
                color={VERDICT_COLORS[verdict] || '#94a3b8'}
                onHover={(show, e, content) => {
                  if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                  else setTooltip({ ...tooltip, show: false })
                }}
              />
            ))
          ) : (
            <PieChart
              data={Object.entries(vc).map(([label, value]) => ({ label, value, color: VERDICT_COLORS[label] }))}
              onHover={(show, e, content) => {
                if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                else setTooltip({ ...tooltip, show: false })
              }}
            />
          )}
        </div>

        {/* Confidence Distribution */}
        <div className="glass-card-static" style={{ padding: 24, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, right: 50, display: 'flex', gap: 8, zIndex: 6 }}>
            <button
              onClick={() => setConfidenceView('bar')}
              style={{
                background: confidenceView === 'bar' ? 'var(--coral)' : 'transparent',
                border: '1px solid var(--border-glass)',
                borderRadius: 4,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: confidenceView === 'bar' ? 'white' : 'var(--text-muted)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </button>
            <button
              onClick={() => setConfidenceView('pie')}
              style={{
                background: confidenceView === 'pie' ? 'var(--coral)' : 'transparent',
                border: '1px solid var(--border-glass)',
                borderRadius: 4,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: confidenceView === 'pie' ? 'white' : 'var(--text-muted)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"/>
              </svg>
            </button>
          </div>
          <FullscreenButton id="confidence" />
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)',
            letterSpacing: '1px', marginBottom: 16,
          }}>
            CONFIDENCE DISTRIBUTION
          </div>
          {confidenceView === 'bar' ? (
            Object.entries(buckets).map(([label, count]) => (
              <MiniBar
                key={label}
                label={`${label} Confidence`}
                value={count}
                total={totalClaims}
                color={bucketColors[label]}
                onHover={(show, e, content) => {
                  if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                  else setTooltip({ ...tooltip, show: false })
                }}
              />
            ))
          ) : (
            <PieChart
              data={Object.entries(buckets).map(([label, value]) => ({ label, value, color: bucketColors[label] }))}
              onHover={(show, e, content) => {
                if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                else setTooltip({ ...tooltip, show: false })
              }}
            />
          )}
        </div>
      </div>

      {/* Source Credibility */}
      {Object.keys(tierCounts).length > 0 && (
        <div className="glass-card-static" style={{ padding: 24, marginTop: 16, position: 'relative' }}>
          <FullscreenButton id="sources" />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '1px',
            marginBottom: 16,
          }}>
            SOURCE CREDIBILITY
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {Object.entries(tierCounts).map(([tier, count]) => (
              <div key={tier} 
                className="hover-glow"
                style={{
                  textAlign: 'center',
                  padding: 16,
                  background: `${tierColors[tier] || '#94a3b8'}08`,
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${tierColors[tier] || '#94a3b8'}22`,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => setTooltip({ show: true, x: e.clientX, y: e.clientY, content: `${tier}: ${count} sources` })}
                onMouseLeave={() => setTooltip({ ...tooltip, show: false })}
              >
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: tierColors[tier] || '#94a3b8',
                }}>
                  {count}
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {fullscreenItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 252, 248, 0.95)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          backdropFilter: 'blur(20px)'
        }}>
          <button
            onClick={() => setFullscreenItem(null)}
            style={{
              position: 'absolute',
              top: 30,
              right: 30,
              background: 'var(--coral)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(227,106,106,0.3)'
            }}
          >
            x
          </button>

          <div style={{ width: '100%', maxWidth: 1000 }}>
            {fullscreenItem === 'credibility' && (
              <div style={{ textAlign: 'center' }}>
                <h2 className="heading-lg" style={{ marginBottom: 40 }}>OVERALL CREDIBILITY</h2>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ScoreRing 
                    value={overall} 
                    size={400} 
                    strokeWidth={24} 
                    color={scoreColor} 
                    onHover={(show, e, content) => {
                      if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                      else setTooltip({ ...tooltip, show: false })
                    }}
                  />
                </div>
              </div>
            )}
            {fullscreenItem === 'verdicts' && (
              <div>
                <h2 className="heading-lg" style={{ marginBottom: 40, textAlign: 'center' }}>VERDICT DISTRIBUTION</h2>
                {verdictView === 'bar' ? (
                  Object.entries(vc).map(([verdict, count]) => (
                    <div style={{ marginBottom: 30 }} key={verdict}>
                      <MiniBar
                        label={verdict}
                        value={count}
                        total={totalClaims}
                        color={VERDICT_COLORS[verdict] || '#94a3b8'}
                        onHover={(show, e, content) => {
                          if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                          else setTooltip({ ...tooltip, show: false })
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <PieChart
                    size={400}
                    data={Object.entries(vc).map(([label, value]) => ({ label, value, color: VERDICT_COLORS[label] }))}
                    onHover={(show, e, content) => {
                      if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                      else setTooltip({ ...tooltip, show: false })
                    }}
                  />
                )}
              </div>
            )}
            {fullscreenItem === 'confidence' && (
               <div>
                 <h2 className="heading-lg" style={{ marginBottom: 40, textAlign: 'center' }}>CONFIDENCE DISTRIBUTION</h2>
                 {confidenceView === 'bar' ? (
                   Object.entries(buckets).map(([label, count]) => (
                     <div style={{ marginBottom: 30 }} key={label}>
                       <MiniBar
                         label={`${label} Confidence`}
                         value={count}
                         total={totalClaims}
                         color={bucketColors[label]}
                         onHover={(show, e, content) => {
                           if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                           else setTooltip({ ...tooltip, show: false })
                         }}
                       />
                     </div>
                   ))
                 ) : (
                    <PieChart
                      size={400}
                      data={Object.entries(buckets).map(([label, value]) => ({ label, value, color: bucketColors[label] }))}
                      onHover={(show, e, content) => {
                        if (show) setTooltip({ show: true, x: e.clientX, y: e.clientY, content })
                        else setTooltip({ ...tooltip, show: false })
                      }}
                    />
                 )}
               </div>
            )}
            {fullscreenItem === 'sources' && (
              <div>
                <h2 className="heading-lg" style={{ marginBottom: 40, textAlign: 'center' }}>SOURCE CREDIBILITY</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 30 }}>
                  {Object.entries(tierCounts).map(([tier, count]) => (
                    <div key={tier} 
                      className="hover-glow"
                      style={{
                        textAlign: 'center',
                        padding: 40,
                        background: 'white',
                        borderRadius: 20,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
                        border: `1px solid ${tierColors[tier]}33`,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => setTooltip({ show: true, x: e.clientX, y: e.clientY, content: `${tier}: ${count} sources` })}
                      onMouseLeave={() => setTooltip({ show: true, show: false })}
                    >
                      <div style={{ fontSize: '4rem', fontWeight: 800, color: tierColors[tier] }}>{count}</div>
                      <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: 10, letterSpacing: 2 }}>{tier}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Tooltip */}
      {tooltip.show && (
        <div style={{
          position: 'fixed',
          top: tooltip.y - 45,
          left: tooltip.x + 15,
          background: 'rgba(26, 26, 46, 0.95)',
          color: 'white',
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
          zIndex: 10000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
