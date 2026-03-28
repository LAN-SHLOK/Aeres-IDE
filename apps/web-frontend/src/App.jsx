import { useAuth } from '@clerk/clerk-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPortal from './pages/AuthPortal.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LandingPage from './pages/LandingPage.jsx'
import Pricing from './pages/Pricing.jsx'
import Docs from './pages/Docs.jsx'
import SmoothScroll from './components/SmoothScroll.jsx'

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-aether-bg font-body text-aether-violet">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-pulse rounded-full border-2 border-aether-border border-t-aether-violet mx-auto" />
          <p className="text-sm text-aether-muted">Loading…</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />
  }

  return children
}

export default function App() {
  return (
    <SmoothScroll>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPortal />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/docs" element={<Docs />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SmoothScroll>
  )
}
