import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const VERDICT_COLORS = {
  TRUE: '#10b981',
  FALSE: '#ef4444',
  'PARTIALLY TRUE': '#f59e0b',
  UNVERIFIABLE: '#94a3b8',
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/history`)
      if (resp.ok) {
        const data = await resp.json()
        setHistory(data)
      }
    } catch (e) {
      console.error('Failed to fetch history:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const totalSessions = history.length
  const avgAccuracy = totalSessions > 0
    ? (history.reduce((sum, s) => sum + (s.overall_accuracy_score || 0), 0) / totalSessions)
    : 0
  const totalClaims = history.reduce((sum, s) => sum + (s.total_claims || 0), 0)
  const totalFalse = history.reduce((sum, s) => sum + (s.verdict_counts?.FALSE || 0), 0)

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--coral)',
            letterSpacing: '2px',
            marginBottom: 8,
          }}>
            SESSION ARCHIVE
          </div>
          <h1 className="heading-lg">
            <span className="text-gradient">History</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Browse and reload past fact-check sessions.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ color: 'var(--text-muted)' }}>Loading history...</div>
          </div>
        ) : (history.length === 0 || error) ? (
          <div className="glass-card-static" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No sessions yet
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Run a fact-check from the Verify page to see results here.
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate('/app')}
              style={{ marginTop: 20 }}
            >
              Start Fact-Checking
            </button>
          </div>
        ) : (
          <>
            {/* Summary Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              {[
                { label: 'Total Sessions', value: totalSessions, color: 'var(--coral)' },
                { label: 'Avg Accuracy', value: `${avgAccuracy.toFixed(1)}`, color: avgAccuracy >= 70 ? '#10b981' : '#f59e0b' },
                { label: 'Total Claims', value: totalClaims, color: 'var(--text-primary)' },
                { label: 'FALSE Found', value: totalFalse, color: '#ef4444' },
              ].map((m, i) => (
                <div key={i} className="glass-card-static metric-card">
                  <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Sessions Table */}
            <div className="glass-card-static" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.82rem',
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: '1px solid var(--border-glass)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '1px',
                    }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>SESSION</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>TYPE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACCURACY</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>CLAIMS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>TRUE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>FALSE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>AI PROB</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((session, i) => {
                      const vc = session.verdict_counts || {}
                      const acc = session.overall_accuracy_score || 0
                      const accColor = acc >= 70 ? '#10b981' : acc >= 40 ? '#f59e0b' : '#ef4444'
                      const aiProb = session.ai_detection?.ensemble_probability || 0

                      return (
                        <tr
                          key={session.session_id || i}
                          style={{
                            borderBottom: '1px solid rgba(255,178,178,0.1)',
                            transition: 'background var(--transition-fast)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,242,208,0.3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setSelectedSession(session)}
                        >
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {history.length - i}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                            {session.session_id || '-'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(227,106,106,0.06)',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                            }}>
                              {(session.input_type || 'text').toUpperCase()}
                            </span>
                          </td>
                          <td style={{
                            padding: '12px 16px', textAlign: 'center',
                            fontFamily: 'var(--font-mono)', fontWeight: 600, color: accColor,
                          }}>
                            {acc.toFixed(1)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            {session.total_claims || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                            {vc.TRUE || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                            {vc.FALSE || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            {typeof aiProb === 'number' ? `${aiProb.toFixed(0)}%` : '-'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              className="btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                localStorage.setItem('lastSessionId', session.session_id)
                                navigate('/report', { state: { sessionId: session.session_id } })
                              }}
                              style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                            >
                              Open Report
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Session Details */}
            {selectedSession && (
              <div className="glass-card-static animate-fade-in-up" style={{ marginTop: 24, padding: 28 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '2px',
                      marginBottom: 6,
                    }}>
                      SESSION DETAIL
                    </div>
                    <h3 className="heading-md">
                      Session {selectedSession.session_id}
                    </h3>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedSession(null)}
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  >
                    Close
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>Input Preview</div>
                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      maxHeight: 100,
                      overflow: 'hidden',
                    }}>
                      {selectedSession.text_sample || 'No preview available'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>Narrative</div>
                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                    }}>
                      {(selectedSession.narrative || '').slice(0, 200)}...
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>Verdict Breakdown</div>
                    {Object.entries(selectedSession.verdict_counts || {}).map(([verdict, count]) => (
                      count > 0 && (
                        <div key={verdict} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                          fontSize: '0.82rem',
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: VERDICT_COLORS[verdict] || '#94a3b8',
                          }} />
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            color: VERDICT_COLORS[verdict] || '#94a3b8',
                          }}>
                            {verdict}: {count}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
