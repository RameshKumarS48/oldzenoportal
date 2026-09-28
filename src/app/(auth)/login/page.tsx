"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useOtpStore, CODE_TTL_MS } from "@/store/otp";
import { OtpInput } from "@/components/auth/OtpInput";

/**
 * Sign-in is a swap: you arrive without a code, you leave with access, and the
 * code you use lasts minutes. The bay on the left carries that, a battery that
 * drains with the code's remaining life, so the thing on screen is real state
 * rather than ornament.
 */

const SEGMENTS = 10;
const TOWNS = ["Nairobi", "Nanyuki", "Nyeri", "Naro Moru"];

function mmss(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Battery({ fraction, live }: { fraction: number; live: boolean }) {
  const lit = Math.ceil(fraction * SEGMENTS);
  return (
    <div className="flex flex-col items-center gap-3" aria-hidden="true">
      <span className="h-1.5 w-8 rounded-t-sm bg-white/15" />
      <div className="flex flex-col-reverse gap-1.5 rounded-xl border border-white/15 bg-[#0B3945] p-2">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          // Empty until a code exists: no code issued means no charge to show.
          <span
            key={i}
            className="h-3.5 w-14 rounded-[3px] transition-colors duration-500 motion-reduce:transition-none"
            style={{ backgroundColor: live && i < lit ? "#FF4F17" : "#0F4A57" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);

  const challenge = useOtpStore((s) => s.challenge);
  const requestCode = useOtpStore((s) => s.request);
  const resendCode = useOtpStore((s) => s.resend);
  const verifyCode = useOtpStore((s) => s.verify);
  const clearChallenge = useOtpStore((s) => s.clear);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (hasHydrated && user) router.replace("/asset-tracking");
  }, [hasHydrated, user, router]);

  useEffect(() => {
    if (step !== "code") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  const resendIn = useOtpStore.getState().resendIn();
  const expiresIn = useOtpStore.getState().expiresIn();
  const lockedFor = useOtpStore.getState().lockedFor();
  const onCode = step === "code";
  const expired = onCode && expiresIn === 0;
  const fraction = Math.max(0, Math.min(1, expiresIn / (CODE_TTL_MS / 1000)));

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice("");
    const result = requestCode(email);
    if (!result.ok) return setError(result.error);
    setCode("");
    setStep("code");
  };

  const verify = (submitted?: string) => {
    setError(""); setNotice("");
    const result = verifyCode(submitted ?? code);
    if (!result.ok) return setError(result.error);

    setBusy(true);
    void loginWithOtp(challenge!.email).then((auth) => {
      setBusy(false);
      if (!auth.success) return setError(auth.error ?? "Couldn't sign you in.");
      clearChallenge();
      router.push("/asset-tracking");
    });
  };

  const resend = () => {
    setError("");
    const result = resendCode();
    if (!result.ok) return setError(result.error);
    setCode("");
    setNotice("New code sent.");
  };

  const startOver = () => {
    clearChallenge();
    setStep("email"); setCode(""); setError(""); setNotice("");
  };

  return (
    <div className="min-h-screen bg-[#F4F6F6] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* The bay */}
      <aside className="flex items-center justify-between gap-8 bg-[#05262E] px-8 py-8 lg:flex-col lg:items-stretch lg:justify-between lg:px-12 lg:py-14">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#FF4F17]">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M6 3L18 12L6 21" />
            </svg>
          </span>
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ZENO
          </span>
        </div>

        <div className="flex items-center gap-6 lg:flex-col lg:gap-5">
          <div className="hidden lg:block">
            <Battery fraction={fraction} live={onCode} />
          </div>
          <p className="max-w-[22ch] text-sm leading-relaxed text-white/45 lg:text-center">
            {onCode
              ? expired
                ? "That code is spent. Send a fresh one."
                : `Code good for ${mmss(expiresIn)}`
              : "Codes last five minutes, then they're gone."}
          </p>
        </div>

        <p className="hidden text-xs leading-relaxed text-white/30 lg:block">
          Fleet operations across {TOWNS.slice(0, -1).join(", ")} and {TOWNS.at(-1)}.
        </p>
      </aside>

      {/* The form */}
      <main className="flex items-center px-8 py-16 lg:px-20">
        <div className="w-full max-w-[34ch]">
          {!onCode ? (
            <form onSubmit={sendCode} noValidate>
              <h1
                className="text-[40px] font-bold leading-[1.05] tracking-tight text-[#0B1D22]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sign in
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5E7278]">
                Enter your work email and we&apos;ll send you a code. There&apos;s no password
                to remember.
              </p>

              <label htmlFor="email" className="mt-10 block text-[13px] font-semibold text-[#0B1D22]">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@zeno.earth"
                autoComplete="email"
                autoFocus
                className="mt-2 w-full rounded-lg border border-[#D3DCDD] bg-white px-4 py-3.5 text-[15px] text-[#0B1D22] placeholder:text-[#9BAAAE] focus:border-[#05262E] focus:outline-none focus:ring-2 focus:ring-[#05262E]/15"
              />

              {error && <p className="mt-3 text-sm text-[#C4340A]">{error}</p>}

              <button
                type="submit"
                className="mt-6 w-full rounded-lg bg-[#05262E] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0B3945] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05262E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F6F6]"
              >
                Send code
              </button>
            </form>
          ) : (
            <div>
              <h1
                className="text-[40px] font-bold leading-[1.05] tracking-tight text-[#0B1D22]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Check your email
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5E7278]">
                Six digits, sent to{" "}
                <span className="font-semibold text-[#0B1D22]">{challenge?.email}</span>.
              </p>

              <div className="mt-10">
                <OtpInput
                  value={code}
                  onChange={(v) => { setCode(v); setError(""); }}
                  onComplete={(v) => verify(v)}
                  disabled={busy || lockedFor > 0}
                  invalid={!!error}
                  autoFocus
                />
              </div>

              {error && <p className="mt-3 text-sm text-[#C4340A]">{error}</p>}
              {!error && notice && <p className="mt-3 text-sm text-[#16794A]">{notice}</p>}

              <button
                onClick={() => verify()}
                disabled={code.length !== 6 || lockedFor > 0 || expired || busy}
                className="mt-6 w-full rounded-lg bg-[#05262E] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0B3945] disabled:bg-[#C6D0D2] disabled:text-[#7C8C90] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05262E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F6F6]"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>

              <div className="mt-5 flex items-center justify-between text-[13px]">
                <button
                  onClick={startOver}
                  className="inline-flex items-center gap-1.5 text-[#5E7278] transition-colors hover:text-[#0B1D22] focus-visible:outline-none focus-visible:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
                </button>
                <button
                  onClick={resend}
                  disabled={resendIn > 0}
                  className="font-semibold text-[#05262E] transition-colors hover:text-[#FF4F17] disabled:text-[#9BAAAE] focus-visible:outline-none focus-visible:underline"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Send a new code"}
                </button>
              </div>

              {/* No mail service is wired up yet, so the code is shown here. */}
              {challenge && (
                <p className="mt-10 rounded-lg border border-dashed border-[#C6D0D2] px-4 py-3 text-[13px] leading-relaxed text-[#5E7278]">
                  Prototype: no email is sent. Your code is{" "}
                  <span className="font-semibold tracking-[0.2em] text-[#0B1D22]">
                    {challenge.code}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
