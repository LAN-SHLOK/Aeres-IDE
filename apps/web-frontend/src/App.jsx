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
      <div className="flex min-h-screen items-center justify-center bg-[#fdf5ee] font-body text-black">
        <div className="text-center flex flex-col items-center gap-6">
          <div className="isometric-loader">
            <div className="isometric-cube">
              <div className="isometric-face face-top" />
              <div className="isometric-face face-left" />
              <div className="isometric-face face-right" />
            </div>
          </div>
          <p className="text-xs font-display font-black uppercase text-black tracking-widest animate-pulse">Initializing Aeres Workspace...</p>
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
        <Route path="/auth/*" element={<AuthPortal />} />
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

