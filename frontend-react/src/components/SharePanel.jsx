import { useState } from 'react'

export default function SharePanel({ sessionId, result }) {
  const [copied, setCopied] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)

  const shareUrl = `${window.location.origin}/report/${sessionId}`
  const overall = result?.overall_accuracy_score || 0
  const totalClaims = result?.total_claims || 0
  const scoreLabel = overall >= 70 ? 'High Credibility' : overall >= 40 ? 'Mixed Credibility' : 'Low Credibility'

  const shareText = `LumenAI Fact-Check Report: ${scoreLabel} (${overall.toFixed(1)}/100) — ${totalClaims} claims verified`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const shareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`
    window.open(url, '_blank')
  }

  const shareEmail = () => {
    const subject = encodeURIComponent(`LumenAI Fact-Check Report — ${scoreLabel}`)
    const body = encodeURIComponent(`${shareText}\n\nView the full interactive report here:\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const embedCode = `<iframe src="${shareUrl}" width="100%" height="800" frameborder="0" style="border-radius:12px;border:1px solid #e0e0e0;"></iframe>`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      {/* Copy Link Button */}
      <button
        onClick={copyLink}
        className="btn-primary"
        style={{
          padding: '10px 24px',
          fontSize: '0.88rem',
          background: copied
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : undefined,
        }}
      >
        {copied ? '✓ Link Copied!' : '🔗 Copy Share Link'}
      </button>

      {/* Share Buttons Row */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { icon: '𝕏', label: 'Twitter', onClick: shareTwitter, bg: '#1a1a2e' },
          { icon: 'in', label: 'LinkedIn', onClick: shareLinkedIn, bg: '#0077b5' },
          { icon: '💬', label: 'WhatsApp', onClick: shareWhatsApp, bg: '#25D366' },
          { icon: '✉️', label: 'Email', onClick: shareEmail, bg: 'var(--coral)' },
        ].map(s => (
          <button
            key={s.label}
            onClick={s.onClick}
            title={`Share on ${s.label}`}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.82rem',
              transition: 'all var(--transition-fast)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = s.bg
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = s.bg
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-glass)'
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.borderColor = 'var(--border-glass)'
            }}
          >
            {s.icon}
          </button>
        ))}
      </div>

      {/* Embed Toggle */}
      <button
        onClick={() => setShowEmbed(!showEmbed)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          textDecoration: 'underline',
        }}
      >
        {showEmbed ? 'Hide embed code' : '< / > Embed'}
      </button>

      {showEmbed && (
        <div style={{
          background: '#1a1a2e',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          maxWidth: 340,
          position: 'relative',
        }}>
          <code style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: '#10b981',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            display: 'block',
          }}>
            {embedCode}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(embedCode)
            }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 4,
              padding: '2px 8px',
              color: '#94a3b8',
              fontSize: '0.68rem',
              cursor: 'pointer',
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
