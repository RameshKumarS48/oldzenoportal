"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { verifyInviteToken } from "@/lib/auth-utils";
import type { InvitePayload } from "@/lib/auth-utils";
import { useUsersStore } from "@/store/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/mock/users";
import type { UserRole } from "@/lib/mock/users";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const registerFromInvite = useUsersStore((s) => s.registerFromInvite);
  const invites = useUsersStore((s) => s.invites);

  const [invite, setInvite] = useState<InvitePayload | null | "loading" | "invalid">("loading");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    verifyInviteToken(token).then((payload) => setInvite(payload ?? "invalid"));
  }, [token]);

  // Prefill the name whoever sent the invite already typed.
  useEffect(() => {
    if (!invite || invite === "loading" || invite === "invalid") return;
    const pending = invites.find((i) => i.email.toLowerCase() === invite.email.toLowerCase());
    if (pending?.name) setName(pending.name);
  }, [invite, invites]);

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

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Account created</h1>
          <p className="text-sm text-slate-500 mb-6">
            <strong>{invite.email}</strong> is ready. Sign in with a one-time code — no password
            to remember.
          </p>
          <Button onClick={() => router.push("/login")}>Go to sign in</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    const result = await registerFromInvite(invite.email, invite.role, name);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join Zeno</h1>
          <p className="text-sm text-slate-500 mt-1">
            Invited by <strong>{invite.invitedBy}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mb-5">
            <p className="text-xs text-slate-500">Signing up as</p>
            <p className="text-sm font-semibold text-slate-800">{invite.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Role: {ROLE_LABELS[invite.role as UserRole] ?? invite.role}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your full name"
              type="text"
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              required
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Create Account
            </Button>
            <p className="text-xs text-center text-slate-400">
              You&apos;ll sign in with a one-time code sent to your email.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
