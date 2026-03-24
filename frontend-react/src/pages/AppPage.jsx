import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import InputSection from '../components/InputSection'
import AdvancedSettings from '../components/AdvancedSettings'
import PipelineMonitor from '../components/PipelineMonitor'
import ResultsDashboard from '../components/ResultsDashboard'
import ClaimCard from '../components/ClaimCard'
import ExportPanel from '../components/ExportPanel'
import SharePanel from '../components/SharePanel'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AppPage() {
  const [inputType, setInputType] = useState('text')
  const [inputText, setInputText] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [pdfFile, setPdfFile] = useState(null)

  const [settings, setSettings] = useState({
    maxClaims: 20,
    depth: 'standard',
    sourcesPerClaim: 5,
    minSourceQuality: 2,
  })

  const [pipelineState, setPipelineState] = useState('idle') // idle | running | complete | error
  const [pipelineLogs, setPipelineLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')

  const wsRef = useRef(null)

  const hasInput = inputText.trim() || inputUrl.trim() || pdfFile

  const handleVerify = useCallback(async () => {
    if (!hasInput) return

    setPipelineState('running')
    setPipelineLogs([])
    setProgress(0)
    setCurrentStage('stage_01')
    setStatusMessage('Starting pipeline...')
    setResult(null)
    setError('')

    try {
      const formData = new FormData()
      formData.append('input_text', inputText)
      formData.append('input_url', inputUrl)
      formData.append('max_claims', settings.maxClaims)
      formData.append('depth', settings.depth)
      formData.append('sources_per_claim', settings.sourcesPerClaim)
      formData.append('min_source_quality', settings.minSourceQuality)
      if (pdfFile) {
        formData.append('pdf_file', pdfFile)
      }

      const resp = await fetch(`${API_URL}/api/verify`, {
        method: 'POST',
        body: formData,
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || 'Failed to start pipeline')
      }

      const data = await resp.json()
      const sid = data.session_id
      setSessionId(sid)

      const wsHost = API_URL.replace('http', 'ws')
      const ws = new WebSocket(`${wsHost}/ws/pipeline/${sid}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)

        if (msg.stage === 'complete') {
          setPipelineState('complete')
          setProgress(100)
          setStatusMessage('Pipeline complete!')
          setResult(msg.result)
          ws.close()
          return
        }

        if (msg.stage === 'error') {
          setPipelineState('error')
          setError(msg.message)
          ws.close()
          return
        }

        if (msg.stage === 'stopped') {
          setPipelineState('error')
          setError('Pipeline stopped by user.')
          ws.close()
          return
        }

        setCurrentStage(msg.stage)
        setProgress(msg.pct || 0)
        setStatusMessage(msg.message || '')
        setPipelineLogs(prev => [...prev, msg])
      }

      ws.onerror = () => {
        setPipelineState('error')
        setError('WebSocket connection error')
      }

    } catch (err) {
      setPipelineState('error')
      setError(err.message)
    }
  }, [hasInput, inputText, inputUrl, pdfFile, settings])

  const handleStop = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/stop/${sessionId}`, { method: 'POST' })
      } catch (e) { /* ignore */ }
    }
    if (wsRef.current) {
      wsRef.current.send('stop')
    }
  }, [sessionId])

  const handleNewCheck = useCallback(() => {
    setPipelineState('idle')
    setPipelineLogs([])
    setProgress(0)
    setCurrentStage('')
    setStatusMessage('')
    setResult(null)
    setError('')
    setSessionId('')
    setInputText('')
    setInputUrl('')
    setPdfFile(null)
  }, [])

  // Filter claims
  const [verdictFilter, setVerdictFilter] = useState([])
  const [sortBy, setSortBy] = useState('confidence-desc')
  const [minConfidence, setMinConfidence] = useState(0)

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
            FACT VERIFICATION
          </div>
          <h1 className="heading-lg">
            Verify <span className="text-gradient">Claims</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Paste text, enter a URL, or upload a PDF to start fact-checking.
          </p>
        </div>

        {/* Input Section - only show when not running/complete */}
        {pipelineState === 'idle' && (
          <div className="animate-fade-in-up">
            <InputSection
              inputType={inputType}
              setInputType={setInputType}
              inputText={inputText}
              setInputText={setInputText}
              inputUrl={inputUrl}
              setInputUrl={setInputUrl}
              pdfFile={pdfFile}
              setPdfFile={setPdfFile}
            />

            <AdvancedSettings settings={settings} setSettings={setSettings} />

            {/* Verify Button */}
            <div style={{ marginTop: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                className="btn-primary"
                disabled={!hasInput}
                onClick={handleVerify}
                style={{ fontSize: '1rem', padding: '16px 40px' }}
              >
                ✦ VERIFY CLAIMS
              </button>
              {!hasInput && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Provide input to begin verification
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pipeline Monitor */}
        {(pipelineState === 'running' || pipelineState === 'complete') && (
          <PipelineMonitor
            currentStage={currentStage}
            progress={progress}
            statusMessage={statusMessage}
            logs={pipelineLogs}
            isRunning={pipelineState === 'running'}
            onStop={handleStop}
          />
        )}

        {/* Error Display */}
        {pipelineState === 'error' && (
          <div className="glass-card-static animate-fade-in-up" style={{
            padding: 24,
            borderLeft: '3px solid #ef4444',
            marginTop: 24,
          }}>
            <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>
              ⚠️ Pipeline Error
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {error}
            </div>
            <button className="btn-secondary" onClick={handleNewCheck} style={{ marginTop: 16 }}>
              🔄 Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 32 }}>
            <ResultsDashboard result={result} />

            {/* Narrative / Executive Summary */}
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

            {/* Claim Filters */}
            {result.claims && result.claims.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h2 className="heading-md" style={{ marginBottom: 16 }}>
                  Claim-by-Claim Analysis
                </h2>

                {/* Filters Row */}
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

                {/* Claims List */}
                {getFilteredClaims().map((claim, i) => (
                  <ClaimCard key={claim.id || i} claim={claim} index={i} />
                ))}
              </div>
            )}

            {/* Share & Report Link */}
            {sessionId && (
              <div className="glass-card-static" style={{
                padding: '20px 24px',
                marginTop: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '2px',
                    marginBottom: 6,
                  }}>
                    SHARE THIS REPORT
                  </div>
                  <Link
                    to={`/report/${sessionId}`}
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--coral)',
                      fontWeight: 500,
                    }}
                  >
                    Open full report page →
                  </Link>
                </div>
                <SharePanel sessionId={sessionId} result={result} />
              </div>
            )}

            {/* Export Section */}
            <ExportPanel result={result} />

            {/* New Check Button */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="btn-primary" onClick={handleNewCheck}>
                🔄 New Fact-Check
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
