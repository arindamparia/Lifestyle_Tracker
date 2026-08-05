/**
 * Passkey (WebAuthn) API — Cloudflare Pages Function
 *
 * Uses ONLY the Web Crypto API (crypto.subtle) — no Node.js "crypto" module.
 * Works natively in Cloudflare Workers without any nodejs_compat flag.
 * Also compatible with Node.js 18+ (which ships Web Crypto globally).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const PASSKEY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS passkeys (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id TEXT UNIQUE NOT NULL,
  public_key    TEXT NOT NULL,
  algorithm     INTEGER NOT NULL DEFAULT -7,
  counter       INTEGER NOT NULL DEFAULT 0,
  device_name   TEXT DEFAULT 'Passkey Device',
  created_at    TEXT DEFAULT (CURRENT_TIMESTAMP),
  last_used_at  TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_passkeys_cred ON passkeys(credential_id);

CREATE TABLE IF NOT EXISTS passkey_challenges (
  challenge   TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);
`;

let schemaInitialized = false;
async function ensurePasskeySchema(db) {
  if (schemaInitialized || !db) return;
  try {
    await db.exec(PASSKEY_SCHEMA_SQL);
    schemaInitialized = true;
  } catch (err) {
    console.error('[Passkey] Schema initialization error:', err);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function b64uToBytes(b64u) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - b64.length % 4) % 4;
  const padded = b64 + '==='.slice(0, pad);
  const raw = atob(padded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

function bytesToB64u(bytes) {
  let raw = '';
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generates a 32-byte random challenge and returns it as base64url */
function generateChallenge() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return bytesToB64u(buf);
}

