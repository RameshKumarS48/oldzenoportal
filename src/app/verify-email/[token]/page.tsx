"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { verifyEmailToken } from "@/lib/auth-utils";
import { useUsersStore } from "@/store/users";

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const verifyEmail = useUsersStore((s) => s.verifyEmail);

  const [status, setStatus] = useState<"loading" | "success" | "invalid">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    verifyEmailToken(token).then((resolvedEmail) => {
      if (!resolvedEmail) {
        setStatus("invalid");
        return;
      }
      verifyEmail(resolvedEmail);
      setEmail(resolvedEmail);
      setStatus("success");
    });
  }, [token, verifyEmail]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Verification failed</h1>
          <p className="text-sm text-slate-500 mb-6">
            This link is invalid or has expired. Ask an admin to resend your invite.
          </p>
          <button onClick={() => router.push("/login")} className="text-sm text-blue-600 hover:underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 -mt-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Email verified!</h1>
        <p className="text-sm text-slate-500 mb-6">
          <strong>{email}</strong> is now verified. You can sign in to Zeno Dashboard.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
