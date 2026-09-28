"use client";

import { create } from "zustand";
import { useUsersStore } from "@/store/users";

/**
 * Email + OTP sign-in.
 *
 * There is no mail service behind this portal, so the generated code is shown
 * on screen in a prototype banner, the same trick the invite flow already uses
 * for invite links. Everything else is real: codes are randomly generated, they
 * genuinely expire, wrong guesses are counted, and too many lock the challenge.
 * That keeps every branch of the flow exercisable rather than decorative.
 */

/** How long a code stays valid. */
export const CODE_TTL_MS = 5 * 60_000;
/** How long before a new code can be requested. */
export const RESEND_COOLDOWN_MS = 30_000;
/** Wrong guesses allowed before the challenge locks. */
export const MAX_ATTEMPTS = 5;
/** How long a locked challenge stays locked. */
export const LOCKOUT_MS = 60_000;

export interface OtpChallenge {
  email: string;
  code: string;
  issuedAt: number;
  expiresAt: number;
  attempts: number;
  lockedUntil: number | null;
}

export type OtpResult = { ok: true } | { ok: false; error: string };

function sixDigits(): string {
  // crypto.getRandomValues keeps the code genuinely unpredictable; the modulo
  // bias across 0–999999 is irrelevant for a prototype credential.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

function secondsUntil(ts: number): number {
  return Math.max(0, Math.ceil((ts - Date.now()) / 1000));
}

interface OtpState {
  challenge: OtpChallenge | null;
  /** Start (or restart) a challenge for an email. */
  request: (email: string) => OtpResult;
  /** Issue a fresh code for the current challenge, honouring the cooldown. */
  resend: () => OtpResult;
  /** Check a code. Success leaves the challenge in place for the caller to consume. */
  verify: (code: string) => OtpResult;
  /** Seconds left before a resend is allowed (0 when ready). */
  resendIn: () => number;
  /** Seconds left before the current code expires (0 when expired/absent). */
  expiresIn: () => number;
  /** Seconds left on a lockout (0 when not locked). */
  lockedFor: () => number;
  clear: () => void;
}

export const useOtpStore = create<OtpState>()((set, get) => ({
  challenge: null,

  request: (email) => {
    const trimmed = email.trim();
    if (!trimmed) return { ok: false, error: "Enter your email address." };

    const user = useUsersStore
      .getState()
      .users.find((u) => u.email.toLowerCase() === trimmed.toLowerCase());

    if (!user) {
      return { ok: false, error: "No account found with that email address." };
    }
    if (user.status === "inactive") {
      return { ok: false, error: "Your account is inactive. Contact an administrator." };
    }

    const now = Date.now();
    set({
      challenge: {
        email: user.email,
        code: sixDigits(),
        issuedAt: now,
        expiresAt: now + CODE_TTL_MS,
        attempts: 0,
        lockedUntil: null,
      },
    });
    return { ok: true };
  },

  resend: () => {
    const challenge = get().challenge;
    if (!challenge) return { ok: false, error: "Start again. No code was requested." };

    const wait = get().resendIn();
    if (wait > 0) {
      return { ok: false, error: `Wait ${wait}s before requesting another code.` };
    }

    const now = Date.now();
    set({
      challenge: {
        ...challenge,
        code: sixDigits(),
        issuedAt: now,
        expiresAt: now + CODE_TTL_MS,
        // A fresh code clears the strike count and any lockout.
        attempts: 0,
        lockedUntil: null,
      },
    });
    return { ok: true };
  },

  verify: (code) => {
    const challenge = get().challenge;
    if (!challenge) return { ok: false, error: "Start again. No code was requested." };

    const locked = get().lockedFor();
    if (locked > 0) {
      return { ok: false, error: `Too many attempts. Try again in ${locked}s.` };
    }
    if (Date.now() > challenge.expiresAt) {
      return { ok: false, error: "That code has expired. Request a new one." };
    }

    const entered = code.trim();
    if (entered.length !== 6) {
      return { ok: false, error: "Enter all six digits." };
    }

    if (entered !== challenge.code) {
      const attempts = challenge.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      set({
        challenge: {
          ...challenge,
          attempts,
          lockedUntil: exhausted ? Date.now() + LOCKOUT_MS : null,
        },
      });
      return exhausted
        ? { ok: false, error: `Too many attempts. Try again in ${Math.ceil(LOCKOUT_MS / 1000)}s.` }
        : {
            ok: false,
            error: `Incorrect code. ${MAX_ATTEMPTS - attempts} attempt${
              MAX_ATTEMPTS - attempts === 1 ? "" : "s"
            } remaining.`,
          };
    }

    return { ok: true };
  },

  resendIn: () => {
    const challenge = get().challenge;
    if (!challenge) return 0;
    return secondsUntil(challenge.issuedAt + RESEND_COOLDOWN_MS);
  },

  expiresIn: () => {
    const challenge = get().challenge;
    if (!challenge) return 0;
    return secondsUntil(challenge.expiresAt);
  },

  lockedFor: () => {
    const challenge = get().challenge;
    if (!challenge?.lockedUntil) return 0;
    return secondsUntil(challenge.lockedUntil);
  },

  clear: () => set({ challenge: null }),
}));
