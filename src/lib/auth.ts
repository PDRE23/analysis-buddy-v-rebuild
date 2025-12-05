/**
 * Authentication Logic
 * Session management, MFA, and credential storage
 */

import { encrypt, decrypt, hash, secureCompare } from "./encryption";
import { logAction } from "./audit";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
}

export interface Session {
  user: User;
  token: string;
  expiresAt: number;
}

interface MfaSettings {
  enabled: boolean;
  secret: string;
  backupCodes: string[]; // hashed values
}

interface StoredUser extends User {
  passwordHash: string;
  mfa?: MfaSettings;
}

const SESSION_KEY = "auth-session";
const SESSION_CACHE_KEY = "auth-session-cache";
const USERS_KEY = "auth-users";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours
const SESSION_ENCRYPTION_KEY = "analysis-buddy-session-secret";
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // +/- 30 seconds

let cachedSession: Session | null = null;

function sanitizeUser(user: StoredUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as StoredUser[];
  } catch (error) {
    console.warn("Failed to load users", error);
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUserByEmail(email: string): StoredUser | undefined {
  const users = loadUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function updateUserRecord(updated: StoredUser): void {
  const users = loadUsers();
  const index = users.findIndex((user) => user.id === updated.id);
  if (index === -1) {
    users.push(updated);
  } else {
    users[index] = updated;
  }
  saveUsers(users);
}

function createSession(user: User): Session {
  return {
    user,
    token: crypto.randomUUID(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
}

export async function setSession(session: Session): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(SESSION_CACHE_KEY, serialized);
    const encrypted = await encrypt(serialized, SESSION_ENCRYPTION_KEY);
    localStorage.setItem(SESSION_KEY, encrypted);
    cachedSession = session;
    logAction(session.user, "user:login", "session", {
      details: {
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error setting session:", error);
  }
}

export async function getSession(): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  if (cachedSession && Date.now() <= cachedSession.expiresAt) {
    return cachedSession;
  }

  const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
  if (cached) {
    try {
      const session = JSON.parse(cached) as Session;
      if (Date.now() <= session.expiresAt) {
        cachedSession = session;
        return session;
      }
      await clearSession();
      return null;
    } catch {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  }

  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) {
    cachedSession = null;
    return null;
  }

  try {
    let payload = stored;
    if (!stored.trim().startsWith("{")) {
      payload = await decrypt(stored, SESSION_ENCRYPTION_KEY);
    }
    const session = JSON.parse(payload) as Session;
    if (Date.now() > session.expiresAt) {
      await clearSession();
      return null;
    }
    cachedSession = session;
    sessionStorage.setItem(SESSION_CACHE_KEY, payload);
    return session;
  } catch (error) {
    console.warn("Failed to decode session", error);
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (typeof window === "undefined") return;
  const user = cachedSession?.user;
  cachedSession = null;
  sessionStorage.removeItem(SESSION_CACHE_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (user) {
    logAction(user, "user:logout", "session");
  }
}

export async function registerUser(params: {
  email: string;
  password: string;
  name: string;
  role?: User["role"];
}): Promise<User> {
  const existing = findUserByEmail(params.email);
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await hash(params.password);
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email: params.email,
    name: params.name,
    role: params.role ?? "user",
    passwordHash,
  };

  updateUserRecord(newUser);
  return sanitizeUser(newUser);
}

export async function authenticateWithPassword(email: string, password: string): Promise<{
  user: User;
  requiresMfa: boolean;
}> {
  const record = findUserByEmail(email);
  if (!record) {
    throw new Error("No account found with this email. Please sign up first.");
  }

  const passwordHash = await hash(password);
  if (!secureCompare(passwordHash, record.passwordHash)) {
    throw new Error("Invalid password. Please check your password and try again.");
  }

  const user = sanitizeUser(record);
  const requiresMfa = Boolean(record.mfa?.enabled);

  if (!requiresMfa) {
    const session = createSession(user);
    await setSession(session);
  }

  return { user, requiresMfa };
}

export async function verifyMfaChallenge(email: string, code: string): Promise<boolean> {
  const record = findUserByEmail(email);
  if (!record || !record.mfa?.enabled) {
    return false;
  }

  const sanitized = code.replace(/\s+/g, "").toUpperCase();

  // Check backup codes first
  if (record.mfa.backupCodes.length > 0) {
    const hashedInput = await hash(sanitized);
    const matchingIndex = record.mfa.backupCodes.findIndex((value) => secureCompare(value, hashedInput));
    if (matchingIndex >= 0) {
      record.mfa.backupCodes.splice(matchingIndex, 1);
      updateUserRecord(record);
      const session = createSession(sanitizeUser(record));
      await setSession(session);
      return true;
    }
  }

  const valid = await verifyTotp(record.mfa.secret, sanitized);
  if (!valid) {
    return false;
  }

  const session = createSession(sanitizeUser(record));
  await setSession(session);
  return true;
}

export async function initiateMfaEnrollment(email: string): Promise<{
  secret: string;
  backupCodes: string[];
}> {
  const record = findUserByEmail(email);
  if (!record) {
    throw new Error("User not found");
  }

  const secret = generateTotpSecret();
  const { plainCodes, hashedCodes } = await generateBackupCodes();
  record.mfa = {
    enabled: false,
    secret,
    backupCodes: hashedCodes,
  };
  updateUserRecord(record);
  return { secret, backupCodes: plainCodes };
}

export async function confirmMfaEnrollment(email: string, code: string): Promise<boolean> {
  const record = findUserByEmail(email);
  if (!record || !record.mfa) {
    return false;
  }

  const valid = await verifyTotp(record.mfa.secret, code.replace(/\s+/g, ""));
  if (!valid) {
    return false;
  }

  record.mfa.enabled = true;
  updateUserRecord(record);
  return true;
}

export async function disableMfa(email: string): Promise<void> {
  const record = findUserByEmail(email);
  if (!record || !record.mfa) return;
  delete record.mfa;
  updateUserRecord(record);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function hasRole(role: User["role"]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === role;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireRole(role: User["role"]): Promise<User> {
  const user = await requireAuth();
  if (user.role === "admin") {
    return user;
  }
  const permitted = await hasRole(role);
  if (!permitted) {
    throw new Error(`Role '${role}' required`);
  }
  return user;
}

function generateTotpSecret(bytes = 20): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return base32Encode(array);
}

async function generateTotpCode(secret: string, counter: number): Promise<string> {
  const keyData = base32Decode(secret);
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  for (let i = 7; i >= 0; i--) {
    counterView.setUint8(i, counter & 0xff);
    counter = counter >> 8;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer);
  const bytes = new Uint8Array(signature);
  const offset = bytes[bytes.length - 1] & 0xf;
  const binary =
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff);

  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const sanitized = code.replace(/\s+/g, "");
  const timeCounter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  const counters = [];
  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset++) {
    counters.push(timeCounter + offset);
  }

  const codes = await Promise.all(counters.map((counter) => generateTotpCode(secret, counter)));
  return codes.some((candidate) => secureCompare(candidate, sanitized));
}

async function generateBackupCodes(count = 8): Promise<{ plainCodes: string[]; hashedCodes: string[] }> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const plain = createBackupCode();
    plainCodes.push(plain);
    hashedCodes.push(await hash(plain));
  }

  return { plainCodes, hashedCodes };
}

function createBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(10));
  randomValues.forEach((value) => {
    code += chars[value % chars.length];
  });
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 31;
      output += BASE32_ALPHABET[index];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Uint8Array {
  const sanitized = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of sanitized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}

