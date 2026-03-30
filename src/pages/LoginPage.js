import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password)     { setError('Please enter your password.'); return; }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      // AuthContext updates automatically — no redirect needed
    } catch (err) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid login')) {
        setError('Incorrect email or password. Please try again.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please confirm your email before logging in.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-icon">⚡</span>
          <div className="login-brand">SunSure</div>
          <div className="login-sub">Project Tracker</div>
        </div>

        <form onSubmit={submit} className="login-form">
          <h2 className="login-title">Sign in to your account</h2>

          {error && <div className="login-error">⚠ {error}</div>}

          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@sunsure.com"
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14 }}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Signing in...</> : 'Sign in'}
          </button>
        </form>

        <p className="login-footer">
          Contact your administrator if you don't have an account.
        </p>
      </div>
    </div>
  );
}
