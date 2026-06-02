import { SignIn, useAuth, useUser } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  clearPostAuthRedirect,
  getPostAuthRedirect,
  redirectToIDE,
} from '../utils/authRedirect.js'

export default function AuthPortal() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirected = useRef(false)

  const source = params.get('source')
  const redirectParam = params.get('redirect')

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return

    if (source === 'ide' && !userLoaded) return

    async function handle() {
      redirected.current = true

      if (source === 'ide') {
        const token = await getToken()
        const email = user?.primaryEmailAddress?.emailAddress ?? ''
        clearPostAuthRedirect()
        redirectToIDE(token, email)
        return
      }

      if (redirectParam === 'download') {
        clearPostAuthRedirect()
        navigate('/?download=true')
        return
      }

      const next = getPostAuthRedirect()
      clearPostAuthRedirect()
      navigate(next, { replace: true })
    }

    handle()
  }, [isLoaded, isSignedIn, userLoaded, params, navigate, getToken, user])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-6 py-12 relative overflow-hidden text-white font-sans">
      
      {/* Sleek Dark Mode Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="mb-10 text-center font-display relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white/50 bg-white/5 border border-white/10 backdrop-blur-md mb-6 font-mono">
          auth_gateway
        </span>
        <div className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
          Aeres <span className="bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text font-black inline-block align-middle ml-1">IDE</span>
        </div>
        <p className="mt-4 text-xs font-medium text-white/50 font-sans max-w-xs mx-auto">Authenticate your session to unlock your local multi-agent workspace.</p>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {isSignedIn && source === 'ide' ? (
          <div className="bg-white/5 p-8 text-center border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-6 font-mono relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> connected
            </span>
            <h2 className="font-display text-2xl font-bold text-white mb-2 relative z-10 tracking-tight">Authenticated</h2>
            <p className="text-white/50 text-xs font-medium mb-8 font-sans leading-relaxed relative z-10">
              Aeres IDE is ready. A secure command has been dispatched to open your workspace.
            </p>
            
            <button
              type="button"
              onClick={async () => {
                const token = await getToken()
                const email = user?.primaryEmailAddress?.emailAddress ?? ''
                redirectToIDE(token, email)
              }}
              className="w-full bg-white text-black py-4 rounded-lg text-xs uppercase tracking-wider font-display font-bold hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] relative z-10"
            >
              Launch Aeres IDE
            </button>
            
            <div className="mt-6 text-[10px] text-white/30 font-mono leading-relaxed relative z-10">
              If the IDE did not open automatically, click the button above.
            </div>
          </div>
        ) : (
          <SignIn
            forceRedirectUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            signUpForceRedirectUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            afterSignInUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            afterSignUpUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            appearance={{
              variables: {
                colorPrimary: '#a855f7',
                colorBackground: 'transparent',
                colorText: '#ffffff',
                colorInputText: '#ffffff',
                colorInputBackground: 'rgba(255,255,255,0.02)',
                colorTextSecondary: 'rgba(255,255,255,0.5)',
                borderRadius: '12px',
              },
              elements: {
                card: { 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(16px)',
                  padding: '2rem'
                },
                headerTitle: { fontFamily: 'Inter, sans-serif', fontWeight: '700', color: '#ffffff', fontSize: '1.25rem' },
                headerSubtitle: { color: 'rgba(255,255,255,0.5)' },
                socialButtonsBlockButton: {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)'
                  }
                },
                socialButtonsBlockButtonText: {
                  color: '#ffffff',
                  fontWeight: '500'
                },
                dividerLine: { background: 'rgba(255,255,255,0.1)' },
                dividerText: { color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
                formFieldLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
                formFieldInput: {
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#ffffff',
                  '&:focus': {
                    borderColor: '#a855f7',
                    boxShadow: '0 0 0 2px rgba(168, 85, 247, 0.2)'
                  }
                },
                footerActionLink: { color: '#a855f7', '&:hover': { color: '#c084fc' } }
              },
            }}
            routing="hash"
            signUpUrl="/auth#sign-up"
          />
        )}
      </div>
    </div>
  )
}

