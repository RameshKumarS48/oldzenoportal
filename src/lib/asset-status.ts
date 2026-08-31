/**
 * Operational status — the single source of truth.
 *
 * In a fleet-ops tool the status colour *is* the information, so every place a
 * status appears (table cell, detail panel, map pin, export) reads its hue and
 * label from here. Colours reference the `--color-status-*` tokens in
 * globals.css via Tailwind `bg-status-*` utilities.
 */

export type Connectivity = "Online" | "Offline" | "GpsOffline" | "CloudOffline";
export type Immobilization =
  | "On"
  | "Off"
  | "ImmobilizedRequestSent"
  | "MobilizedRequestSent"
  | "ImmobilizedRequestAck"
  | "MobilizedRequestAck";
export type VehicleStatus = "active" | "new" | "test" | "used";

/** dot colour utility + human label for each connectivity state */
export const CONNECTIVITY_META: Record<Connectivity, { dot: string; label: string }> = {
  Online:       { dot: "bg-status-online",  label: "Online" },
  Offline:      { dot: "bg-status-offline", label: "Offline" },
  GpsOffline:   { dot: "bg-status-gps",     label: "GPS offline" },
  CloudOffline: { dot: "bg-status-cloud",   label: "Cloud offline" },
};

/** Immobilization is binary at a glance (healthy vs. alert) but carries a
 *  precise sub-state; short labels keep the table dense. */
export const IMMOBILIZATION_META: Record<Immobilization, { dot: string; label: string; alert: boolean }> = {
  Off:                    { dot: "bg-status-online",  label: "Off",         alert: false },
  On:                     { dot: "bg-status-offline", label: "On",          alert: true },
  ImmobilizedRequestSent: { dot: "bg-status-gps",     label: "Req sent",    alert: true },
  MobilizedRequestSent:   { dot: "bg-status-gps",     label: "Mob req",     alert: false },
  ImmobilizedRequestAck:  { dot: "bg-status-offline", label: "Ack",         alert: true },
  MobilizedRequestAck:    { dot: "bg-status-online",  label: "Mob ack",     alert: false },
};

/** Vehicle lifecycle pill — soft tint, not a dot. */
export const VEHICLE_STATUS_META: Record<VehicleStatus, string> = {
  active: "bg-green-50 text-green-700",
  new:    "bg-blue-50 text-blue-700",
  test:   "bg-yellow-50 text-yellow-700",
  used:   "bg-slate-100 text-slate-600",
};
