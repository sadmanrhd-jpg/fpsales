import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'

interface LoginPageProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<string | null>
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await onLogin(email, password, rememberMe)
    setSubmitting(false)
    if (result) setError(result)
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <img src="/food-pavilion-logo.png" alt="Food Pavilion" />
          <span>Sales, cost and menu management</span>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Secure access</span>
          <h1>Sign in to continue</h1>
          <p>Use an active account created by the superadmin.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label className="field login-field">
            <span>Email address</span>
            <div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="name@example.com" autoFocus /></div>
          </label>
          <label className="field login-field">
            <span>Password</span>
            <div className="input-with-icon password-input"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" /><button type="button" className="password-visibility" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </label>
          <label className="remember-me-option"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Remember me on this device</span></label>
          {error && <p className="form-error login-error">{error}</p>}
          <button className="button primary login-button" type="submit" disabled={submitting || !email.trim() || !password}><LogIn size={18} /> {submitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="login-footnote">Passwords are managed only by the superadmin.</p>
      </section>
    </main>
  )
}
