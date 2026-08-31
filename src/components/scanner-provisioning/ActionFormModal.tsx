"use client";

import { useState } from "react";
import { AlertTriangle, UserPlus, Bike, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  useScannerProvisioningStore,
  SYNC_STATUSES,
  SYNC_LABELS,
  RFID_STATUSES,
  RFID_LABELS,
  type ScannerAction,
  type ScannerActionType,
  type BikeState,
  type SyncStatus,
  type RfidStatus,
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

// Human titles per action; the two Add-Entry options are customer_onboard + bring_up.
const TITLES: Record<ScannerActionType, string> = {
  bring_up: "Bike Bring Up",
  customer_onboard: "Customer Onboarding",
  tenant_assign: "Tenant Assign",
  dispatch: "Dispatch",
  bike_assign: "Bike Assignment",
  rfid_assign: "RFID Assignment",
  handover: "Handover",
  deactivate: "Deactivate",
};

// Which action types capture which sections.
const NEEDS_CUSTOMER: ScannerActionType[] = ["customer_onboard", "bike_assign", "rfid_assign", "handover", "deactivate"];
const NEEDS_COMPONENTS: ScannerActionType[] = ["bring_up"];
const NEEDS_SIGNATURE: ScannerActionType[] = ["handover"];
const CUSTOMER_ONLY: ScannerActionType[] = ["customer_onboard"];

type FormState = Omit<ScannerAction, "id" | "linkedVin" | "source">;

function nowLabel(): string {
  // Deterministic-friendly default; user edits before submit.
  return "01 Sep 2026 12:00";
}

// Resulting bike state is derived from the action — no longer a manual field.
function deriveBikeState(t: ScannerActionType): BikeState {
  switch (t) {
    case "bike_assign":
    case "rfid_assign":
    case "handover":
      return "active";
    case "deactivate":
      return "used";
    default:
      return "new";
  }
}

function formFromEditing(editing: ScannerAction | null): FormState {
  if (!editing) return emptyForm("bring_up");
  const { id: _id, linkedVin: _l, source: _s, ...rest } = editing;
  void _id;
  void _l;
  void _s;
  return rest;
}

function emptyForm(actionType: ScannerActionType): FormState {
  return {
    timestamp: nowLabel(),
    actionType,
    vin: "",
    customerName: "",
    customerPhone: "",
    rfidTag: "",
    rfidStatus: "unassigned",
    storeCode: "ke-nbo-zhq",
    tenant: "",
    bikeState: deriveBikeState(actionType),
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

  // When adding, first pick one of the two options; editing skips straight to the form.
  const [mode, setMode] = useState<ScannerActionType | null>(() => (editing ? editing.actionType : null));
  const [form, setForm] = useState<FormState>(() => formFromEditing(editing));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function chooseMode(actionType: ScannerActionType) {
    setError(null);
    setMode(actionType);
    setForm(emptyForm(actionType));
  }

  function backToChooser() {
    setError(null);
    setMode(null);
  }

  const actionType = form.actionType;
  const needsCustomer = NEEDS_CUSTOMER.includes(actionType);
  const customerOnly = CUSTOMER_ONLY.includes(actionType);
  const needsComponents = NEEDS_COMPONENTS.includes(actionType);
  const needsSignature = NEEDS_SIGNATURE.includes(actionType);
  const isRfid = actionType === "rfid_assign";
  const isBikeAssign = actionType === "bike_assign";

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
    if (isBikeAssign) {
      // Per the Onboarding spec: bike assignment needs customer name, phone, and OTP.
      if (!form.customerName.trim()) return setError("Customer name is required for bike assignment.");
      if (!form.customerPhone.trim()) return setError("Customer phone is required for bike assignment.");
      if (!form.otpVerified) return setError("OTP verification is required for bike assignment.");
    } else if (needsCustomer && !customerOnly && !form.customerPhone.trim()) {
      setError("Customer phone is required for this action.");
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
      performedBy: form.performedBy.trim(),
      bikeState: deriveBikeState(actionType),
    };

    const result = editing ? updateAction(editing.id, payload) : addAction(payload);

    if (!result.ok) {
      setError(result.error ?? "Could not save the entry.");
      return;
    }
    onClose();
  }

  const title = editing
    ? `Edit · ${TITLES[actionType]}`
    : mode
    ? TITLES[mode]
    : "Add Entry";

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-2xl">
      {/* Step 1 — choose what to add (mirrors the scanner app's two-option dashboard). */}
      {!editing && mode === null ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">What would you like to record?</p>
          <button
            onClick={() => chooseMode("customer_onboard")}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-xl border border-slate-200 hover:border-zeno-teal/50 hover:bg-zeno-teal/5 transition-colors text-left"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-zeno-teal/10 text-zeno-teal shrink-0">
              <UserPlus className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold text-slate-800">Customer Onboarding</span>
              <span className="block text-xs text-slate-400 mt-0.5">Register a customer by phone number</span>
            </span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
          <button
            onClick={() => chooseMode("bring_up")}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-xl border border-slate-200 hover:border-zeno-teal/50 hover:bg-zeno-teal/5 transition-colors text-left"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-zeno-teal/10 text-zeno-teal shrink-0">
              <Bike className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold text-slate-800">Bike Bring Up</span>
              <span className="block text-xs text-slate-400 mt-0.5">Scan a bike into inventory (5-component scan)</span>
            </span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!editing && (
            <button
              onClick={backToChooser}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Choose a different action
            </button>
          )}

          {/* Timestamp + (VIN when a bike is involved) */}
          <div className="grid grid-cols-2 gap-4">
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
            {!customerOnly && (
              <div>
                <label className={labelCls}>VIN</label>
                <input
                  type="text"
                  placeholder="ME92ZPS..."
                  value={form.vin}
                  onChange={(e) => set("vin", e.target.value)}
                  onBlur={handleVinBlur}
                  className={`${inputCls} font-mono`}
                />
              </div>
            )}
          </div>

          {needsComponents && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500">Field Scanner — component scan</p>
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
                  <label className={labelCls}>
                    Customer Name {isBikeAssign && <span className="text-zeno-red">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Customer Phone {(isBikeAssign || customerOnly) && <span className="text-zeno-red">*</span>}
                  </label>
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

          {isRfid && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>RFID Status</label>
                <select
                  value={form.rfidStatus}
                  onChange={(e) => set("rfidStatus", e.target.value as RfidStatus)}
                  className={inputCls}
                >
                  {RFID_STATUSES.map((s) => (
                    <option key={s} value={s}>{s === "unassigned" ? "Unassigned" : RFID_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              {form.rfidStatus !== "unassigned" && (
                <div>
                  <label className={labelCls}>RFID Tag UID</label>
                  <input
                    type="text"
                    placeholder="04A2B7C9D1"
                    value={form.rfidTag}
                    onChange={(e) => set("rfidTag", e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              )}
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
              {needsCustomer && (
                <div className="flex items-center gap-2">
                  <input
                    id="otp-verified"
                    type="checkbox"
                    checked={form.otpVerified}
                    onChange={(e) => set("otpVerified", e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-zeno-red focus:ring-zeno-teal/30"
                  />
                  <label htmlFor="otp-verified" className="text-sm text-slate-600">
                    OTP verified {isBikeAssign && <span className="text-zeno-red">*</span>}
                  </label>
                </div>
              )}
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
      )}
    </Modal>
  );
}
