"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { usePartnersStore } from "@/store/partners";
import type { Customer, CustomerType, CustomerStatus, OnboardingSource } from "@/store/customers";
import { cn } from "@/lib/utils";

export type CustomerFormMode = "add" | "edit" | "onboard";

interface CustomerFormData {
  name: string;
  phone: string;
  nationalId: string;
  email?: string;
  customerType: CustomerType;
  partner: string;
  status: CustomerStatus;
  onboardingSource: OnboardingSource;
  referralCodeUsed?: string;
  region: Customer["region"];
  vehicleId?: string;
}

interface CustomerFormModalProps {
  mode: CustomerFormMode;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => void;
  initialValues?: Partial<Customer>;
  promoPreview?: { points: number; referralBonus: number };
}

const CUSTOMER_STATUSES: { value: CustomerStatus; label: string }[] = [
  { value: "free",       label: "Free" },
  { value: "active",     label: "Active" },
  { value: "inactive",   label: "Inactive" },
  { value: "no_account", label: "No Account" },
  { value: "invalid",    label: "Invalid" },
  { value: "pre_order",  label: "Pre-order" },
  { value: "pre_offer",  label: "Pre-offer" },
  { value: "zeno_paid",  label: "Zeno Paid" },
];

const ONBOARDING_SOURCES: { value: OnboardingSource; label: string }[] = [
  { value: "customer_app",   label: "Customer App" },
  { value: "website",        label: "Website" },
  { value: "onboarding_app", label: "Onboarding / Scanner App" },
  { value: "dashboard",      label: "Operations Dashboard" },
];

const REGIONS: { value: Customer["region"]; label: string }[] = [
  { value: "nbo",      label: "Nairobi (NBO)" },
  { value: "nanyuki",  label: "Nanyuki" },
  { value: "naromoru", label: "Naro Moru" },
  { value: "nyeri",    label: "Nyeri" },
];

const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49]";
const labelClass = "block text-xs font-semibold text-slate-600 mb-1";

export function CustomerFormModal({ mode, open, onClose, onSubmit, initialValues, promoPreview }: CustomerFormModalProps) {
  const partners = usePartnersStore((s) => s.partners);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState<CustomerFormData>({
    name: "",
    phone: "",
    nationalId: "",
    email: "",
    customerType: "partner",
    partner: "",
    status: mode === "onboard" ? "pre_order" : "active",
    onboardingSource: mode === "onboard" ? "dashboard" : "dashboard",
    referralCodeUsed: "",
    region: "nbo",
    vehicleId: "",
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name ?? "",
        phone: initialValues.phone ?? "",
        nationalId: initialValues.nationalId ?? "",
        email: initialValues.email ?? "",
        customerType: initialValues.customerType ?? "partner",
        partner: initialValues.partner ?? "",
        status: initialValues.status ?? "active",
        onboardingSource: initialValues.onboardingSource ?? "dashboard",
        referralCodeUsed: initialValues.referralCodeUsed ?? "",
        region: initialValues.region ?? "nbo",
        vehicleId: initialValues.vehicleId ?? "",
      });
    }
    setStep(1);
  }, [open, initialValues]);

  const set = (k: keyof CustomerFormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const title =
    mode === "add"     ? "Add Customer" :
    mode === "edit"    ? "Edit Customer" :
    "Onboard New Customer";

  const canProceed = form.name.trim() && form.phone.trim() && form.nationalId.trim();

  const handleSubmit = () => {
    const clean = { ...form };
    if (!clean.vehicleId?.trim()) delete clean.vehicleId;
    if (!clean.email?.trim()) delete clean.email;
    if (!clean.referralCodeUsed?.trim()) delete clean.referralCodeUsed;
    onSubmit(clean);
    onClose();
  };

  const activePartners = partners.filter((p) => p.status === "active");

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {mode === "onboard" && (
        <div className="flex gap-1 mb-5">
          {[1, 2].map((s) => (
            <div key={s} className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step >= s ? "bg-[#FF3B06]" : "bg-slate-200"
            )} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {/* Step 1, always shown for add/edit; step 1 for onboard */}
        {(mode !== "onboard" || step === 1) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input className={fieldClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" autoFocus />
              </div>
              <div>
                <label className={labelClass}>Phone Number *</label>
                <input className={fieldClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="254-7XXXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>National ID *</label>
                <input className={fieldClass} value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} placeholder="12345678" />
              </div>
              <div>
                <label className={labelClass}>Email (optional)</label>
                <input className={fieldClass} type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Customer Type *</label>
                <select className={fieldClass} value={form.customerType} onChange={(e) => set("customerType", e.target.value)}>
                  <option value="retail">Retail Customer</option>
                  <option value="partner">Partner Customer</option>
                </select>
              </div>
              {form.customerType === "partner" && (
                <div>
                  <label className={labelClass}>Partner *</label>
                  <select className={fieldClass} value={form.partner} onChange={(e) => set("partner", e.target.value)}>
                    <option value="">Select Partner</option>
                    {activePartners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Region *</label>
                <select className={fieldClass} value={form.region} onChange={(e) => set("region", e.target.value)}>
                  {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {mode !== "onboard" && (
                <div>
                  <label className={labelClass}>Status *</label>
                  <select className={fieldClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                    {CUSTOMER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            {mode !== "onboard" && (
              <div>
                <label className={labelClass}>Vehicle ID (optional)</label>
                <input className={fieldClass} value={form.vehicleId ?? ""} onChange={(e) => set("vehicleId", e.target.value)} placeholder="ME92ZPSFB1J..." />
              </div>
            )}
          </>
        )}

        {/* Step 2, onboarding details (onboard mode step 2, or always for add) */}
        {(mode !== "onboard" || step === 2) && (
          <>
            {mode === "onboard" && (
              <p className="text-xs text-slate-500 -mt-1 mb-1">
                Onboarding details for <strong>{form.name || "this customer"}</strong>.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Onboarding Source *</label>
                <select className={fieldClass} value={form.onboardingSource} onChange={(e) => set("onboardingSource", e.target.value)}>
                  {ONBOARDING_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Referral Code Used (optional)</label>
                <input className={fieldClass} value={form.referralCodeUsed ?? ""} onChange={(e) => set("referralCodeUsed", e.target.value)} placeholder="ZNO-XXXXX" />
              </div>
            </div>
            {mode === "onboard" && (
              <div>
                <label className={labelClass}>Initial Status</label>
                <select className={fieldClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {CUSTOMER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            {promoPreview && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm">
                <p className="font-semibold text-emerald-800 mb-1">Points to be allocated</p>
                <div className="flex gap-6 text-xs text-emerald-700">
                  <span>Promo: <strong>{promoPreview.points.toLocaleString()} pts</strong></span>
                  {promoPreview.referralBonus > 0 && (
                    <span>Referral bonus: <strong>{promoPreview.referralBonus.toLocaleString()} pts</strong></span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        {mode === "onboard" && step === 2 ? (
          <>
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!canProceed}>Onboard Customer</Button>
          </>
        ) : mode === "onboard" && step === 1 ? (
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => setStep(2)} disabled={!canProceed}>Next →</Button>
          </>
        ) : (
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!canProceed}>
              {mode === "add" ? "Add Customer" : "Save Changes"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
