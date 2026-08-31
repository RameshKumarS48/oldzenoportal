export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Session token format: base64url(payload) + "." + hex(HMAC-SHA256)
// Payload: { uid, role, exp }
const SECRET = process.env.SESSION_SECRET ?? "zeno-dev-secret-change-in-prod";

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(str: string): string {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}

export interface SessionPayload {
  uid: string;
  role: string;
  exp: number; // unix seconds
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const body = b64url(JSON.stringify(payload));
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${body}.${sigHex}`;
}

export interface InvitePayload {
  email: string;
  role: string;
  invitedBy: string;
  exp: number;
}

export async function createInviteToken(payload: Omit<InvitePayload, "exp">): Promise<string> {
  const full: InvitePayload = { ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 };
  const body = b64url(JSON.stringify(full));
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${body}.${sigHex}`;
}

export async function verifyInviteToken(token: string): Promise<InvitePayload | null> {
  try {
    const [body, sigHex] = token.split(".");
    if (!body || !sigHex) return null;
    const key = await getHmacKey();
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expectedHex = Array.from(new Uint8Array(expectedSig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (sigHex !== expectedHex) return null;
    const payload: InvitePayload = JSON.parse(fromB64url(body));
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createVerificationToken(email: string): Promise<string> {
  const payload = { email, type: "email-verify", exp: Math.floor(Date.now() / 1000) + 24 * 3600 };
  const body = b64url(JSON.stringify(payload));
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${body}.${sigHex}`;
}

export async function verifyEmailToken(token: string): Promise<string | null> {
  try {
    const [body, sigHex] = token.split(".");
    if (!body || !sigHex) return null;
    const key = await getHmacKey();
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expectedHex = Array.from(new Uint8Array(expectedSig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (sigHex !== expectedHex) return null;
    const payload = JSON.parse(fromB64url(body));
    if (payload.type !== "email-verify") return null;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload.email as string;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [body, sigHex] = token.split(".");
    if (!body || !sigHex) return null;

    const key = await getHmacKey();
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sigHex !== expectedHex) return null;

    const payload: SessionPayload = JSON.parse(fromB64url(body));
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
