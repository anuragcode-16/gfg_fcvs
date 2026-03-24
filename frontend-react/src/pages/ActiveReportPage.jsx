import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ResultsDashboard from '../components/ResultsDashboard'
import ClaimCard from '../components/ClaimCard'
import ExportPanel from '../components/ExportPanel'
import SharePanel from '../components/SharePanel'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ActiveReportPage() {
  const location = useLocation()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(location.state?.sessionId || localStorage.getItem('lastSessionId'))

  // Filters
  const [verdictFilter, setVerdictFilter] = useState([])
  const [sortBy, setSortBy] = useState('confidence-desc')
  const [minConfidence, setMinConfidence] = useState(0)

  useEffect(() => {
    const sid = location.state?.sessionId || localStorage.getItem('lastSessionId')
    setSessionId(sid)
  }, [location.state?.sessionId])

  useEffect(() => {
    if (sessionId) {
      fetchReport(sessionId)
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const fetchReport = async (sid) => {
    setLoading(true)
    try {
      // Try /api/result first (in-memory)
      let resp = await fetch(`${API_URL}/api/result/${sid}`)
      if (resp.ok) {
        const data = await resp.json()
        if (data.result) {
          setResult(data.result)
          setLoading(false)
          return
        }
      }

      // Fallback to /api/history/:id
      resp = await fetch(`${API_URL}/api/history/${sid}`)
      if (resp.ok) {
        const data = await resp.json()
        setResult(data)
      } else {
        setError('Report not found.')
      }
    } catch (e) {
      setError('Failed to load report.')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredClaims = () => {
    if (!result?.claims) return []
    let claims = [...result.claims]
    if (verdictFilter.length > 0) {
      claims = claims.filter(c => verdictFilter.includes(c.verdict))
    }
    claims = claims.filter(c => (c.confidence_score || 0) >= minConfidence)
    if (sortBy === 'confidence-desc') {
      claims.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))
    } else if (sortBy === 'confidence-asc') {
      claims.sort((a, b) => (a.confidence_score || 0) - (b.confidence_score || 0))
    }
    return claims
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="container" style={{ paddingTop: 100, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)' }}>Loading active report...</div>
        </div>
      </div>
    )
  }

  if (!sessionId || error || !result) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
          <div className="glass-card-static" style={{ 
            padding: 60, 
            maxWidth: 600, 
            margin: '0 auto',
            border: '1px solid var(--border-glass)'
          }}>
            <h2 className="heading-md" style={{ marginBottom: 16 }}>No Report</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
              Run a <Link to="/app" style={{ color: 'var(--coral)', fontWeight: 600, textDecoration: 'none' }}>fact check</Link> or load a session from <Link to="/history" style={{ color: 'var(--coral)', fontWeight: 600, textDecoration: 'none' }}>history</Link> to see report.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/app" className="btn-primary">Start Verification</Link>
              <Link to="/history" className="btn-secondary">View History</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const overall = result.overall_accuracy_score || 0
  const scoreColor = overall >= 70 ? '#10b981' : overall >= 40 ? '#f59e0b' : '#ef4444'
  const scoreLabel = overall >= 70 ? 'High Credibility' : overall >= 40 ? 'Mixed Credibility' : 'Low Credibility'

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        {/* Report Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--coral)',
              letterSpacing: '2px',
              marginBottom: 8,
            }}>
              ACTIVE REPORT
            </div>
            <h1 className="heading-lg" style={{ marginBottom: 4 }}>
              Fact-Check <span className="text-gradient">Report</span>
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 8,
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '4px 12px',
                background: 'rgba(227,106,106,0.06)',
                borderRadius: 'var(--radius-full)',
              }}>
                Session: {sessionId.slice(0, 8)}...
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: scoreColor,
                padding: '4px 12px',
                background: `${scoreColor}11`,
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${scoreColor}33`,
              }}>
                {scoreLabel} - {overall.toFixed(1)}/100
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}>
                {result.total_claims || 0} claims verified
              </span>
            </div>
          </div>

          <SharePanel sessionId={sessionId} result={result} />
        </div>

        <ResultsDashboard result={result} />

        {/* Narrative */}
        {result.narrative && (
          <div className="glass-card-static" style={{ padding: 28, marginTop: 24 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              letterSpacing: '2px',
              marginBottom: 14,
            }}>
              EXECUTIVE SUMMARY
            </div>
            <div style={{
              fontSize: '1rem',
              color: 'var(--text-primary)',
              lineHeight: 1.8,
              fontStyle: 'italic',
              paddingLeft: 0,
            }}>
              {result.narrative}
            </div>
          </div>
        )}

        {/* Claim Analysis */}
        {result.claims && result.claims.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="heading-md" style={{ marginBottom: 16 }}>
              Claim-by-Claim Analysis
            </h2>

            <div className="toolbar-glass" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                  FILTER BY VERDICT
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['TRUE', 'FALSE', 'PARTIALLY TRUE', 'UNVERIFIABLE'].map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        setVerdictFilter(prev =>
                          prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
                        )
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${verdictFilter.includes(v) ? 'var(--coral)' : 'var(--border-glass)'}`,
                        background: verdictFilter.includes(v) ? 'rgba(227,106,106,0.1)' : 'white',
                        color: verdictFilter.includes(v) ? 'var(--coral)' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => !verdictFilter.includes(v) && (e.currentTarget.style.borderColor = 'var(--coral)')}
                      onMouseLeave={e => !verdictFilter.includes(v) && (e.currentTarget.style.borderColor = 'var(--border-glass)')}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                  SORT BY
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { id: 'confidence-desc', label: 'CONFIDENCE (H-L)' },
                    { id: 'confidence-asc', label: 'CONFIDENCE (L-H)' },
                    { id: 'id', label: 'ID' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: `1px solid ${sortBy === opt.id ? 'var(--coral)' : 'var(--border-glass)'}`,
                        background: sortBy === opt.id ? 'rgba(227,106,106,0.1)' : 'white',
                        color: sortBy === opt.id ? 'var(--coral)' : 'var(--text-secondary)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {getFilteredClaims().map((claim, i) => (
              <ClaimCard key={claim.id || i} claim={claim} index={i} />
            ))}
          </div>
        )}

        <ExportPanel result={result} />
      </div>
    </div>
  )
}
