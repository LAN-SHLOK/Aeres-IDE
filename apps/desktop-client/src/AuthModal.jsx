export default function AuthModal({ onCheckAgain }) {
  const e = typeof window !== 'undefined' ? window.electron : null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-aether-bg px-6">
      <div className="mb-10 text-center">
        <div className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
          Aether <span className="text-aether-violet">IDE</span>
        </div>
        <p className="mt-2 font-body text-sm text-aether-muted">Sign in to continue</p>
      </div>

      <div className="flex max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={() => e?.auth.openBrowser('ide')}
          className="rounded-lg bg-aether-violet px-6 py-3 font-body text-sm font-medium text-white transition hover:opacity-90"
        >
          Login via Browser
        </button>
        <button
          type="button"
          onClick={() => onCheckAgain?.()}
          className="rounded-lg border border-aether-border bg-transparent px-6 py-3 font-body text-sm text-aether-muted transition hover:border-aether-violet hover:text-aether-text"
        >
          Already logged in? Check again
        </button>
      </div>
    </div>
  )
}
