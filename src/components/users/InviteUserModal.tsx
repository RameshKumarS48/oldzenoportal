"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Mail, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PermissionSummary } from "@/components/users/PermissionSummary";
import { useTenantOptions } from "@/lib/tenants";
import { useUsersStore } from "@/store/users";
import type { PendingInvite } from "@/store/users";
import { ROLE_LABELS, INTERNAL_TENANT } from "@/lib/mock/users";
import type { UserRole } from "@/lib/mock/users";

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  invitedBy: string;
  /** Hands the created invite back so the page can show its shareable link. */
  onInvited: (invite: PendingInvite) => void;
}

export function InviteUserModal({ open, onClose, invitedBy, onInvited }: InviteUserModalProps) {
  const createInvite = useUsersStore((s) => s.createInvite);
  const tenants = useTenantOptions();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("partner_user");
  const [partnerId, setPartnerId] = useState(INTERNAL_TENANT);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // Reset whenever the dialog reopens so a previous draft never leaks through.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setEmail("");
    setRole("partner_user");
    setPartnerId(INTERNAL_TENANT);
    setError("");
    setSending(false);
  }, [open]);

  const handleNext = () => {
    if (!name.trim()) return setError("Enter the person's full name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (!partnerId) return setError("Choose a tenant.");
    setError("");
    setStep(2);
  };

  const handleSend = async () => {
    setError("");
    setSending(true);
    try {
      const invite = await createInvite({
        email: email.trim(),
        name: name.trim(),
        role,
        partnerId,
        invitedBy,
      });
      onInvited(invite);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invite.");
      setStep(1);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite User — Step ${step} of 2`}
      className="max-w-lg"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zeno-red/10 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-zeno-red" />
          </div>
          <p className="text-sm text-slate-500">
            {step === 1
              ? "Who are you inviting, and what should they be able to reach?"
              : "Confirm the access this role carries, then send."}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoFocus
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={ROLE_OPTIONS}
              />
              <Select
                label="Tenant"
                value={partnerId}
                onChange={(e) => { setPartnerId(e.target.value); setError(""); }}
                options={tenants.map((t) => ({ value: t.id, label: t.label }))}
              />
            </div>
          </div>
        ) : (
          <PermissionSummary role={role} />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          {step === 1 ? (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleNext}>Next</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button className="flex-1" onClick={handleSend} loading={sending}>
                <Mail className="w-4 h-4" /> Send Invite
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
