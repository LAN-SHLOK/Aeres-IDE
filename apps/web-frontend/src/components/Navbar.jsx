import { SignOutButton, useUser } from '@clerk/clerk-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  // Cozy marshmallow tabs with thick outlines & block shadow offsets
  const activeTabClass = (path) => {
    const isActive = location.pathname === path
    return isActive 
      ? 'bg-[#c084fc] border-3 border-black text-black shadow-[3px_3px_0px_#000000] font-black px-5 py-2 rounded-full scale-105 transition-all duration-300'
      : 'bg-[#1b1c2b] border-3 border-black text-white/70 hover:text-white hover:bg-[#ff8ba7]/20 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] px-5 py-2 rounded-full hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all duration-300'
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-[100] flex h-20 items-center justify-between border-b-4 border-black bg-[#13141f] px-6 md:px-10 shadow-[0_4px_0px_rgba(0,0,0,0.06)] font-sans">
      
      {/* Cute Sweet Monitor Logo with thick border */}
      <Link to="/" className="flex items-center gap-3.5 no-underline group">
        <div className="bg-[#ff8ba7] border-3 border-black p-1.5 rounded-2xl shadow-[3px_3px_0px_#000000] group-hover:rotate-6 transition duration-300 flex items-center justify-center shrink-0">
          {/* Developer Monitor Screen SVG */}
          <svg className="w-5.5 h-5.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="13" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v4M8 21h8M6 8h12" />
            <circle cx="18" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <span className="font-display text-xl font-bold text-white tracking-tight group-hover:text-[#ff8ba7] transition">
          Aeres <span className="bg-[#fef08a] text-black px-2.5 py-0.5 border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_#000000] text-[10px] uppercase font-mono tracking-widest font-black">IDE</span>
        </span>
      </Link>

      {/* Marshmallow tabs */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 gap-3.5 md:flex items-center">
        <Link to="/" className={`${activeTabClass('/')} no-underline text-xs uppercase tracking-wider font-display`}>
          Home
        </Link>
        <Link to="/docs" className={`${activeTabClass('/docs')} no-underline text-xs uppercase tracking-wider font-display`}>
          Docs
        </Link>
        <Link to="/pricing" className={`${activeTabClass('/pricing')} no-underline text-xs uppercase tracking-wider font-display`}>
          Pricing
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isLoaded ? (
          <div className="w-5 h-5 rounded-full border-2 border-[#ff8ba7] border-t-transparent animate-spin" />
        ) : isSignedIn ? (
          <>
            <Link
              to="/dashboard"
              className="bg-[#fae3d9] border-3 border-black text-black shadow-[2.5px_2.5px_0px_#000000] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider no-underline hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
            >
              Dashboard
            </Link>
            <SignOutButton>
              <button
                type="button"
                className="cursor-pointer bg-[#1b1c2b] border-3 border-black text-white/70 hover:text-white shadow-[2.5px_2.5px_0px_#000000] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
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
              className="cursor-pointer border-none bg-transparent text-xs font-black uppercase tracking-wider text-white/60 hover:text-white transition"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => redirectToAuthForDownload()}
              className="cursor-pointer kawaii-btn-mint text-xs uppercase tracking-wider text-black"
            >
              Download
            </button>
          </>
        )}
      </div>

    </nav>
  )
}
