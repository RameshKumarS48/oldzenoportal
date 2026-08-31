"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  useScannerProvisioningStore,
  ACTION_TYPES,
  ACTION_LABELS,
  SYNC_STATUSES,
  SYNC_LABELS,
  type ScannerAction,
  type ScannerActionType,
  type BikeState,
  type SyncStatus,
} from "@/store/scanner-provisioning";

const STORE_CODES = [
  "ke-nbo-zhq", "ke-nbo-grw-hq", "ke-nbo-mkp", "ke-nbo-mbsa-wtu",
  "ke-jgo-mkp", "ke-nrm-zgs", "ke-nyk-zhq", "ke-nyr-ctr-zhb", "ke-tmu-zgs",
];
const TENANTS = [
  "", "fleet/greenwheels", "fleet/mkopa",
  "retail/4g", "retail/cash", "retail/fortune", "retail/safari_customer",
  "retail/tireproz", "retail/tugende", "retail/watu", "retail/zeno_captive",
  "zeno-internal/demo_bikes", "zeno-internal/pd_bikes", "zeno-internal/test_bike",
];
const BIKE_STATES: BikeState[] = ["new", "active", "used", "test"];

// Which action types capture a customer vs. a bike, and whether RFID applies.
const NEEDS_CUSTOMER: ScannerActionType[] = ["customer_onboard", "bike_assign", "rfid_assign", "handover", "deactivate"];
const NEEDS_RFID: ScannerActionType[] = ["rfid_assign"];
const CUSTOMER_ONLY: ScannerActionType[] = ["customer_onboard"];
// Which action types capture the bike component scan (Field Scanner: Chassis, VCU, EVCC, Motor, Registration).
const NEEDS_COMPONENTS: ScannerActionType[] = ["bring_up"];
// Signature is captured on handover (customer sign-off).
const NEEDS_SIGNATURE: ScannerActionType[] = ["handover"];

type FormState = Omit<ScannerAction, "id" | "linkedVin" | "source">;

function nowLabel(): string {
  // Deterministic-friendly default; user edits before submit.
  return "01 Sep 2026 12:00";
}

function formFromEditing(editing: ScannerAction | null): FormState {
  if (!editing) return emptyForm();
  const { id: _id, linkedVin: _l, source: _s, ...rest } = editing;
  void _id;
  void _l;
  void _s;
  return rest;
}

