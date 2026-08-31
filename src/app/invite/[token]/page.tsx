"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, AlertCircle, Loader2, Mail, Copy, Check } from "lucide-react";
import { verifyInviteToken, createVerificationToken } from "@/lib/auth-utils";
import type { InvitePayload } from "@/lib/auth-utils";
import { useUsersStore } from "@/store/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const registerFromInvite = useUsersStore((s) => s.registerFromInvite);

  const [invite, setInvite] = useState<InvitePayload | null | "loading" | "invalid">("loading");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  useEffect(() => {
    verifyInviteToken(token).then((payload) => setInvite(payload ?? "invalid"));
  }, [token]);

  if (invite === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (invite === "invalid" || invite === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Invalid invite link</h1>
          <p className="text-sm text-slate-500 mb-6">
            This link is invalid, has expired, or has already been used.
          </p>
          <button onClick={() => router.push("/login")} className="text-sm text-blue-600 hover:underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // After signup — show verification link
  if (verifyUrl) {
    const mailtoBody = `Hi,\n\nPlease verify your email to activate your Zeno Dashboard account:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-200">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Verify your email</h1>
            <p className="text-sm text-slate-500 mt-1 text-center">
              Account created for <strong>{registeredEmail}</strong>.
              <br />One more step — verify your email to activate it.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <p className="text-xs text-slate-500">
              Copy the verification link below and open it in your browser, or use the email button to send it to yourself.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
              <p className="text-xs text-slate-600 font-mono flex-1 break-all leading-relaxed">{verifyUrl}</p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(verifyUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {copied && <p className="text-xs text-green-600 text-center">Link copied!</p>}

            <a
              href={`mailto:${registeredEmail}?subject=${encodeURIComponent("Verify your Zeno Dashboard email")}&body=${encodeURIComponent(mailtoBody)}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-4 h-4" /> Send to {registeredEmail}
            </a>

            <p className="text-xs text-slate-400 text-center">This link expires in 24 hours.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    const result = await registerFromInvite(invite.email, invite.role, name, password);

    if (!result.success) {
      setLoading(false);
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    // Generate verification token and show link
    const vToken = await createVerificationToken(invite.email);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setRegisteredEmail(invite.email);
    setVerifyUrl(`${origin}/verify-email/${vToken}`);
    setLoading(false);

    // TODO: Replace the above with a real email send when Resend is configured:
    // await fetch("/api/send-verification", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email: invite.email, verifyUrl: `${origin}/verify-email/${vToken}` }),
    // });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join Zeno Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Invited by <strong>{invite.invitedBy}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mb-5">
            <p className="text-xs text-slate-500">Signing up as</p>
            <p className="text-sm font-semibold text-slate-800">{invite.email}</p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">Role: {invite.role}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Your full name" type="text" placeholder="e.g. Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            <Input label="Create a password" type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Input label="Confirm password" type="password" placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
