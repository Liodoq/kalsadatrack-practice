import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/format';
import { BrandMark } from '../components/Layout';

export default function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'signup') {
      const name = displayName.trim();
      if (name.length < 3 || name.length > 30) return setError('Display name must be 3–30 characters.');
      if (password.length < 8) return setError('Use a password of at least 8 characters.');
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) navigate(from, { replace: true });
        else setInfo('Check your email to confirm your account, then log in.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <BrandMark />
        <h1>{mode === 'login' ? 'Welcome back' : 'Join KalsadaTrack'}</h1>
        <p className="muted small">
          {mode === 'login' ? 'Log in to report, confirm, and rate roadworks.' : 'Only your display name is shown publicly.'}
        </p>

        <div className="segmented">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>

        {mode === 'signup' && (
          <label className="field">
            <span className="field-label">Display name</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. commuter_qc" maxLength={30} required />
            <span className="hint">Don't use your full real name.</span>
          </label>
        )}
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
        </label>

        {error && <p className="error banner">{error}</p>}
        {info && <p className="notice">{info}</p>}

        <button className="btn btn-red btn-block btn-lg" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        {mode === 'signup' && (
          <p className="small muted">
            By signing up you agree to the <Link to="/about">guidelines and privacy notice</Link>.
          </p>
        )}
      </form>
    </div>
  );
}
