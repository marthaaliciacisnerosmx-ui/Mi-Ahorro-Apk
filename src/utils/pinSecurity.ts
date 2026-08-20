import type { PinSecurity } from '@/types';
import { storage } from '@/storage/storage';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

function generateSalt(): string {
  const arr = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

function generateRecoveryCode(): string {
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    segments.push(Array.from(arr).map((b) => (b % 36).toString(36)).join('').toUpperCase().slice(0, 4));
  }
  return segments.join('-');
}

async function deriveHash(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const salt = hexToBuf(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH,
  );
  return bufToHex(derivedBits);
}

export async function createPin(pin: string, length: 4 | 6): Promise<{ recoveryCode: string }> {
  const salt = generateSalt();
  const hash = await deriveHash(pin, salt);
  const recoveryCode = generateRecoveryCode();
  const security: PinSecurity = {
    pinLength: length,
    salt,
    hash,
    recoveryCode,
    failedAttempts: 0,
    lockUntil: null,
  };
  await storage.savePinSecurity(security);
  return { recoveryCode };
}

export async function verifyPin(pin: string): Promise<{ ok: boolean; lockedUntil?: number }> {
  const security = await storage.getPinSecurity();
  if (!security) return { ok: false };

  // Check lockout
  if (security.lockUntil && security.lockUntil > Date.now()) {
    return { ok: false, lockedUntil: security.lockUntil };
  }

  const hash = await deriveHash(pin, security.salt);
  if (hash === security.hash) {
    // Reset on success
    await storage.savePinSecurity({ ...security, failedAttempts: 0, lockUntil: null });
    return { ok: true };
  }

  // Progressive backoff
  const attempts = security.failedAttempts + 1;
  let lockUntil: number | null = null;
  if (attempts >= 3) {
    const waitMs = Math.min(Math.pow(2, attempts - 2) * 1000, 300000); // 1s, 2s, 4s... max 5min
    lockUntil = Date.now() + waitMs;
  }
  await storage.savePinSecurity({ ...security, failedAttempts: attempts, lockUntil });
  return { ok: false, lockedUntil: lockUntil ?? undefined };
}

export async function verifyRecoveryCode(code: string): Promise<boolean> {
  const security = await storage.getPinSecurity();
  if (!security) return false;
  return code.trim().toUpperCase() === security.recoveryCode.toUpperCase();
}

export async function resetPinWithRecoveryCode(code: string, newPin: string, length: 4 | 6): Promise<{ recoveryCode: string } | null> {
  const valid = await verifyRecoveryCode(code);
  if (!valid) return null;
  return createPin(newPin, length);
}

export async function changePin(currentPin: string, newPin: string, length: 4 | 6): Promise<{ recoveryCode: string } | null> {
  const result = await verifyPin(currentPin);
  if (!result.ok) return null;
  return createPin(newPin, length);
}

export async function disablePin(currentPin: string): Promise<boolean> {
  const result = await verifyPin(currentPin);
  if (!result.ok) return false;
  await storage.deletePinSecurity();
  return true;
}

export async function getPinLength(): Promise<4 | 6 | null> {
  const security = await storage.getPinSecurity();
  return security?.pinLength ?? null;
}

export async function getLockUntil(): Promise<number | null> {
  const security = await storage.getPinSecurity();
  return security?.lockUntil ?? null;
}

export async function generateNewRecoveryCode(currentPin: string): Promise<string | null> {
  const result = await verifyPin(currentPin);
  if (!result.ok) return null;
  const security = await storage.getPinSecurity();
  if (!security) return null;
  const recoveryCode = generateRecoveryCode();
  await storage.savePinSecurity({ ...security, recoveryCode });
  return recoveryCode;
}
