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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return

    const source = params.get('source')
    const redirectParam = params.get('redirect')

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-aether-bg px-6 py-12">
      <div className="mb-10 text-center">
        <div className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
          Aether <span className="text-aether-violet">IDE</span>
        </div>
        <p className="mt-2 font-body text-sm text-aether-muted">Sign in to continue</p>
      </div>

      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#7C3AED',
            colorBackground: '#0a0a0f',
            colorInputBackground: '#161620',
            colorInputText: '#ffffff',
            colorText: '#ffffff',
            colorTextSecondary: '#a1a1aa',
            colorTextOnPrimaryBackground: '#ffffff',
            borderRadius: '12px',
          },
          elements: {
            card: { 
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)', 
              border: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(10, 10, 15, 0.8)',
              backdropFilter: 'blur(20px)'
            },
            headerTitle: { fontFamily: 'Syne, sans-serif', fontWeight: '800', color: '#fff' },
            socialButtonsBlockButton: {
              background: '#161620',
              border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': {
                background: '#1e1e2e',
              }
            },
            socialButtonsBlockButtonText: {
              color: '#ffffff',
              fontWeight: '600'
            },
            dividerLine: { background: 'rgba(255,255,255,0.1)' },
            dividerText: { color: 'rgba(255,255,255,0.3)' },
            formFieldLabel: { color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
            footerActionLink: { color: '#7C3AED', '&:hover': { color: '#8b5cf6' } }
          },
        }}
        routing="hash"
        signUpUrl="/auth#sign-up"
      />
    </div>
  )
}
