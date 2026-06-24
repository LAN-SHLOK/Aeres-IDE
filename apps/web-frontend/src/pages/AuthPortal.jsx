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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090e] px-6 py-12 relative overflow-hidden text-[#fffdf9]">
      
      {/* Floating Kawaii Star Stickers */}
      <div className="absolute top-[15%] left-10 w-12 h-12 text-[#ff8ba7] sticker-float hidden md:block" style={{ animationDelay: '0.2s' }}>
        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 0l3.059 8.941 8.941 3.059-8.941 3.059-3.059 8.941-3.059-8.941-8.941-3.059 8.941-3.059z"/></svg>
      </div>
      <div className="absolute bottom-[15%] right-10 w-14 h-14 text-[#2dd4bf] sticker-float hidden md:block" style={{ animationDelay: '0.8s' }}>
        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 0l3.059 8.941 8.941 3.059-8.941 3.059-3.059 8.941-3.059-8.941-8.941-3.059 8.941-3.059z"/></svg>
      </div>

      <div className="mb-10 text-center font-display relative z-10">
        <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-6 font-mono">
          login_manager
        </span>
        <div className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
          Aeres <span className="bg-[#fef08a] text-black px-2.5 py-0.5 border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_#000000] text-[10px] uppercase font-mono tracking-widest font-black inline-block align-middle ml-1.5">IDE</span>
        </div>
        <p className="mt-4 text-xs font-semibold text-white/60 font-sans">Sign in to sync your local multi-agent workspace.</p>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {isSignedIn && source === 'ide' ? (
          <div className="kawaii-card bg-[#13141f] p-8 text-center border-4 border-black shadow-[6px_6px_0px_#000000] rounded-[24px]">
            <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-6 font-mono">
              launch_daemon
            </span>
            <h2 className="font-display text-2xl font-black text-white mb-2">Authenticated!</h2>
            <p className="text-white/60 text-xs font-semibold mb-8 font-sans leading-relaxed">
              Aeres IDE is ready. We've sent a command to open your local workspace.
            </p>
            
            <button
              type="button"
              onClick={async () => {
                const token = await getToken()
                const email = user?.primaryEmailAddress?.emailAddress ?? ''
                redirectToIDE(token, email)
              }}
              className="kawaii-btn-pink w-full py-4 text-xs uppercase tracking-wider font-display font-bold shadow-[4px_4px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
            >
              Open Aeres IDE
            </button>
            
            <div className="mt-6 text-[10px] text-white/40 font-mono leading-relaxed">
              If the IDE did not open automatically, click the button above to launch.
            </div>
          </div>
        ) : (
          <SignIn
            forceRedirectUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            signUpForceRedirectUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            fallbackRedirectUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            signUpFallbackRedirectUrl={source === 'ide' ? '/auth?source=ide' : undefined}
            appearance={{
              variables: {
                colorPrimary: '#ff8ba7',
                colorBackground: '#13141f',
                colorText: '#fffdf9',
                colorInputText: '#fffdf9',
                colorInputBackground: '#09090e',
                colorTextSecondary: '#7a748c',
                borderRadius: '24px',
              },
              elements: {
                card: { 
                  boxShadow: '6px 6px 0px #000000', 
                  border: '4px solid #000000',
                  background: '#13141f',
                },
                headerTitle: { fontFamily: 'Fredoka, sans-serif', fontWeight: '800', color: '#ffffff' },
                socialButtonsBlockButton: {
                  background: '#1b1c2b',
                  border: '2px solid #000000',
                  boxShadow: '1.5px 1.5px 0px #000000',
                  color: '#fffdf9',
                  '&:hover': {
                    background: '#ff8ba7',
                    color: '#000000'
                  }
                },
                socialButtonsBlockButtonText: {
                  color: '#fffdf9',
                  fontWeight: '800'
                },
                dividerLine: { background: '#000000', height: '2px' },
                dividerText: { color: '#fffdf9', fontWeight: '800' },
                formFieldLabel: { color: '#fffdf9', fontWeight: '800' },
                formFieldInput: {
                  border: '2px solid #000000',
                  boxShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.05)',
                  color: '#fffdf9',
                  '&:focus': {
                    borderColor: '#ff8ba7',
                  }
                },
                footerActionLink: { color: '#ff8ba7', '&:hover': { color: '#ff7090' } }
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

