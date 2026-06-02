import { useUser } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import useOSDetection from '../hooks/useOSDetection.js'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'

const BASE = (import.meta.env.VITE_DOWNLOAD_BASE_URL || 'https://github.com/Aeres-IDE/releases/latest/download').replace(/\/$/, '')

const ARTIFACTS = {
  mac: 'Aeres-IDE-mac-universal.dmg',
  windows: 'Aeres-IDE-Setup-win-x64.exe',
  linux: 'Aeres-IDE-linux-x86_64.AppImage',
}

const LABELS = {
  mac: 'Download for macOS',
  windows: 'Download for Windows',
  linux: 'Download for Linux',
  unknown: 'Download Aeres IDE',
}

function urlFor(os) {
  if (!BASE) return null
  const file = ARTIFACTS[os] || ARTIFACTS.windows
  return `${BASE}/${file}`
}

export default function SmartDownload({ className = '', large = false, autoStart = false }) {
  const { isSignedIn, isLoaded } = useUser()
  const os = useOSDetection()
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)
  const autoFired = useRef(false)

  const runDownload = useCallback(() => {
    const href = urlFor(os === 'unknown' ? 'windows' : os)
    if (!href) {
      console.warn('[SmartDownload] Set VITE_DOWNLOAD_BASE_URL in .env.local')
      return
    }
    const a = document.createElement('a')
    a.href = href
    a.rel = 'noopener noreferrer'
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setDownloading(true)
    window.setTimeout(() => {
      setDownloading(false)
      setDone(true)
    }, 1800)
  }, [os])

  useEffect(() => {
    if (!autoStart || !isLoaded || !isSignedIn || autoFired.current) return
    autoFired.current = true
    const t = window.setTimeout(() => runDownload(), 200)
    return () => window.clearTimeout(t)
  }, [autoStart, isLoaded, isSignedIn, runDownload])

  const handleClick = () => {
    if (!isLoaded) return
    if (!isSignedIn) {
      redirectToAuthForDownload()
      return
    }
    runDownload()
  }

  const label = LABELS[os] || LABELS.unknown

  // 1. Beautiful Isometric 3D coffee-block loader for loading states
  if (!isLoaded) {
    return (
      <div className="flex items-center gap-5.5 font-display text-xs font-black uppercase text-black py-4">
        <div className="isometric-loader">
          <div className="isometric-cube">
            <div className="isometric-face face-top" />
            <div className="isometric-face face-left" />
            <div className="isometric-face face-right" />
          </div>
        </div>
        <span>Provisioning Downloader...</span>
      </div>
    )
  }

  // 2. Direct button rendering - resolving nested styling layout bug
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        className={`${className} ${
          downloading ? 'opacity-85 translate-y-0.5 shadow-none' : ''
        }`}
        onClick={handleClick}
        disabled={downloading}
      >
        {downloading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Starting Download...
          </span>
        ) : label}
      </button>

      {done && isSignedIn && (
        <p className="mt-4 text-xs font-sans font-bold text-black/60">
          <span className="text-emerald-600 font-extrabold">✓ Download started.</span> After installing, choose Login via Browser inside Aeres IDE.
        </p>
      )}

      {os === 'unknown' && BASE && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-display">
          {(['windows', 'mac', 'linux']).map((p) => (
            <a
              key={p}
              href={`${BASE}/${ARTIFACTS[p]}`}
              className="bg-white border-2 border-black px-3.5 py-1.5 rounded-full text-black hover:bg-[#fae3d9] shadow-[1.5px_1.5px_0px_#000000] no-underline hover:-translate-y-0.5 transition"
              onClick={(e) => {
                if (!isSignedIn) {
                  e.preventDefault()
                  redirectToAuthForDownload()
                }
              }}
            >
              {p === 'windows' ? 'Windows' : p === 'mac' ? 'macOS' : 'Linux'}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
