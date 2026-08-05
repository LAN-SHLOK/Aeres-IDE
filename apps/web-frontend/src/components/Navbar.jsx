import { SignOutButton, useAuth } from '@clerk/clerk-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const activeTabClass = (path) => {
    const isActive = location.pathname === path
    return isActive 
      ? 'bg-[#c084fc] border-[3px] border-black text-black font-black px-5 py-2 rounded-full text-xs shadow-[3px_3px_0px_#000000] uppercase tracking-wider'
      : 'bg-[#1b1c2b] border-[3px] border-black text-white/70 hover:text-white shadow-[3px_3px_0px_#000000] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all'
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-[100] flex h-20 items-center justify-between border-b-4 border-black bg-[#13141f] px-6 md:px-10 shadow-[0_4px_0px_rgba(0,0,0,0.06)] font-sans">
      
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3.5 no-underline group">
        <img src="/logo.png" alt="Aeres IDE Logo" className="w-8 h-8 rounded-xl shadow-lg border border-slate-700/50" />
        <span className="font-display text-xl font-bold text-white tracking-tight transition">
          Aeres <span className="bg-[#fef08a] text-black px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-widest font-black ml-1">IDE</span>
        </span>
      </Link>

      {/* Marshmallow tabs */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 gap-3.5 md:flex items-center">
        <Link to="/" className={`${activeTabClass('/')} no-underline font-display`}>
          Home
        </Link>
        <Link to="/docs" className={`${activeTabClass('/docs')} no-underline font-display`}>
          Docs
        </Link>
        <Link to="/pricing" className={`${activeTabClass('/pricing')} no-underline font-display`}>
          Pricing
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isSignedIn ? (
          <>
            <Link
              to="/dashboard"
              className="bg-[#fae3d9] border-[3px] border-black text-black px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider no-underline transition-all hover:-translate-y-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_#000000]"
            >
              Dashboard
            </Link>
            <SignOutButton>
              <button
                type="button"
                className="cursor-pointer bg-[#1b1c2b] border-[3px] border-black text-white/70 hover:text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_#000000]"
              >
                Sign Out
              </button>
            </SignOutButton>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="cursor-pointer border-[3px] border-black bg-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider text-black hover:bg-gray-100 transition-all hover:-translate-y-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_#000000]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => redirectToAuthForDownload()}
              className="cursor-pointer bg-[#2dd4bf] border-[3px] border-black text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0.5 shadow-[4px_4px_0px_#000000]"
            >
              Download
            </button>
          </>
        )}
      </div>

    </nav>
  )
}

