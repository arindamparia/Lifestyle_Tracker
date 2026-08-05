import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../styles/SettingsModal.css';
import { getToken, clearToken, removeToken } from '../auth';
import {
  isPasskeySupported,
  isPlatformAuthenticatorAvailable,
  getPasskeyDiagnostics,
  listPasskeys,
  registerPasskey,
  deletePasskey,
  authenticateWithPasskey
} from '../utils/webauthn';

export default function SettingsModal({ isOpen, onClose, bgPref, setBgPref, onForceSync, onLogout }) {
  const [activeTab, setActiveTab] = useState('passkey'); // 'passkey' | 'atmosphere' | 'sync'
  const [passkeys, setPasskeys] = useState([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [testingPasskey, setTestingPasskey] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [hasPasskeySupport, setHasPasskeySupport] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);
  const [passkeyDiag, setPasskeyDiag] = useState({ supported: false, isSecure: true, reason: '' });

  const token = getToken();

  // Load passkey capability and registered keys
  const fetchKeys = useCallback(async () => {
    if (!token) return;
    setLoadingPasskeys(true);
    try {
      const data = await listPasskeys(token);
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
    } finally {
      setLoadingPasskeys(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    
    const diag = getPasskeyDiagnostics();
    setPasskeyDiag(diag);
    setHasPasskeySupport(diag.supported);
    isPlatformAuthenticatorAvailable().then(setPlatformAuthAvailable);
    fetchKeys();
    setStatusMsg({ type: '', text: '' });
  }, [isOpen, fetchKeys]);

  // Lock body scroll and handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const handleRegister = async () => {
    if (!token) {
      setStatusMsg({ type: 'error', text: 'You must be logged in to register a passkey.' });
      return;
    }

    setRegistering(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const result = await registerPasskey(token, deviceName.trim());
      if (result.success) {
        setStatusMsg({ type: 'success', text: `Passkey "${deviceName.trim() || 'Device'}" registered successfully!` });
        setDeviceName('');
        await fetchKeys();
      } else {
        setStatusMsg({ type: 'error', text: result.error || 'Failed to register passkey.' });
      }
    } catch (err) {
      console.error('Passkey registration error:', err);
      if (err.name === 'NotAllowedError') {
        setStatusMsg({ type: 'error', text: 'Passkey registration was cancelled by user.' });
      } else if (err.name === 'InvalidStateError') {
        setStatusMsg({ type: 'error', text: 'This passkey / device is already registered.' });
      } else {
        setStatusMsg({ type: 'error', text: err.message || 'Passkey registration failed.' });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`Delete passkey "${name || 'device'}"?`)) return;
    try {
      await deletePasskey(token, id);
      setStatusMsg({ type: 'success', text: 'Passkey deleted.' });
      await fetchKeys();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete passkey.' });
    }
  };

  const handleTestPasskey = async () => {
    setTestingPasskey(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const data = await authenticateWithPasskey();
      if (data && data.token) {
        setStatusMsg({ type: 'success', text: '✅ Passkey verified successfully! Biometric auth is active.' });
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setStatusMsg({ type: 'error', text: 'Biometric verification cancelled.' });
      } else {
        setStatusMsg({ type: 'error', text: err.message || 'Passkey verification failed.' });
      }
    } finally {
      setTestingPasskey(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Do you want to lock the app and sign out?')) {
      clearToken();
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title-group">
            <span className="settings-header-icon">⚙️</span>
            <div>
              <h3>Settings</h3>
              <p className="settings-header-subtitle">Security, Atmosphere & Preferences</p>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close Settings">
            ✕
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="settings-nav">
          <button
            className={`settings-nav-btn ${activeTab === 'passkey' ? 'active' : ''}`}
            onClick={() => setActiveTab('passkey')}
          >
            🔐 Passkeys
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'atmosphere' ? 'active' : ''}`}
            onClick={() => setActiveTab('atmosphere')}
          >
            🎨 Atmosphere
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            ☁️ Sync & Data
          </button>
        </div>

        {/* Status Toast / Alert */}
        {statusMsg.text && (
          <div className={`settings-status-banner ${statusMsg.type}`}>
            {statusMsg.text}
          </div>
        )}

        {/* Tab Content */}
        <div className="settings-body">
          {/* ── PASSKEY TAB ── */}
          {activeTab === 'passkey' && (
            <div className="settings-section">
              <div className="settings-card highlight-card">
                <div className="card-header-row">
                  <div>
                    <h4>Biometric Passkeys (WebAuthn)</h4>
                    <p className="card-desc">
                      Log in instantly using Face ID, Touch ID, Windows Hello, or device screen lock without typing a password.
                    </p>
                  </div>
                  <span className={`badge ${passkeys.length > 0 ? 'badge-active' : 'badge-inactive'}`}>
                    {passkeys.length > 0 ? `${passkeys.length} Registered` : 'Not Set Up'}
                  </span>
                </div>

                {!hasPasskeySupport ? (
                  <div className="warning-box">
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>⚠️ WebAuthn Status Note:</div>
                    <div>{passkeyDiag.reason || 'Passkey WebAuthn API requires a Secure Context (HTTPS or localhost).'}</div>
                    {!passkeyDiag.isSecure && (
                      <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                        💡 On mobile connected via Wi-Fi IP (http://192.168.x.x), modern mobile browsers disable WebAuthn for security. Once deployed to production (https://dailyalign.pages.dev) or accessed via HTTPS, Passkeys work instantly!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="passkey-action-box">
                    <div className="passkey-input-row">
                      <input
                        type="text"
                        className="passkey-name-input"
                        placeholder="Device label (e.g. iPhone 15, MacBook Pro)"
                        value={deviceName}
                        onChange={e => setDeviceName(e.target.value)}
                        maxLength={40}
                      />
                      <button
                        className="passkey-register-btn"
                        onClick={handleRegister}
                        disabled={registering}
                      >
                        {registering ? 'Waiting for Biometrics…' : '+ Add Passkey'}
                      </button>
                    </div>
                    {platformAuthAvailable && (
                      <p className="hint-text">
                        💡 Platform biometric authenticator (Touch ID / Face ID) is ready on this device.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Registered Passkeys List */}
              <div className="settings-card">
                <div className="card-header-row">
                  <h4>Enrolled Passkey Devices</h4>
                  {passkeys.length > 0 && hasPasskeySupport && (
                    <button
                      className="test-passkey-btn"
                      onClick={handleTestPasskey}
                      disabled={testingPasskey}
                      title="Test if your Passkey triggers and authenticates properly"
                    >
                      {testingPasskey ? 'Testing…' : '⚡ Test Passkey'}
                    </button>
                  )}
                </div>

                {loadingPasskeys ? (
                  <p className="loading-text">Loading registered passkeys…</p>
                ) : passkeys.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">🔑</span>
                    <p>No passkeys registered yet.</p>
                    <p className="empty-sub">Click "+ Add Passkey" above to enable instant 1-tap login.</p>
                  </div>
                ) : (
                  <div className="passkey-list">
                    {passkeys.map(pk => (
                      <div key={pk.id} className="passkey-item">
                        <div className="passkey-item-left">
                          <span className="passkey-device-icon">💻</span>
                          <div>
                            <div className="passkey-device-name">{pk.device_name || 'Biometric Device'}</div>
                            <div className="passkey-device-meta">
                              Added on {pk.created_at ? new Date(pk.created_at).toLocaleDateString() : 'Recently'}
                              {pk.last_used_at && ` • Last used ${new Date(pk.last_used_at).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        <button
                          className="passkey-delete-btn"
                          onClick={() => handleDeleteKey(pk.id, pk.device_name)}
                          title="Remove this Passkey"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ATMOSPHERE TAB ── */}
          {activeTab === 'atmosphere' && (
            <div className="settings-section">
              <div className="settings-card">
                <h4>Atmospheric Design & Theme</h4>
                <p className="card-desc">Curated dynamic lighting, particle mesh, and aesthetics.</p>
                
                <div className="atmosphere-grid">
                  <div
                    className={`atmosphere-card ${bgPref === 'mesh' ? 'selected' : ''}`}
                    onClick={() => setBgPref('mesh')}
                  >
                    <div className="atmosphere-preview mesh-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">🌌 Living Aurora</div>
                      <div className="atmosphere-sub">Dynamic undulating chronobiological ambient mesh</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'cosmos' ? 'selected' : ''}`}
                    onClick={() => setBgPref('cosmos')}
                  >
                    <div className="atmosphere-preview cosmos-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">🪐 Obsidian Cosmos</div>
                      <div className="atmosphere-sub">Deep space starlight and drifting indigo nebula</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'cyberpunk' ? 'selected' : ''}`}
                    onClick={() => setBgPref('cyberpunk')}
                  >
                    <div className="atmosphere-preview cyberpunk-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">⚡ Cyberpunk Tokyo</div>
                      <div className="atmosphere-sub">Neon magenta & cyan synthwave grid glow</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'emerald' ? 'selected' : ''}`}
                    onClick={() => setBgPref('emerald')}
                  >
                    <div className="atmosphere-preview emerald-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">🌲 Emerald Zen</div>
                      <div className="atmosphere-sub">Calming jade & bioluminescent forest luminescence</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'solar' ? 'selected' : ''}`}
                    onClick={() => setBgPref('solar')}
                  >
                    <div className="atmosphere-preview solar-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">🌅 Solar Sunset</div>
                      <div className="atmosphere-sub">Golden hour amber, tangerine & twilight warmth</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'oled' ? 'selected' : ''}`}
                    onClick={() => setBgPref('oled')}
                  >
                    <div className="atmosphere-preview oled-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">🌑 OLED Pure</div>
                      <div className="atmosphere-sub">Pitch black minimalist contrast & battery efficiency</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'sky' ? 'selected' : ''}`}
                    onClick={() => setBgPref('sky')}
                  >
                    <div className="atmosphere-preview sky-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">☁️ Ethereal Sky</div>
                      <div className="atmosphere-sub">Daylight azure & twilight gradient lerp</div>
                    </div>
                  </div>

                  <div
                    className={`atmosphere-card ${bgPref === 'classic' ? 'selected' : ''}`}
                    onClick={() => setBgPref('classic')}
                  >
                    <div className="atmosphere-preview classic-preview" />
                    <div className="atmosphere-info">
                      <div className="atmosphere-name">⚡ Classic Fast</div>
                      <div className="atmosphere-sub">Ultra-lightweight native CSS dark palette</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SYNC & DATA TAB ── */}
          {activeTab === 'sync' && (
            <div className="settings-section">
              <div className="settings-card">
                <h4>Cloud & Sync Status</h4>
                <div className="sync-status-grid">
                  <div className="sync-status-item">
                    <span className="sync-dot online" />
                    <div>
                      <div className="sync-status-label">Database</div>
                      <div className="sync-status-val">Cloudflare D1 SQL (Active)</div>
                    </div>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-dot online" />
                    <div>
                      <div className="sync-status-label">Real-Time Sync</div>
                      <div className="sync-status-val">Pusher REST Channel</div>
                    </div>
                  </div>
                </div>

                <div className="sync-actions-row">
                  <button
                    className="action-btn-secondary"
                    onClick={() => {
                      if (onForceSync) onForceSync();
                      setStatusMsg({ type: 'success', text: 'Cache cleared and cloud resync triggered!' });
                    }}
                  >
                    🔄 Force Cache Clear & Resync
                  </button>
                </div>
              </div>

              <div className="settings-card danger-card">
                <h4>Session &amp; Security</h4>
                <p className="card-desc">Lock the application or sign out on this browser.</p>
                <button className="settings-logout-btn" onClick={handleLogout}>
                  <span>🔒</span> Lock &amp; Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="app-version-tag">DailyAlign • v2.5 Atmosphere & Passkey</div>
          <button className="done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
