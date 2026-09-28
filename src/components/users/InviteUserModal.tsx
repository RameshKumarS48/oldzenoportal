"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { PermissionSummary } from "@/components/users/PermissionSummary";
import { useTenantOptions } from "@/lib/tenants";
import { useUsersStore } from "@/store/users";
import type { PendingInvite } from "@/store/users";
import { ROLE_LABELS } from "@/lib/mock/users";
import type { UserRole } from "@/lib/mock/users";

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The dialog sits on a tinted panel so the fields read as white cut-outs —
   fields are what you act on here, so they get the lighter surface. */
export const DIALOG_PANEL = "bg-[#EDF0F1] max-w-lg";
export const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";
export const LABEL = "block text-sm font-semibold text-slate-800 mb-2";

export function DialogHeading({ icon: Icon, tint, children }: {
  icon: React.ElementType; tint: string; children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-3">
      <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${tint}`}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="text-lg font-semibold text-slate-800">{children}</span>
    </span>
  );
}

export function SelectField({
  label, value, onChange, children, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; placeholder?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`${FIELD} appearance-none pr-10 cursor-pointer ${value ? "" : "text-slate-400"}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  invitedBy: string;
  onInvited: (invite: PendingInvite) => void;
}

export function InviteUserModal({ open, onClose, invitedBy, onInvited }: InviteUserModalProps) {
  const createInvite = useUsersStore((s) => s.createInvite);
  const tenants = useTenantOptions();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("partner_user");
  const [partnerId, setPartnerId] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1); setName(""); setEmail("");
    setRole("partner_user"); setPartnerId(""); setError(""); setSending(false);
  }, [open]);

  const ready = name.trim() !== "" && EMAIL_RE.test(email.trim()) && partnerId !== "";

  const handleNext = () => {
    if (!name.trim()) return setError("Enter their full name.");
    if (!EMAIL_RE.test(email.trim())) return setError("That email address doesn't look right.");
    if (!partnerId) return setError("Choose the tenant they belong to.");
    setError("");
    setStep(2);
  };

  const handleSend = async () => {
    setError("");
    setSending(true);
    try {
      const invite = await createInvite({
        email: email.trim(), name: name.trim(), role, partnerId, invitedBy,
      });
      onInvited(invite);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the invite.");
      setStep(1);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className={DIALOG_PANEL}
      title={
        <DialogHeading icon={UserPlus} tint="bg-[#FBE3DC] text-[#C4340A]">
          Invite User — Step {step} of 2
        </DialogHeading>
      }
    >
      <div className="space-y-5">
        {step === 1 ? (
          <>
            <div>
              <label className={LABEL} htmlFor="invite-name">Full Name</label>
              <input
                id="invite-name"
                className={FIELD}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                autoFocus
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="invite-email">Email Address</label>
              <input
                id="invite-email"
                type="email"
                className={FIELD}
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Role" value={role} onChange={(v) => setRole(v as UserRole)}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </SelectField>
              <SelectField
                label="Tenant"
                value={partnerId}
                onChange={(v) => { setPartnerId(v); setError(""); }}
                placeholder="Select Tenant"
              >
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </SelectField>
            </div>
          </>
        ) : (
          <PermissionSummary role={role} />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-1">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!ready}
              className="rounded-lg bg-[#E0491F] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C4340A] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0491F]/40 focus-visible:ring-offset-2"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              className="rounded-lg bg-[#E0491F] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C4340A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0491F]/40 focus-visible:ring-offset-2"
            >
              {sending ? "Sending…" : "Send Invite"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
