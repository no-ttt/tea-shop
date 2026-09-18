import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db/client";
import { siteSettings } from "./db/schema";

const ADMIN_PASSWORD_OVERRIDE_KEY = "auth.adminPasswordOverride";
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const SESSION_COOKIE_NAME = "qw_admin_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password) as BufferSource, "PBKDF2", false, [
    "deriveBits",
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    HASH_BITS,
  );
  return new Uint8Array(derived);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  const actual = await derivePbkdf2(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

export async function getAdminPasswordOverrideHash(): Promise<string | null> {
  const db = await getDb();
  const row = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, ADMIN_PASSWORD_OVERRIDE_KEY))
    .get();
  return row?.value ?? null;
}

export async function setAdminPasswordOverrideHash(hash: string): Promise<void> {
  const db = await getDb();
  await db
    .insert(siteSettings)
    .values({ key: ADMIN_PASSWORD_OVERRIDE_KEY, value: hash })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: hash } });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const override = await getAdminPasswordOverrideHash();
  if (override) return verifyPassword(password, override);

  const { env } = getCloudflareContext();
  const fallback = env.ADMIN_PASSWORD;
  if (!fallback) return false;
  const encoder = new TextEncoder();
  return timingSafeEqual(encoder.encode(password), encoder.encode(fallback));
}

interface SessionPayload {
  sub: "admin";
  iat: number;
  exp: number;
}

async function getSessionSecretKey(): Promise<CryptoKey> {
  const { env } = getCloudflareContext();
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET 未設定");
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionCookie(): Promise<string> {
  const key = await getSessionSecretKey();
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub: "admin", iat, exp: iat + SESSION_MAX_AGE_SECONDS };
  const encoder = new TextEncoder();
  const payloadPart = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadPart));
  const signaturePart = toBase64Url(new Uint8Array(signature));
  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionCookie(cookieValue: string | undefined | null): Promise<boolean> {
  if (!cookieValue) return false;
  const [payloadPart, signaturePart] = cookieValue.split(".");
  if (!payloadPart || !signaturePart) return false;

  try {
    const key = await getSessionSecretKey();
    const encoder = new TextEncoder();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signaturePart) as BufferSource,
      encoder.encode(payloadPart) as BufferSource,
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    return payload.sub === "admin" && payload.exp > now;
  } catch {
    return false;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
