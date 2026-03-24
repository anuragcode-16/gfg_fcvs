import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

export default function Navbar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/app', label: 'Verify' },
    { path: '/history', label: 'History' },
  ]

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 251, 241, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 178, 178, 0.2)',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E36A6A, #FFB2B2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            boxShadow: '0 2px 12px rgba(227, 106, 106, 0.3)',
          }}>
            ✦
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}>
            <span className="text-gradient">Lumen</span>
            <span style={{ color: 'var(--text-primary)' }}>AI</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.88rem',
                fontWeight: location.pathname === link.path ? 600 : 500,
                color: location.pathname === link.path ? 'var(--coral)' : 'var(--text-secondary)',
                background: location.pathname === link.path ? 'rgba(227, 106, 106, 0.08)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
