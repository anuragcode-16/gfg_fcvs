import { useState } from 'react'

export default function SharePanel({ sessionId, result }) {
  const [copied, setCopied] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)

  const shareUrl = `${window.location.origin}/report/${sessionId}`
  const overall = result?.overall_accuracy_score || 0
  const totalClaims = result?.total_claims || 0
  const scoreLabel = overall >= 70 ? 'High Credibility' : overall >= 40 ? 'Mixed Credibility' : 'Low Credibility'

  const shareText = `LumenAI Fact-Check Report: ${scoreLabel} (${overall.toFixed(1)}/100) - ${totalClaims} claims verified`

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
    const subject = encodeURIComponent(`LumenAI Fact-Check Report - ${scoreLabel}`)
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
            : 'var(--coral)',
        }}
      >
        {copied ? 'Link Copied!' : 'Copy Link'}
      </button>

      {/* Share Buttons Row */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { icon: 'WhatsApp', label: 'WhatsApp', onClick: shareWhatsApp, bg: '#25D366' },
          { icon: 'Email', label: 'Email', onClick: shareEmail, bg: '#5D8AD4' },
        ].map(s => (
          <button
            key={s.label}
            onClick={s.onClick}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all var(--transition-smooth)',
              color: 'var(--text-primary)',
              minWidth: 110,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = s.bg
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = s.bg
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-glass)'
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.borderColor = 'var(--border-glass)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

    </div>
  )
}