/** Concatenates multiple Uint8Arrays */
function concatBytes(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── Token helpers (HMAC-SHA256 via Web Crypto) ───────────────────────────────

async function getHmacKey(secret) {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
}

async function createToken(secret) {
  const payload = bytesToB64u(new TextEncoder().encode(
    JSON.stringify({ ts: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ));
  const key = await getHmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return `${payload}.${bytesToB64u(sig)}`;
}

async function verifyToken(token, rawSecret) {
  const secret = (rawSecret || '').replace(/^["']|["']$/g, '').trim();
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const key = await getHmacKey(secret);
    const sigBytes = b64uToBytes(sig);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
    if (!isValid) return false;
    const data = JSON.parse(new TextDecoder().decode(b64uToBytes(payload)));
    return data.exp > Date.now();
  } catch { return false; }
}

// ── Signature verification (Web Crypto ECDSA / RSA) ──────────────────────────

/**
 * Import a public key from its SPKI DER bytes (stored as base64url).
 * Supports ES256 (ECDSA P-256, alg -7) and RS256 (RSA-PKCS1v15, alg -257).
 */
async function importPublicKey(spkiBase64Url, algorithm) {
  const keyBytes = b64uToBytes(spkiBase64Url);
  if (algorithm === -257) {
    // RS256
    return crypto.subtle.importKey(
      'spki', keyBytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );
  }
  // Default: ES256 (ECDSA P-256)
  return crypto.subtle.importKey(
    'spki', keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['verify']
  );
}

async function verifyPasskeySignature(publicKeyB64u, algorithm, signedData, signatureBytes) {
  const pubKey = await importPublicKey(publicKeyB64u, algorithm);
  if (algorithm === -257) {
    return crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      pubKey, signatureBytes, signedData
    );
  }
  // ES256 — DER-encoded signature from WebAuthn
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pubKey, signatureBytes, signedData
  );
}

function parseClientData(clientDataBase64Url) {
  try {
    const json = new TextDecoder().decode(b64uToBytes(clientDataBase64Url));
    return JSON.parse(json);
  } catch { return null; }
}

// ── Request handlers ──────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const configuredSecret = (env.APP_SECRET || '').replace(/^["']|["']$/g, '').trim();

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const db = env.DB || env.DATABASE;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database (D1) binding is missing in Cloudflare environment.' }), {
      status: 500, headers: CORS_HEADERS,
    });
  }

  await ensurePasskeySchema(db);

  // Clean expired challenges
  try {
    await db.prepare('DELETE FROM passkey_challenges WHERE expires_at < ?').bind(Date.now()).run();
  } catch {}

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // ──────────────────────────────────────────────────────────────────────────
  // register-options — Generate challenge for passkey creation (requires token)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'register-options' && request.method === 'POST') {
    if (!await verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Valid session required to register a Passkey' }), {
        status: 401, headers: CORS_HEADERS,
      });
    }

    const challenge = generateChallenge();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.prepare('INSERT INTO passkey_challenges (challenge, type, expires_at) VALUES (?, ?, ?)')
      .bind(challenge, 'registration', expiresAt).run();

    const { results: existingKeys } = await db.prepare('SELECT credential_id FROM passkeys').all();
    const excludeCredentials = (existingKeys || []).map(k => ({ id: k.credential_id, type: 'public-key' }));

    const rpId = url.hostname;
    return new Response(JSON.stringify({
      challenge,
      rp: { name: 'DailyAlign Tracker', id: rpId },
      user: {
        id: bytesToB64u(new TextEncoder().encode('dailyalign-user')),
        name: 'user@dailyalign',
        displayName: 'DailyAlign User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials,
    }), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // register-verify — Verify registration & store public key (requires token)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'register-verify' && request.method === 'POST') {
    if (!await verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const body = await request.json().catch(() => ({}));
    const { id: credentialId, response, deviceName } = body;

    if (!credentialId || !response || !response.clientDataJSON) {
      return new Response(JSON.stringify({ error: 'Malformed registration payload' }), { status: 400, headers: CORS_HEADERS });
    }

    const clientData = parseClientData(response.clientDataJSON);
    if (!clientData || clientData.type !== 'webauthn.create') {
      return new Response(JSON.stringify({ error: 'Invalid clientData type' }), { status: 400, headers: CORS_HEADERS });
    }

    const challengeRow = await db.prepare('SELECT challenge FROM passkey_challenges WHERE challenge = ? AND type = ? AND expires_at >= ?')
      .bind(clientData.challenge, 'registration', Date.now()).first();

    if (!challengeRow) {
      return new Response(JSON.stringify({ error: 'Passkey registration challenge expired or invalid' }), { status: 400, headers: CORS_HEADERS });
    }

    await db.prepare('DELETE FROM passkey_challenges WHERE challenge = ?').bind(clientData.challenge).run();

    const spkiDerBase64 = response.publicKey;
    if (!spkiDerBase64) {
      return new Response(JSON.stringify({ error: 'Public key missing in registration response' }), { status: 400, headers: CORS_HEADERS });
    }

    const algorithm = response.algorithm || -7;
    const name = (deviceName || 'Passkey Device').trim().slice(0, 50);

    await db.prepare(
      'INSERT INTO passkeys (credential_id, public_key, algorithm, counter, device_name, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT(credential_id) DO UPDATE SET public_key = excluded.public_key, device_name = excluded.device_name'
    ).bind(credentialId, spkiDerBase64, algorithm, 0, name).run();

    return new Response(JSON.stringify({ success: true, message: 'Passkey registered successfully!' }), {
      status: 200, headers: CORS_HEADERS,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // login-options — Generate challenge for authentication (public)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'login-options' && request.method === 'POST') {
    const challenge = generateChallenge();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.prepare('INSERT INTO passkey_challenges (challenge, type, expires_at) VALUES (?, ?, ?)')
      .bind(challenge, 'login', expiresAt).run();

    const { results: passkeys } = await db.prepare('SELECT credential_id FROM passkeys').all();
    const allowCredentials = (passkeys || []).map(k => ({ id: k.credential_id, type: 'public-key' }));

    if (allowCredentials.length === 0) {
      return new Response(JSON.stringify({ error: 'No passkeys registered. Please log in with password first.' }), {
        status: 404, headers: CORS_HEADERS,
      });
    }

    return new Response(JSON.stringify({
      challenge,
      rpId: url.hostname,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials,
    }), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // login-verify — Verify passkey signature & return session token (public)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'login-verify' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { id: credentialId, response } = body;

    if (!credentialId || !response || !response.clientDataJSON || !response.authenticatorData || !response.signature) {
      return new Response(JSON.stringify({ error: 'Malformed authentication assertion payload' }), { status: 400, headers: CORS_HEADERS });
    }

    const clientData = parseClientData(response.clientDataJSON);
    if (!clientData || clientData.type !== 'webauthn.get') {
      return new Response(JSON.stringify({ error: 'Invalid clientData type' }), { status: 400, headers: CORS_HEADERS });
    }

    const challengeRow = await db.prepare('SELECT challenge FROM passkey_challenges WHERE challenge = ? AND type = ? AND expires_at >= ?')
      .bind(clientData.challenge, 'login', Date.now()).first();

    if (!challengeRow) {
      return new Response(JSON.stringify({ error: 'Passkey login challenge expired or invalid' }), { status: 400, headers: CORS_HEADERS });
    }

    await db.prepare('DELETE FROM passkey_challenges WHERE challenge = ?').bind(clientData.challenge).run();

    const passkey = await db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').bind(credentialId).first();
    if (!passkey) {
      return new Response(JSON.stringify({ error: 'Passkey not recognized' }), { status: 401, headers: CORS_HEADERS });
    }

    // Cryptographic verification using Web Crypto API
    try {
      // SHA-256(clientDataJSON)
      const clientDataBytes = b64uToBytes(response.clientDataJSON);
      const clientDataHashBytes = new Uint8Array(
        await crypto.subtle.digest('SHA-256', clientDataBytes)
      );

      // signedData = authData || SHA-256(clientDataJSON)
      const authDataBytes = b64uToBytes(response.authenticatorData);
      const signedData = concatBytes(authDataBytes, clientDataHashBytes);
      const signatureBytes = b64uToBytes(response.signature);

      const isValid = await verifyPasskeySignature(
        passkey.public_key,
        passkey.algorithm || -7,
        signedData,
        signatureBytes
      );

      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Passkey biometric signature verification failed' }), { status: 401, headers: CORS_HEADERS });
      }
    } catch (verErr) {
      console.error('[Passkey] Signature verification error:', verErr);
      return new Response(JSON.stringify({ error: `Verification failed: ${verErr.message}` }), { status: 401, headers: CORS_HEADERS });
    }

    // Update last used timestamp
    try {
      await db.prepare('UPDATE passkeys SET last_used_at = CURRENT_TIMESTAMP WHERE credential_id = ?')
        .bind(credentialId).run();
    } catch {}

    const newToken = await createToken(configuredSecret);
    return new Response(JSON.stringify({ success: true, token: newToken }), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // list — List registered passkeys (requires token)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'list' && request.method === 'GET') {
    if (!await verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const { results } = await db.prepare(
      'SELECT id, credential_id, device_name, created_at, last_used_at FROM passkeys ORDER BY created_at DESC'
    ).all();

    return new Response(JSON.stringify({ passkeys: results || [] }), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // delete — Remove a registered passkey (requires token)
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'delete' && request.method === 'DELETE') {
    if (!await verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const keyId = url.searchParams.get('id');
    const credId = url.searchParams.get('credential_id');

    if (keyId) {
      await db.prepare('DELETE FROM passkeys WHERE id = ?').bind(keyId).run();
    } else if (credId) {
      await db.prepare('DELETE FROM passkeys WHERE credential_id = ?').bind(credId).run();
    } else {
      return new Response(JSON.stringify({ error: 'Missing passkey ID' }), { status: 400, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ success: true, message: 'Passkey removed' }), { status: 200, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ error: 'Invalid action or method' }), { status: 400, headers: CORS_HEADERS });
}
