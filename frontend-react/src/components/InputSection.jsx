import { useRef } from 'react'

export default function InputSection({
  inputType, setInputType,
  inputText, setInputText,
  inputUrl, setInputUrl,
  pdfFile, setPdfFile,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className="glass-card-static" style={{ padding: 28 }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        letterSpacing: '2px',
        marginBottom: 16,
      }}>
        INPUT SOURCE
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'text', label: '📝 Paste Text' },
          { key: 'url', label: '🌐 Enter URL' },
          { key: 'pdf', label: '📄 Upload PDF' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab ${inputType === tab.key ? 'active' : ''}`}
            onClick={() => setInputType(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Text Input */}
      {inputType === 'text' && (
        <div>
          <textarea
            className="input-field"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste any text, article, or claim-rich document here..."
            style={{ minHeight: 200 }}
          />
          {inputText && (
            <div style={{
              marginTop: 8,
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              📊 {inputText.split(/\s+/).filter(Boolean).length} words
            </div>
          )}
        </div>
      )}

      {/* URL Input */}
      {inputType === 'url' && (
        <input
          type="url"
          className="input-field"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          placeholder="https://example.com/news-article"
        />
      )}

      {/* PDF Upload */}
      {inputType === 'pdf' && (
        <div
          className={`file-upload-zone ${pdfFile ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f && f.type === 'application/pdf') setPdfFile(f)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files[0]
              if (f) setPdfFile(f)
            }}
          />
          {pdfFile ? (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 600, color: 'var(--coral)' }}>
                ✓ {pdfFile.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {(pdfFile.size / 1024).toFixed(1)} KB • Click to change
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }}>📁</div>
              <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                Drop PDF here or click to upload
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Supports .pdf files
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
