import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from '../auth/useAuth'

function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled. Contact the workspace owner.',
  }

  return messages[code] || 'Sign-in failed. Please try again.'
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { user, loading, signIn, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  const from = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isConfigured) return

    setError('')
    setSubmitting(true)

    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (authError) {
      setError(getAuthErrorMessage(authError.code))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF8F2] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1500px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(69,35,50,0.13)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.05fr_0.95fr]">
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

        <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-14 xl:px-24">
          <div className="w-full max-w-[430px]">
            <div className="mb-10 lg:hidden">
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
                    disabled={!isConfigured || submitting}
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
                    disabled={!isConfigured || submitting}
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

              {error && (
                <p className="rounded-xl border border-[#F2C6C6] bg-[#FFF1F1] px-4 py-3 text-xs text-[#A32626]" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="primary-button" disabled={!isConfigured || submitting}>
                {submitting ? (
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
