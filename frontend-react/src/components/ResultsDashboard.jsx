const VERDICT_COLORS = {
  TRUE: '#10b981',
  FALSE: '#ef4444',
  'PARTIALLY TRUE': '#f59e0b',
  UNVERIFIABLE: '#94a3b8',
  OUTDATED: '#a78bfa',
}

function ScoreRing({ value, size = 140, strokeWidth = 10, color }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
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

function MiniBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 4,
        fontSize: '0.78rem',
      }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{
        height: 6,
        background: 'rgba(227,106,106,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.8s ease-out',
        }} />
      </div>
    </div>
  )
}

export default function ResultsDashboard({ result }) {
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

  return (
    <div>
      {/* Main Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 24,
        alignItems: 'center',
      }}>
        {/* Score Ring */}
        <div className="glass-card-static" style={{
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            letterSpacing: '2px',
          }}>
            CREDIBILITY
          </div>
          <ScoreRing value={overall} color={scoreColor} />
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div className="glass-card-static metric-card">
            <div className="metric-value verdict-true">{vc.TRUE || 0}</div>
            <div className="metric-label">TRUE Claims</div>
          </div>
          <div className="glass-card-static metric-card">
            <div className="metric-value verdict-false">{vc.FALSE || 0}</div>
            <div className="metric-label">FALSE Claims</div>
          </div>
          <div className="glass-card-static metric-card">
            <div className="metric-value verdict-partial">{vc['PARTIALLY TRUE'] || 0}</div>
            <div className="metric-label">Partial</div>
          </div>
          <div className="glass-card-static metric-card">
            <div className="metric-value verdict-unverifiable">{vc.UNVERIFIABLE || 0}</div>
            <div className="metric-label">Unverifiable</div>
          </div>
        </div>
      </div>

      {/* AI Detection Strip */}
      <div className="glass-card-static" style={{
        marginTop: 16,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: `3px solid ${aiColor}`,
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

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        marginTop: 16,
      }}>
        {/* Verdict Distribution */}
        <div className="glass-card-static" style={{ padding: 24 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '1px',
            marginBottom: 16,
          }}>
            VERDICT DISTRIBUTION
          </div>
          {Object.entries(vc).filter(([, v]) => v > 0).map(([verdict, count]) => (
            <MiniBar
              key={verdict}
              label={verdict}
              value={count}
              total={totalClaims}
              color={VERDICT_COLORS[verdict] || '#94a3b8'}
            />
          ))}
        </div>

        {/* Confidence Distribution */}
        <div className="glass-card-static" style={{ padding: 24 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '1px',
            marginBottom: 16,
          }}>
            CONFIDENCE DISTRIBUTION
          </div>
          {Object.entries(buckets).map(([label, count]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginBottom: 4,
                fontSize: '0.78rem',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bucketColors[label] }}>
                  {count}
                </span>
              </div>
              <div style={{
                height: 22,
                background: 'rgba(227,106,106,0.06)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(count / maxBucket) * 100}%`,
                  background: `${bucketColors[label]}33`,
                  borderLeft: `3px solid ${bucketColors[label]}`,
                  borderRadius: 4,
                  transition: 'width 0.8s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: bucketColors[label],
                  fontWeight: 600,
                }}>
                  {count > 0 ? count : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source Credibility */}
      {Object.keys(tierCounts).length > 0 && (
        <div className="glass-card-static" style={{ padding: 24, marginTop: 16 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '1px',
            marginBottom: 16,
          }}>
            🌐 SOURCE CREDIBILITY
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {Object.entries(tierCounts).map(([tier, count]) => (
              <div key={tier} style={{
                textAlign: 'center',
                padding: 16,
                background: `${tierColors[tier] || '#94a3b8'}08`,
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${tierColors[tier] || '#94a3b8'}22`,
              }}>
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
    </div>
  )
}
