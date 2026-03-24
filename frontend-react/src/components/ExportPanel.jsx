export default function ExportPanel({ result }) {
  if (!result) return null

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factcheck_${result.session_id || 'report'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    const claims = result.claims || []
    const headers = ['id', 'claim', 'type', 'verdict', 'confidence', 'reasoning', 'supporting_sources', 'contradicting_sources', 'temporally_sensitive']
    const rows = claims.map(c => [
      c.id || '',
      `"${(c.text || '').replace(/"/g, '""')}"`,
      c.type || '',
      c.verdict || '',
      c.confidence_score || 0,
      `"${(c.reasoning || '').replace(/"/g, '""')}"`,
      (c.supporting_citations || []).length,
      (c.contradicting_citations || []).length,
      c.temporally_sensitive || false,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `claims_${result.session_id || 'report'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAIReport = () => {
    const blob = new Blob([JSON.stringify(result.ai_detection || {}, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai_detection_${result.session_id || 'report'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h2 className="heading-md" style={{ marginBottom: 16 }}>
        Export Report
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        <button className="btn-secondary" onClick={downloadJSON} style={{ padding: '14px 20px' }}>
          📥 Download JSON Report
        </button>
        <button className="btn-secondary" onClick={downloadCSV} style={{ padding: '14px 20px' }}>
          📊 Download CSV (Claims)
        </button>
        <button className="btn-secondary" onClick={downloadAIReport} style={{ padding: '14px 20px' }}>
          🤖 AI Detection Report
        </button>
      </div>
    </div>
  )
}
