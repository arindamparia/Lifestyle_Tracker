// Utility functions for WebAuthn (Passkey) client-side authentication and registration

/**
 * Safely parse a fetch response as JSON.
 * If the server returns an HTML error page (e.g. Vite SPA fallback when the
 * local backend isn't running), this throws a meaningful message instead of
 * the cryptic "Unexpected token '<'" crash.
 */
async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    // HTML response = backend server unreachable or crashed
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Backend server is unreachable. Make sure the dev server (npm start) is running and try again.'
      );
    }
    throw new Error(`Unexpected response from server (status ${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export function isPasskeySupported() {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

export function getPasskeyDiagnostics() {
  if (typeof window === 'undefined') {
    return { supported: false, isSecure: false, reason: 'SSR environment' };
  }
  const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasAPI = !!window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

  if (!isSecure) {
    return {
      supported: false,
      isSecure: false,
      reason: 'Passkeys require a Secure Context (HTTPS or localhost). If you are accessing via a local network IP (http://192.168.x.x), browsers disable WebAuthn for security. Passkeys work seamlessly on https://dailyalign.pages.dev.'
    };
  }

  if (!hasAPI) {
    return {
      supported: false,
      isSecure: true,
      reason: 'Your current browser does not have the WebAuthn Public Key Credential API enabled.'
    };
  }

  return { supported: true, isSecure: true, reason: 'Supported' };
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isPasskeySupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Convert Base64URL string to Uint8Array
export function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert ArrayBuffer to Base64URL string
export function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Perform Passkey Registration (Face ID / Touch ID / Security Key)
 * @param {string} authToken - Current user session token
 * @param {string} deviceName - Optional user-defined device label
 */
export async function registerPasskey(authToken, deviceName = '') {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported on this browser or platform.');
  }

  // 1. Fetch options from backend
  const optRes = await fetch('/api/passkey?action=register-options', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const options = await safeJson(optRes);
  if (!optRes.ok) {
    throw new Error(options.error || 'Failed to get Passkey registration options');
  }

  // Convert binary fields
  options.challenge = base64UrlToUint8Array(options.challenge);
  options.user.id = base64UrlToUint8Array(options.user.id);
  if (options.excludeCredentials) {
    options.excludeCredentials = options.excludeCredentials.map(cred => ({
      ...cred,
      id: base64UrlToUint8Array(cred.id),
    }));
  }

  // 2. Invoke browser WebAuthn API
  const credential = await navigator.credentials.create({
    publicKey: options,
  });

  if (!credential) {
    throw new Error('Passkey creation cancelled or failed.');
  }

  // 3. Extract public key and credentials
  let publicKeyBase64 = '';
  let algorithm = -7;

  if (typeof credential.response.getPublicKey === 'function') {
    const pubKeyBuffer = credential.response.getPublicKey();
    if (pubKeyBuffer) {
      publicKeyBase64 = arrayBufferToBase64Url(pubKeyBuffer);
    }
  }

  if (typeof credential.response.getPublicKeyAlgorithm === 'function') {
    algorithm = credential.response.getPublicKeyAlgorithm() || -7;
  }

  // Fallback if getPublicKey() is not exposed: send attestationObject for server parsing
  const attestationObject = arrayBufferToBase64Url(credential.response.attestationObject);
  const clientDataJSON = arrayBufferToBase64Url(credential.response.clientDataJSON);

  // If getPublicKey is unavailable, we still have attestationObject
  if (!publicKeyBase64) {
    // In rare browsers without getPublicKey, attestationObject is used
    publicKeyBase64 = attestationObject;
  }

  const payload = {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    deviceName: deviceName || (navigator.userAgent.includes('Mac') ? 'MacBook / Mac' : navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Biometric Device'),
    response: {
      clientDataJSON,
      attestationObject,
      publicKey: publicKeyBase64,
      algorithm,
    },
  };

  // 4. Send back to server to save
  const verifyRes = await fetch('/api/passkey?action=register-verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  const verifyData = await safeJson(verifyRes);
  if (!verifyRes.ok) {
    throw new Error(verifyData.error || 'Failed to verify passkey registration');
  }

  return verifyData;
}

/**
 * Perform Passkey Login (Biometric Face ID / Touch ID / Windows Hello)
 * @returns {Promise<{token: string}>}
 */
export async function authenticateWithPasskey() {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported on this browser or platform.');
  }

  // 1. Fetch options from server
  const optRes = await fetch('/api/passkey?action=login-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const options = await safeJson(optRes);
  if (!optRes.ok) {
    throw new Error(options.error || 'Failed to initialize Passkey login');
  }

  if (!options.allowCredentials || options.allowCredentials.length === 0) {
    throw new Error('No Passkeys registered yet. Please log in with password first and set up a Passkey in Settings.');
  }

  options.challenge = base64UrlToUint8Array(options.challenge);
  options.allowCredentials = options.allowCredentials.map(cred => ({
    ...cred,
    id: base64UrlToUint8Array(cred.id),
  }));

  // 2. Invoke browser WebAuthn API
  const assertion = await navigator.credentials.get({
    publicKey: options,
  });

  if (!assertion) {
    throw new Error('Passkey authentication cancelled.');
  }

  // 3. Encode assertion response
  const payload = {
    id: assertion.id,
    rawId: arrayBufferToBase64Url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: arrayBufferToBase64Url(assertion.response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(assertion.response.authenticatorData),
      signature: arrayBufferToBase64Url(assertion.response.signature),
      userHandle: assertion.response.userHandle ? arrayBufferToBase64Url(assertion.response.userHandle) : null,
    },
  };

  // 4. Send to server for cryptographic signature verification
  const verifyRes = await fetch('/api/passkey?action=login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const verifyData = await safeJson(verifyRes);
  if (!verifyRes.ok) {
    throw new Error(verifyData.error || 'Passkey verification failed');
  }

  return verifyData;
}

/**
 * List registered passkeys for the current user
 */
export async function listPasskeys(authToken) {
  const res = await fetch('/api/passkey?action=list', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'Failed to fetch passkeys');
  return data;
}

/**
 * Delete a passkey
 */
export async function deletePasskey(authToken, passkeyId) {
  const res = await fetch(`/api/passkey?action=delete&id=${passkeyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'Failed to remove passkey');
  return data;
}
