import React, { useState, useEffect } from 'react';
import '../styles/PasswordGate.css';
import { setToken } from '../auth';
import { isPasskeySupported, authenticateWithPasskey } from '../utils/webauthn';

export default function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [hasPasskeySupport, setHasPasskeySupport] = useState(false);

  useEffect(() => {
    if (isPasskeySupported()) {
      setHasPasskeySupport(true);
    }
  }, []);

  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);
    try {
      const data = await authenticateWithPasskey();
      if (data && data.token) {
        setToken(data.token);
        onAuth();
      } else {
        setError('Passkey verification did not return a session.');
      }
    } catch (err) {
      console.warn('[Passkey Login Error]', err);
      // Friendly message
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication cancelled.');
      } else {
        setError(err.message || 'Passkey login failed. Please use password.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Wrong password');
        setLoading(false);
        return;
      }
      setToken(data.token);
      onAuth();
    } catch {
      setError('Connection error. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="password-gate">
      <div className="password-gate-card">
        <div className="password-gate-icon">✨</div>
        <h2 className="password-gate-title">DailyAlign</h2>
        <p className="password-gate-subtitle">Your Personal Lifestyle & Habit Companion</p>

        {hasPasskeySupport && (
          <div className="passkey-login-section">
            <button
              type="button"
              className="passkey-login-btn"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading || loading}
            >
              <span className="passkey-btn-icon">🔐</span>
              <span>{passkeyLoading ? 'Verifying Biometrics…' : 'Sign in with Passkey'}</span>
            </button>
            <div className="passkey-divider">
              <span>or enter password</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="password-gate-form">
          <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} readOnly />
          <input
            type="password"
            className="password-input"
            placeholder="Enter master password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus={!hasPasskeySupport}
            autoComplete="current-password"
          />
          {error && <p className="password-error">{error}</p>}
          <button type="submit" className="password-btn" disabled={loading || passkeyLoading}>
            {loading ? 'Verifying…' : 'Enter with Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

