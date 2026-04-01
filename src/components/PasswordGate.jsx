import React, { useState } from 'react';
import '../styles/PasswordGate.css';
import { setToken } from '../auth';

export default function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/auth', {
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
        <div className="password-gate-icon">🔒</div>
        <h2 className="password-gate-title">LifeStyle Tracker</h2>
        <form onSubmit={handleSubmit} className="password-gate-form">
          <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} readOnly />
          <input
            type="password"
            className="password-input"
            placeholder="Enter password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {error && <p className="password-error">{error}</p>}
          <button type="submit" className="password-btn" disabled={loading}>
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
