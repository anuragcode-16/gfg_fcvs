import { useState } from 'react'

export default function AdvancedSettings({ settings, setSettings }) {
  const [open, setOpen] = useState(false)

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }))

  return (
    <div style={{ marginTop: 0, overflow: 'visible', position: 'relative' }}>
      <div
        className="btn-secondary"
        onClick={() => setOpen(!open)}
        style={{
          padding: '16px 32px',
          fontSize: '1rem',
          fontWeight: 600,
          background: open ? 'var(--gold-light)' : 'var(--bg-glass)',
          borderColor: open ? 'var(--coral)' : 'var(--border-glass)',
          minWidth: 220,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span>Advanced Settings</span>
        <span className={`expander-arrow ${open ? 'open' : ''}`}>▼</span>
      </div>

      {open && (
        <div className="glass-card-static animate-fade-in-up" style={{
          position: 'absolute',
          bottom: 'calc(100% + 12px)',
          left: 0,
          width: '550px',
          maxWidth: '90vw',
          padding: '24px',
          zIndex: 1000,
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--coral)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 8,
          }}>
            {/* Depth */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Search Depth
              </label>
              <select
                className="select-field"
                value={settings.depth}
                onChange={e => update('depth', e.target.value)}
              >
                <option value="quick">Quick Depth</option>
                <option value="standard">Standard Depth</option>
                <option value="deep">Deep Depth</option>
              </select>
            </div>

            {/* Max Claims */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Max Claims: {settings.maxClaims}
              </label>
              <input
                type="range"
                className="range-slider"
                min={5}
                max={50}
                value={settings.maxClaims}
                onChange={e => update('maxClaims', Number(e.target.value))}
              />
            </div>

            {/* Sources per Claim */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Sources per Claim: {settings.sourcesPerClaim}
              </label>
              <input
                type="range"
                className="range-slider"
                min={3}
                max={10}
                value={settings.sourcesPerClaim}
                onChange={e => update('sourcesPerClaim', Number(e.target.value))}
              />
            </div>

            {/* Min Source Quality */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Min Source Quality
              </label>
              <select
                className="select-field"
                value={settings.minSourceQuality}
                onChange={e => update('minSourceQuality', Number(e.target.value))}
              >
                <option value={1}>Tier 1 (Basic: Gov, Acad)</option>
                <option value={2}>Tier 2 (Standard: News)</option>
                <option value={3}>Tier 3 (High: Blogs)</option>
                <option value={4}>Tier 4 (Advanced: All)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
