import { useState } from 'react'

export default function AdvancedSettings({ settings, setSettings }) {
  const [open, setOpen] = useState(false)

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }))

  return (
    <div className="glass-card-static" style={{ marginTop: 16, overflow: 'hidden' }}>
      <div
        className="expander-header"
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          ⚙️ Advanced Settings
        </span>
        <span className={`expander-arrow ${open ? 'open' : ''}`}>▼</span>
      </div>

      {open && (
        <div style={{ padding: '0 18px 18px', animation: 'fadeInUp 0.3s ease-out' }}>
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
                <option value={1}>🟢 Tier 1 Only (Gov, Academic)</option>
                <option value={2}>🔵 Tier 1+2 (+ Major News)</option>
                <option value={3}>🟡 Tier 1-3 (+ Blogs)</option>
                <option value={4}>⚪ All Sources</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
