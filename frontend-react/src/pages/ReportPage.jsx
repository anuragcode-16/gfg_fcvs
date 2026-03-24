import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ResultsDashboard from '../components/ResultsDashboard'
import ClaimCard from '../components/ClaimCard'
import ExportPanel from '../components/ExportPanel'
import SharePanel from '../components/SharePanel'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ReportPage() {
  const { sessionId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [verdictFilter, setVerdictFilter] = useState([])
  const [sortBy, setSortBy] = useState('confidence-desc')
  const [minConfidence, setMinConfidence] = useState(0)

  useEffect(() => {
    fetchReport()
  }, [sessionId])

  const fetchReport = async () => {
    try {
      // Try /api/result first (in-memory from current run)
      let resp = await fetch(`${API_URL}/api/result/${sessionId}`)
      if (resp.ok) {
        const data = await resp.json()
        if (data.result) {
          setResult(data.result)
          setLoading(false)
          return
        }
      }

      // Fallback to /api/history/:id
      resp = await fetch(`${API_URL}/api/history/${sessionId}`)
      if (resp.ok) {
        const data = await resp.json()
        setResult(data)
      } else {
        setError('Report not found. It may have been deleted or the link is invalid.')
      }
    } catch (e) {
      setError('Unable to load report. Make sure the backend server is running.')
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
        <div style={{ textAlign: 'center', padding: 100 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙️</div>
          <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading report...</div>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="container" style={{ paddingTop: 60, textAlign: 'center' }}>
          <div className="glass-card-static" style={{ padding: 60, maxWidth: 500, margin: '0 auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <h2 className="heading-md" style={{ marginBottom: 12 }}>Report Not Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              {error || 'This report does not exist or has expired.'}
            </p>
            <Link to="/app" className="btn-primary">
              Run a New Fact-Check →
            </Link>
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
              SHARED REPORT
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
                Session: {sessionId}
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
                {scoreLabel} — {overall.toFixed(1)}/100
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

        {/* Results Dashboard */}
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
              borderLeft: '3px solid var(--coral)',
              paddingLeft: 16,
            }}>
              {result.narrative}
            </div>
          </div>
        )}

        {/* Claim Filters & Cards */}
        {result.claims && result.claims.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="heading-md" style={{ marginBottom: 16 }}>
              Claim-by-Claim Analysis
            </h2>

            <div className="glass-card-static" style={{
              padding: '16px 20px',
              marginBottom: 16,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  Filter by Verdict
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['TRUE', 'FALSE', 'PARTIALLY TRUE', 'UNVERIFIABLE'].map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        setVerdictFilter(prev =>
                          prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
                        )
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${verdictFilter.includes(v) ? 'var(--coral)' : 'var(--border-glass)'}`,
                        background: verdictFilter.includes(v) ? 'rgba(227,106,106,0.1)' : 'transparent',
                        color: verdictFilter.includes(v) ? 'var(--coral)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ minWidth: 160 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  Sort by
                </label>
                <select
                  className="select-field"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  <option value="confidence-desc">Confidence ↓</option>
                  <option value="confidence-asc">Confidence ↑</option>
                  <option value="id">Claim ID</option>
                </select>
              </div>

              <div style={{ minWidth: 140 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  Min Confidence: {minConfidence}%
                </label>
                <input
                  type="range"
                  className="range-slider"
                  min={0}
                  max={100}
                  value={minConfidence}
                  onChange={e => setMinConfidence(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Showing {getFilteredClaims().length} of {result.claims.length} claims
            </div>

            {getFilteredClaims().map((claim, i) => (
              <ClaimCard key={claim.id || i} claim={claim} index={i} />
            ))}
          </div>
        )}

        {/* Export */}
        <ExportPanel result={result} />

        {/* Footer CTA */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div className="glass-card-static" style={{
            padding: '32px 40px',
            display: 'inline-block',
            maxWidth: 500,
          }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
              Want to verify your own claims?
            </p>
            <Link to="/app" className="btn-primary">
              ✦ Run Your Own Fact-Check
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
