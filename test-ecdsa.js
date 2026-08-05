import crypto from 'crypto';

// ASN.1 DER signature from WebAuthn looks like: 30 44 02 20 (r) 02 20 (s)
// WebCrypto needs 64 bytes of r+s.
function parseDerSignature(derSig) {
  // Very naive parser for testing
  let offset = 0;
  if (derSig[offset++] !== 0x30) throw new Error('Expected SEQUENCE');
  const seqLen = derSig[offset++]; // Assuming < 128
  if (derSig[offset++] !== 0x02) throw new Error('Expected INTEGER (r)');
  let rLen = derSig[offset++];
  let r = derSig.slice(offset, offset + rLen);
  if (r.length === 33 && r[0] === 0) r = r.slice(1);
  offset += rLen;
  if (derSig[offset++] !== 0x02) throw new Error('Expected INTEGER (s)');
  let sLen = derSig[offset++];
  let s = derSig.slice(offset, offset + sLen);
  if (s.length === 33 && s[0] === 0) s = s.slice(1);
  
  const raw = new Uint8Array(64);
  raw.set(r.slice(-32), 32 - r.length);
  raw.set(s.slice(-32), 64 - s.length);
  return raw;
}
console.log('Script created');
