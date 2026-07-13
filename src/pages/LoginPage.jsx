import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../auth/useAuth'
import {
  clearGoogleSignInState,
  getRequestedReturnPath,
  readGoogleSignInState,
  sanitizeReturnPath,
} from '../auth/authFlow'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77h-9.2v3.34h5.4a4.7 4.7 0 0 1-2 3.03l-.02.11 2.9 2.24.2.02c1.84-1.7 2.92-4.2 2.92-6.97Z" />
      <path fill="#34A853" d="M12.2 21.8c2.63 0 4.84-.87 6.45-2.6l-3.07-2.37c-.82.55-1.92.94-3.38.94a5.87 5.87 0 0 1-5.55-4.06l-.1.01-3.02 2.34-.04.1A9.73 9.73 0 0 0 12.2 21.8Z" />
      <path fill="#FBBC05" d="M6.65 13.71a6 6 0 0 1-.33-1.95c0-.68.12-1.34.32-1.95v-.1L3.6 7.34l-.1.05a9.8 9.8 0 0 0 0 8.77l3.15-2.45Z" />
      <path fill="#EA4335" d="M12.2 5.74c1.83 0 3.07.79 3.78 1.44l2.73-2.67A9.28 9.28 0 0 0 12.2 2a9.73 9.73 0 0 0-8.71 5.39l3.15 2.42a5.9 5.9 0 0 1 5.56-4.07Z" />
    </svg>
  )
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled. Contact the workspace owner.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled. Nothing changed.',
    'auth/cancelled-popup-request': 'The earlier Google sign-in window was closed. Please try again.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Continue in this window instead.',
    'auth/unauthorized-domain': 'Google sign-in is blocked because this website domain is not authorized in Firebase Authentication. Add this domain under Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled for this Firebase project.',
    'auth/unapproved-account': 'This account signed in successfully but is not approved in settings/accessControl.',
    'auth/access-check-failed': 'Your admin access could not be verified. Check your connection and try again.',
    'auth/redirect-failed': 'Google sign-in could not be completed. Please try again.',
    'auth/persistence-failed': 'This browser could not persist Firebase sign-in state. Check browser storage settings and try again.',
  }

  return messages[code] || 'Sign-in failed. Please try again.'
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState('')
  const [error, setError] = useState('')
  const {
    user,
    loading,
    authError,
    defaultRoute,
    isAuthorized,
    signIn,
    signInWithGoogle,
    signOut,
    isConfigured,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const displayedError = error || (authError ? getAuthErrorMessage(authError) : '')
  const autoGoogleStarted = useRef(false)
  const [storedRedirectPath] = useState(() => readGoogleSignInState()?.path || '')
  const from = getRequestedReturnPath(location.state, defaultRoute || '/dashboard', {
    allowScanner: Boolean(location.state?.from?.pathname?.startsWith('/scanner')),
  })
  const googleMode = new URLSearchParams(location.search).get('googleMode')

  const handleGoogleAuth = useCallback(async (mode) => {
    if (!isConfigured) return

    setError('')
    setSubmitting(mode)

    try {
      const result = await signInWithGoogle(from)
      if (result?.workspaceDefaultRoute) {
        navigate(sanitizeReturnPath(result.workspaceDefaultRoute, {
          defaultRoute,
          allowScanner: result.workspaceDefaultRoute.startsWith('/scanner'),
        }), { replace: true })
      }
    } catch (authFailure) {
      setError(getAuthErrorMessage(authFailure.code))
      setSubmitting('')
    }
  }, [defaultRoute, from, isConfigured, navigate, signInWithGoogle])

  useEffect(() => {
    if (loading || user || !isConfigured || autoGoogleStarted.current) return

    let authMode = ''
    if (googleMode === 'login' || googleMode === 'signup') {
      authMode = 'google-login'
    }

    if (!authMode) return

    autoGoogleStarted.current = true
    const authTimer = window.setTimeout(() => {
      void handleGoogleAuth(authMode)
    }, 0)

    return () => window.clearTimeout(authTimer)
  }, [googleMode, handleGoogleAuth, isConfigured, loading, user])

  useEffect(() => {
    if (user && isAuthorized) {
      clearGoogleSignInState()
    }
  }, [isAuthorized, user])

  if (loading) return <LoadingScreen />
  if (user && isAuthorized) {
    return <Navigate to={sanitizeReturnPath(storedRedirectPath || defaultRoute || '/dashboard', {
      defaultRoute,
      allowScanner: Boolean((storedRedirectPath || defaultRoute || '/dashboard').startsWith('/scanner')),
    })} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isConfigured) return

    setError('')
    setSubmitting('email')

    try {
      const result = await signIn(email.trim(), password, from)
      navigate(result?.workspaceDefaultRoute || from, { replace: true })
    } catch (authError) {
      setError(getAuthErrorMessage(authError.code))
    } finally {
      setSubmitting('')
    }
  }

  if (user && !isAuthorized) {
    return (
      <main className="login-safe-area min-h-[100dvh] bg-[#FFF8F2] p-3 sm:p-5 lg:p-6">
        <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[760px] items-center justify-center sm:min-h-[calc(100dvh-2.5rem)]">
          <section className="w-full rounded-[24px] bg-white p-8 shadow-[0_24px_80px_rgba(69,35,50,0.13)]">
            <BrandMark />
            <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.24em] text-[#B76E79]">Authenticated account</p>
            <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#2B1723]">Access still needs verification</h1>
            <p className="mt-4 text-sm leading-6 text-[#806C61]">
              Google sign-in succeeded, but this workspace could not complete admin or staff access verification for the current session.
            </p>
            {displayedError && (
              <p className="mt-6 rounded-xl border border-[#F2C6C6] bg-[#FFF1F1] px-4 py-3 text-xs text-[#A32626]" role="alert">
                {displayedError}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="primary-button" onClick={() => window.location.reload()}>
                Retry access check
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="login-safe-area min-h-[100dvh] bg-[#FFF8F2] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-[1500px] overflow-hidden rounded-[24px] bg-white shadow-[0_24px_80px_rgba(69,35,50,0.13)] sm:min-h-[calc(100dvh-2.5rem)] sm:rounded-[28px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#2B1723] p-12 text-white lg:flex lg:flex-col xl:p-16">
          <div className="login-glow login-glow-one" />
          <div className="login-glow login-glow-two" />
          <div className="relative z-10">
            <BrandMark light />
          </div>

          <div className="relative z-10 my-auto max-w-xl py-16">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5E6C8]">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Private event operations
            </div>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-[-0.025em] xl:text-6xl">
              Every detail,
              <br />
              <span className="italic text-[#E9B7C0]">beautifully gathered.</span>
            </h1>
            <p className="mt-7 max-w-md text-[15px] leading-7 text-white/55">
              A calm, private workspace for planning memorable food experiences—from the first guest name to the final check-in.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs text-white/40">
            <span className="h-px w-10 bg-[#B76E79]" />
            Gather & Savor Vibes
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-14 xl:px-24">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 lg:hidden">
              <BrandMark />
            </div>

            <div className="mb-9">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#B76E79]">Welcome back</p>
              <h2 className="font-serif text-4xl tracking-[-0.02em] text-[#2B1723]">Sign in to your hub</h2>
              <p className="mt-3 text-sm leading-6 text-[#806C61]">Use your approved admin account to continue.</p>
            </div>

            {!isConfigured && (
              <div className="mb-6 rounded-2xl border border-[#E2B85C]/45 bg-[#FFF8E8] p-4 text-sm text-[#79581B]" role="alert">
                <p className="font-semibold">Firebase setup required</p>
                <p className="mt-1 text-xs leading-5 text-[#8A6B2D]">
                  Copy <code>.env.example</code> to <code>.env.local</code> and add the web app credentials before signing in.
                </p>
              </div>
            )}

            <button
              type="button"
              className="google-sign-in-button"
              onClick={() => handleGoogleAuth('google-login')}
              disabled={!isConfigured || Boolean(submitting)}
              aria-label="Continue with Google"
            >
              {submitting === 'google-login' ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-[#B76E79]/25 border-t-[#B76E79]" />
                  Opening Google…
                </>
              ) : (
                <>
                  <GoogleMark />
                  Continue with Google
                </>
              )}
            </button>

            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[#E9DDD6]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A48A7B]">Sign in with email</span>
              <span className="h-px flex-1 bg-[#E9DDD6]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-semibold text-[#4F3B43]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#B49B8D]" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@gatherandsavor.com"
                    className="field-input"
                    disabled={!isConfigured || Boolean(submitting)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-[#4F3B43]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#A48A7B]">Admin access only</span>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#B49B8D]" aria-hidden="true" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="field-input pr-12"
                    disabled={!isConfigured || Boolean(submitting)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={!isConfigured}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#A48A7B] transition hover:bg-[#FFF8F2] hover:text-[#2B1723] disabled:opacity-40"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              {displayedError && (
                <p className="rounded-xl border border-[#F2C6C6] bg-[#FFF1F1] px-4 py-3 text-xs text-[#A32626]" role="alert">
                  {displayedError}
                </p>
              )}

              <button type="submit" className="primary-button" disabled={!isConfigured || Boolean(submitting)}>
                {submitting === 'email' ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  'Sign in securely'
                )}
              </button>
            </form>

            <div className="mt-8 flex items-start gap-3 border-t border-[#EFE2DA] pt-6 text-[11px] leading-5 text-[#8C786C]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#2F855A]" aria-hidden="true" />
              Access is restricted to approved staff. Activity inside the hub will be recorded for operational security.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
