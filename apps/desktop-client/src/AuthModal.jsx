export default function AuthModal({ onCheckAgain }) {
  const e = typeof window !== 'undefined' ? window.electron : null

  const handleOpenBrowser = async () => {
    if (e?.auth?.openBrowser) {
      // Opens the web portal URL (localhost or configured URL) in the user's default browser
      await e.auth.openBrowser('ide')
    } else if (e?.fs?.openExternal) {
      // Fallback: open directly via shell
      const webUrl = 'http://localhost:5173'
      await e.fs.openExternal(webUrl)
    }
  }

  const handleOpenWebApp = async () => {
    // Opens the web app directly in the default browser so the user can log in there
    const webUrl = 'http://localhost:5173'
    if (e?.fs?.openExternal) {
      await e.fs.openExternal(webUrl)
    } else {
      window.open(webUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-aeres-bg px-6">
      <div className="mb-10 text-center">
        <div className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
          Aeres <span className="text-aeres-violet">IDE</span>
        </div>
        <p className="mt-2 font-body text-sm text-aeres-muted">Sign in to continue</p>
      </div>

      <div className="flex max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={handleOpenBrowser}
          className="rounded-lg bg-aeres-violet px-6 py-3 font-body text-sm font-medium text-white transition hover:opacity-90"
        >
          Login via Browser
        </button>
        <button
          type="button"
          onClick={handleOpenWebApp}
          className="rounded-lg border border-aeres-violet/40 bg-aeres-violet/10 px-6 py-3 font-body text-sm font-medium text-aeres-violet transition hover:bg-aeres-violet/20 flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Open Web App (localhost:5173)
        </button>
        <button
          type="button"
          onClick={() => onCheckAgain?.()}
          className="rounded-lg border border-aeres-border bg-transparent px-6 py-3 font-body text-sm text-aeres-muted transition hover:border-aeres-violet hover:text-aeres-text"
        >
          Already logged in? Check again
        </button>
      </div>

      <p className="mt-6 text-xs text-aeres-muted/60 text-center max-w-xs">
        After logging in through the browser, click "Already logged in? Check again" to continue.
      </p>
    </div>
  )
}
