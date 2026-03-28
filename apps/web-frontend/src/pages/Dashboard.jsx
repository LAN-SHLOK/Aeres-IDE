import { SignOutButton, useAuth, useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import SmartDownload from '../components/SmartDownload.jsx'
import { setAuthToken } from '../utils/apiClient.js'

export default function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    getToken().then((token) => {
      if (token) setAuthToken(token)
    })
  }, [getToken])

  return (
    <div className="min-h-screen bg-aether-bg px-6 py-10 font-body text-aether-text">
      <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-display text-2xl font-bold text-white">
          Aether <span className="text-aether-violet">IDE</span>
        </div>
        <SignOutButton>
          <button
            type="button"
            className="rounded-md border border-aether-border bg-transparent px-4 py-2 text-sm text-aether-muted transition hover:border-aether-violet hover:text-aether-text"
          >
            Sign out
          </button>
        </SignOutButton>
      </header>

      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
          Welcome, {user?.firstName || 'developer'}
        </h1>
        <p className="mt-2 text-aether-muted">
          Your account is active. Download Aether IDE to get started.
        </p>

        <div className="mt-8 rounded-xl border border-aether-border bg-aether-surface p-6">
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-aether-muted">Email</div>
              <div className="text-sm">{user?.primaryEmailAddress?.emailAddress}</div>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-aether-muted">Status</div>
              <div className="text-sm text-emerald-400">Active</div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-aether-border bg-aether-surface p-6">
          <h2 className="font-display text-xl font-semibold text-white">Download Aether IDE</h2>
          <div className="mt-4">
            <SmartDownload />
          </div>
          <p className="mt-4 text-sm text-aether-muted">
            After installing, open Aether IDE and choose &quot;Login via Browser&quot; to activate with
            your account.
          </p>
        </div>
      </div>
    </div>
  )
}
