import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

const FEATURES = [
  {
    icon: '',
    title: 'Multi-Stage Pipeline',
    desc: '7-stage verification pipeline from claim extraction through AI detection, with real-time progress.',
  },
  {
    icon: '',
    title: 'RAG-Powered Verdicts',
    desc: 'FAISS vector search & semantic matching ensure precise, evidence-grounded verification.',
  },
  {
    icon: '',
    title: 'Adaptive Scraping',
    desc: 'Waterfall architecture (BS4 → Selenium → Playwright → Scrapling) for robust evidence retrieval.',
  },
  {
    icon: '',
    title: 'Trust Scoring',
    desc: 'Domain credibility tiers weight evidence quality. Gov/Edu sources outrank blogs and unknowns.',
  },
  {
    icon: '',
    title: 'AI Content Detection',
    desc: 'Ensemble analysis combining statistical heuristics, LLM analysis, and external APIs.',
  },
  {
    icon: '',
    title: 'Session History',
    desc: 'Every verification is archived. Reload, compare, and export past reports anytime.',
  },
]

const STAGES = [
  { num: '01', label: 'Source Auth', color: '#E36A6A' },
  { num: '02', label: 'Claim Extract', color: '#e87e7e' },
  { num: '03', label: 'Query Gen', color: '#ec9292' },
  { num: '04', label: 'Evidence', color: '#f0a6a6' },
  { num: '05', label: 'Verification', color: '#FFB2B2' },
  { num: '06', label: 'Report', color: '#ec9292' },
  { num: '07', label: 'AI Detect', color: '#e87e7e' },
]

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 24px',
      }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >

            <h1 className="heading-xl" style={{ marginBottom: 8 }}>
              Every Claim.{' '}
              <br />
              <span className="text-gradient">Verified.</span>
            </h1>

            <p style={{
              fontSize: '1.15rem',
              color: 'var(--text-secondary)',
              maxWidth: 580,
              margin: '20px auto 40px',
              lineHeight: 1.7,
            }}>
              LumenAI decomposes text into atomic claims, retrieves real-world evidence,
              and delivers verifiable verdicts with confidence scores — all in real time.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/app" className="btn-primary" style={{ fontSize: '1.05rem', padding: '16px 40px' }}>
                Get Started
              </Link>
            </div>
          </div>

          {/* Pipeline Preview - Moved outside the 800px hero container */}
          <div
            style={{
              marginTop: 72,
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
              width: '100%',
              maxWidth: 1100,
              margin: '72px auto 0',
            }}
          >
            <div className="glass-card-static" style={{ padding: '28px 32px', overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                letterSpacing: '2px',
                marginBottom: 20,
                textAlign: 'left',
              }}>
                VERIFICATION PIPELINE
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 8,
              }}>
                {STAGES.map((stage, i) => (
                  <div
                    key={stage.num}
                    style={{
                      flex: '1 0 auto',
                      minWidth: 140,
                      padding: '14px 12px',
                      background: `${stage.color}22`,
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${stage.color}44`,
                      textAlign: 'center',
                      animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both`,
                    }}
                  >
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: stage.color,
                    }}>
                      STAGE {stage.num}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginTop: 4,
                      color: 'var(--text-primary)',
                    }}>
                      {stage.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 className="heading-lg">
              Powered by <span className="text-gradient">Intelligence</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12, maxWidth: 500, margin: '12px auto 0' }}>
              A comprehensive toolkit to combat misinformation and detect AI-generated content.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: '28px',
                  animation: `fadeInUp 0.5s ease-out ${i * 0.08}s both`,
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer style={{
        padding: '24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
      }}>
        Built by LumenAI — AI-Powered Fact Verification
      </footer>
    </div>
  )
}
