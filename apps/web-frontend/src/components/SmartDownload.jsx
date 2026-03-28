import { useUser } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import useOSDetection from '../hooks/useOSDetection.js'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'

const BASE = (import.meta.env.VITE_DOWNLOAD_BASE_URL || '').replace(/\/$/, '')

const ARTIFACTS = {
  mac: 'Aether-IDE-mac-universal.dmg',
  windows: 'Aether-IDE-Setup-win-x64.exe',
  linux: 'Aether-IDE-linux-x86_64.AppImage',
}

const LABELS = {
  mac: 'Download for macOS',
  windows: 'Download for Windows',
  linux: 'Download for Linux',
  unknown: 'Download Aether IDE',
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
  const btnBase =
    'inline-flex items-center justify-center gap-2 rounded-lg border-none font-medium font-body transition focus:outline-none focus:ring-2 focus:ring-aether-violet focus:ring-offset-2 focus:ring-offset-aether-bg disabled:cursor-not-allowed disabled:opacity-70'
  const sizeClass = large ? 'px-8 py-4 text-base' : 'px-5 py-2.5 text-sm'

  if (!isLoaded) {
    return <p className={`text-sm text-aether-muted ${className}`}>Loading…</p>
  }

  return (
    <div className={className}>
      <button
        type="button"
        className={`${btnBase} ${sizeClass} ${
          downloading ? 'bg-violet-800' : 'bg-aether-violet'
        } text-white hover:opacity-95`}
        onClick={handleClick}
        disabled={downloading}
      >
        {downloading ? 'Starting download…' : label}
      </button>

      {done && isSignedIn && (
        <p className="mt-3 text-sm text-aether-muted">
          <span className="text-emerald-500">Download started.</span> After installing, click Login via
          Browser inside Aether IDE.
        </p>
      )}

      {os === 'unknown' && BASE && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(['windows', 'mac', 'linux']).map((p) => (
            <a
              key={p}
              href={`${BASE}/${ARTIFACTS[p]}`}
              className="text-aether-blue underline decoration-aether-blue/40 underline-offset-4 hover:text-aether-text"
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