function emptyForm(): FormState {
  return {
    timestamp: nowLabel(),
    actionType: "bring_up",
    vin: "",
    customerName: "",
    customerPhone: "",
    rfidTag: "",
    storeCode: "ke-nbo-zhq",
    tenant: "",
    bikeState: "new",
    performedBy: "",
    credentialType: "Zeno",
    otpVerified: false,
    notes: "",
    chassisId: "",
    vcuImei: "",
    vcuIccid: "",
    evccId: "",
    motorId: "",
    registrationNo: "",
    drivingLicense: "",
    signatureCaptured: false,
    syncStatus: "synced",
  };
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-slate-100 border-0 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zeno-teal/30";
const labelCls = "block text-xs text-slate-500 mb-1.5";

export function ActionFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: ScannerAction | null;
}) {
  const addAction = useScannerProvisioningStore((s) => s.addAction);
  const updateAction = useScannerProvisioningStore((s) => s.updateAction);
  const customerForVin = useScannerProvisioningStore((s) => s.customerForVin);
  const bikeForPhone = useScannerProvisioningStore((s) => s.bikeForPhone);

  const [form, setForm] = useState<FormState>(() => formFromEditing(editing));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const needsCustomer = NEEDS_CUSTOMER.includes(form.actionType);
  const needsRfid = NEEDS_RFID.includes(form.actionType);
  const customerOnly = CUSTOMER_ONLY.includes(form.actionType);
  const needsComponents = NEEDS_COMPONENTS.includes(form.actionType);
  const needsSignature = NEEDS_SIGNATURE.includes(form.actionType);

  // Prefill customer from a known VIN when it changes.
  function handleVinBlur() {
    if (!form.vin || form.customerPhone) return;
    const c = customerForVin(form.vin);
    if (c) setForm((f) => ({ ...f, customerName: c.customerName, customerPhone: c.customerPhone }));
  }

  // Prefill VIN from a known phone (for customer-only rows that later link).
  function handlePhoneBlur() {
    if (customerOnly || form.vin || !form.customerPhone) return;
    const vin = bikeForPhone(form.customerPhone);
    if (vin) setForm((f) => ({ ...f, vin }));
  }

  function handleSubmit() {
    setError(null);

    // Validation
    if (!customerOnly && !form.vin.trim()) {
      setError("VIN is required for this action.");
      return;
    }
    if (customerOnly && !form.customerPhone.trim()) {
      setError("Customer phone is required for customer onboarding.");
      return;
    }
    if (needsCustomer && !customerOnly && !form.customerPhone.trim()) {
      setError("Customer phone is required for this action.");
      return;
    }
    if (needsRfid && !form.rfidTag.trim()) {
      setError("RFID tag UID is required for an RFID assignment.");
      return;
    }
    if (!form.performedBy.trim()) {
      setError("Performed By is required.");
      return;
    }

    const payload: FormState = {
      ...form,
      vin: form.vin.trim(),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      rfidTag: needsRfid ? form.rfidTag.trim() : "",
      performedBy: form.performedBy.trim(),
    };

    const result = editing
      ? updateAction(editing.id, payload)
      : addAction(payload);

    if (!result.ok) {
      setError(result.error ?? "Could not save the entry.");
      return;
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Scanner Entry" : "Add Scanner Entry"}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Action Type</label>
            <select
              value={form.actionType}
              onChange={(e) => set("actionType", e.target.value as ScannerActionType)}
              className={inputCls}
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>{ACTION_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Timestamp</label>
            <input
              type="text"
              placeholder="01 Sep 2026 12:00"
              value={form.timestamp}
              onChange={(e) => set("timestamp", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              VIN {customerOnly && <span className="text-slate-400">(optional)</span>}
            </label>
            <input
              type="text"
              placeholder="ME92ZPS..."
              value={form.vin}
              onChange={(e) => set("vin", e.target.value)}
              onBlur={handleVinBlur}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className={labelCls}>Bike State</label>
            <select
              value={form.bikeState}
              onChange={(e) => set("bikeState", e.target.value as BikeState)}
              className={inputCls}
            >
              {BIKE_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {needsComponents && (
          <div className="rounded-lg border border-slate-200 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-500">
              Field Scanner — component scan
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Chassis</label>
                <input
                  type="text"
                  placeholder="Chassis / frame no."
                  value={form.chassisId}
                  onChange={(e) => set("chassisId", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>Registration</label>
                <input
                  type="text"
                  placeholder="KDA 000A"
                  value={form.registrationNo}
                  onChange={(e) => set("registrationNo", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>VCU · IMEI</label>
                <input
                  type="text"
                  placeholder="15-digit IMEI"
                  value={form.vcuImei}
                  onChange={(e) => set("vcuImei", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>VCU · ICCID</label>
                <input
                  type="text"
                  placeholder="SIM ICCID"
                  value={form.vcuIccid}
                  onChange={(e) => set("vcuIccid", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>EVCC</label>
                <input
                  type="text"
                  placeholder="EVCC UID"
                  value={form.evccId}
                  onChange={(e) => set("evccId", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>Motor</label>
                <input
                  type="text"
                  placeholder="Motor UID"
                  value={form.motorId}
                  onChange={(e) => set("motorId", e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
          </div>
        )}

        {needsCustomer && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Customer Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Customer Phone</label>
                <input
                  type="text"
                  placeholder="254-7..."
                  value={form.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value)}
                  onBlur={handlePhoneBlur}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Driving License</label>
              <input
                type="text"
                placeholder="DL number"
                value={form.drivingLicense}
                onChange={(e) => set("drivingLicense", e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
          </>
        )}

        {needsRfid && (
          <div>
            <label className={labelCls}>RFID Tag UID</label>
            <input
              type="text"
              placeholder="04A2B7C9D1"
              value={form.rfidTag}
              onChange={(e) => set("rfidTag", e.target.value)}
              className={`${inputCls} font-mono`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              One RFID per VIN. To reassign, deactivate first or add &quot;override&quot; in notes.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Store Code</label>
            <select
              value={form.storeCode}
              onChange={(e) => set("storeCode", e.target.value)}
              className={inputCls}
            >
              {STORE_CODES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tenant</label>
            <select
              value={form.tenant}
              onChange={(e) => set("tenant", e.target.value)}
              className={inputCls}
            >
              {TENANTS.map((t) => (
                <option key={t || "none"} value={t}>{t || "— none —"}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Performed By</label>
            <input
              type="text"
              placeholder="Staff name"
              value={form.performedBy}
              onChange={(e) => set("performedBy", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Credential</label>
            <select
              value={form.credentialType}
              onChange={(e) => set("credentialType", e.target.value as "Zeno" | "Partner")}
              className={inputCls}
            >
              <option value="Zeno">Zeno</option>
              <option value="Partner">Partner</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 justify-center">
            <div className="flex items-center gap-2">
              <input
                id="otp-verified"
                type="checkbox"
                checked={form.otpVerified}
                onChange={(e) => set("otpVerified", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-zeno-red focus:ring-zeno-teal/30"
              />
              <label htmlFor="otp-verified" className="text-sm text-slate-600">
                OTP verified
              </label>
            </div>
            {needsSignature && (
              <div className="flex items-center gap-2">
                <input
                  id="signature-captured"
                  type="checkbox"
                  checked={form.signatureCaptured}
                  onChange={(e) => set("signatureCaptured", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-zeno-red focus:ring-zeno-teal/30"
                />
                <label htmlFor="signature-captured" className="text-sm text-slate-600">
                  Signature captured
                </label>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Sync Status</label>
            <select
              value={form.syncStatus}
              onChange={(e) => set("syncStatus", e.target.value as SyncStatus)}
              className={inputCls}
            >
              {SYNC_STATUSES.map((s) => (
                <option key={s} value={s}>{SYNC_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            rows={2}
            placeholder="Optional notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputCls}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg bg-zeno-teal text-white text-sm font-semibold hover:bg-zeno-teal-hover transition-colors"
          >
            {editing ? "Save Changes" : "Add Entry"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
