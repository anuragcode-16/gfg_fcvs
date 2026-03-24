import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AppPage from './pages/AppPage'
import HistoryPage from './pages/HistoryPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <>
      <div className="bg-orbs">
        <div className="bg-orb"></div>
        <div className="bg-orb"></div>
        <div className="bg-orb"></div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/report/:sessionId" element={<ReportPage />} />
        </Routes>
      </div>
    </>
  )
}

export default App
