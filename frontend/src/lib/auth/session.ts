import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "cryptolens_session";
const NONCE_COOKIE = "cryptolens_nonce";
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days
const NONCE_MAX_AGE_S = 5 * 60; // 5 minutes

const DEV_FALLBACK_SECRET =
  "cryptolens-dev-only-secret-do-not-use-in-production-please";

function resolveSecret(): Uint8Array {
  const fromEnv = process.env.JWT_SECRET;
  if (!fromEnv) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(fromEnv);
}

export interface SessionPayload {
  address: string;
}

export async function signSession(address: string): Promise<string> {
  return new SignJWT({ address: address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(resolveSecret());
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, resolveSecret());
    const address = typeof payload.address === "string" ? payload.address : "";
    if (!address) return null;
    return { address };
  } catch {
    return null;
  }
}

export async function writeSessionCookie(address: string): Promise<void> {
  const store = await cookies();
  const token = await signSession(address);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function writeNonceCookie(nonce: string): Promise<void> {
  const store = await cookies();
  store.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NONCE_MAX_AGE_S,
  });
}

export async function consumeNonceCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(NONCE_COOKIE)?.value ?? null;
  if (value) store.delete(NONCE_COOKIE);
  return value;
}
