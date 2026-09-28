"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Mail, Zap } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useOtpStore, CODE_TTL_MS } from "@/store/otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/auth/OtpInput";

type Step = "email" | "code";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(true);
  // Re-renders once a second so the resend cooldown and expiry countdowns move.
  const [, setTick] = useState(0);

  // Someone already signed in has no business on the login page.
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
  const expired = step === "code" && expiresIn === 0;

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const result = requestCode(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setShowHint(true);
    setStep("code");
  };

  const handleVerify = (submitted?: string) => {
    const entered = submitted ?? code;
    setError("");
    setNotice("");

    const result = verifyCode(entered);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLoading(true);
    void loginWithOtp(challenge!.email).then((auth) => {
      setLoading(false);
      if (!auth.success) {
        setError(auth.error ?? "Sign in failed.");
        return;
      }
      clearChallenge();
      router.push("/asset-tracking");
    });
  };

  const handleResend = () => {
    setError("");
    const result = resendCode();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setShowHint(true);
    setNotice("A new code has been sent.");
  };

  const handleChangeEmail = () => {
    clearChallenge();
    setStep("email");
    setCode("");
    setError("");
    setNotice("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-200">
            {step === "email"
              ? <Zap className="w-6 h-6 text-white" />
              : <Mail className="w-6 h-6 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Zeno</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            {step === "email"
              ? "Sign in with your email address"
              : <>Enter the 6-digit code sent to<br /><strong className="text-slate-700">{challenge?.email}</strong></>}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@zeno.earth"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Send code
              </Button>
              <p className="text-xs text-center text-slate-400">
                We&apos;ll email you a one-time code. No password needed.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <OtpInput
                value={code}
                onChange={(v) => { setCode(v); setError(""); }}
                onComplete={(v) => handleVerify(v)}
                disabled={loading || lockedFor > 0}
                invalid={!!error}
                autoFocus
              />

              {error && <p className="text-sm text-red-500">{error}</p>}
              {!error && notice && <p className="text-sm text-emerald-600">{notice}</p>}
              {!error && !notice && (
                <p className="text-xs text-slate-400 text-center">
                  {expired
                    ? "Code expired — request a new one."
                    : `Code expires in ${formatCountdown(expiresIn)}`}
                </p>
              )}

              <Button
                className="w-full"
                loading={loading}
                disabled={code.length !== 6 || lockedFor > 0 || expired}
                onClick={() => handleVerify()}
              >
                Verify and sign in
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendIn > 0}
                  className="text-xs font-medium text-zeno-teal hover:text-zeno-teal-hover disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* No mail service is wired up, so the code is surfaced here instead. */}
        {step === "code" && showHint && challenge && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Prototype</span> — no email is sent. Your code is{" "}
              <span className="font-mono font-bold tracking-widest">{challenge.code}</span>, valid
              for {Math.round(CODE_TTL_MS / 60_000)} minutes.
            </div>
            <button
              onClick={() => setShowHint(false)}
              className="text-amber-400 hover:text-amber-600 text-xs font-medium shrink-0"
            >
              Hide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
