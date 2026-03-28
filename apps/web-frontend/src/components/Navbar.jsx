import { SignOutButton, useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'
import AetherLogo from './AetherLogo.jsx'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navClass = scrolled
    ? 'border-aether-border bg-aether-bg/95 shadow-sm backdrop-blur-md'
    : 'border-transparent bg-transparent'

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-[100] flex h-16 items-center justify-between border-b px-6 transition-all duration-300 md:px-10 ${navClass}`}
    >
      <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-white no-underline">
        <AetherLogo size={32} />
        Aether <span className="text-aether-violet">IDE</span>
      </Link>


      <div className="absolute left-1/2 hidden -translate-x-1/2 gap-8 md:flex">
        {['Features', 'Docs', 'Pricing'].map((item) => (
          <Link
            key={item}
            to={item === 'Features' ? '/#features' : `/${item.toLowerCase()}`}
            className="font-body text-sm text-aether-muted transition hover:text-aether-text no-underline"
          >
            {item}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {!isLoaded ? (
          <span className="text-xs text-aether-muted">…</span>
        ) : isSignedIn ? (
          <>
            <Link
              to="/dashboard"
              className="font-body text-sm text-aether-text no-underline transition hover:text-white"
            >
              Dashboard
            </Link>
            <SignOutButton>
              <button
                type="button"
                className="cursor-pointer rounded-md border border-aether-border bg-transparent px-3 py-1.5 font-body text-xs text-aether-muted transition hover:border-aether-violet hover:text-aether-text"
              >
                Sign out
              </button>
            </SignOutButton>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="cursor-pointer border-none bg-transparent font-body text-sm text-aether-muted transition hover:text-aether-text"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => redirectToAuthForDownload()}
              className="cursor-pointer rounded-lg bg-aether-violet px-4 py-2 font-body text-sm font-medium text-white transition hover:opacity-90"
            >
              Download
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
