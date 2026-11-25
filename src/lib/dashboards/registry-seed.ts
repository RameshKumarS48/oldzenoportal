/**
 * The data registry, as the backend will publish it: every kind of record,
 * its fields, and what it links to. The prototype ships this sample; nothing
 * in the UI lists records by hand, so a record type added here (or by the
 * backend) shows up in the picker with no other change.
 */
import type { AccessModule } from "@/lib/access";
import type { Field, Link, NamedMetric, RecordType, Registry } from "./types";

const REGIONS = ["Nairobi", "Nyeri", "Nanyuki", "Mombasa", "Kisumu", "Nakuru", "Kampala"];
const COUNTRIES = ["Kenya", "Uganda", "India"];
const PARTNERS = ["Watu", "Greenwheels", "M-KOPA", "4G Capital", "Fortune", "Zeno Finance", "Cash"];
const ZONES = ["1A", "1B", "2A", "2B", "3A", "3B"];
const STATIONS = [
  "BS0012 Mavuno Garage", "BS0031 Westlands Hub", "BS0043 Ngong Road", "BS0007 Kasarani Hub", "BS0019 Thika Road Mall",
  "BS0025 Upper Hill", "BS0038 Nyeri Town", "BS0044 Nanyuki Central", "BS0051 Nyali", "BS0058 Kisumu CBD",
  "BS0063 Nakuru West", "BS0070 Kampala Central", "BS0074 Rongai", "BS0081 Embakasi",
];
/** Towns with coordinates, for place fields and the map view. */
export const PLACES: Record<string, [number, number]> = {
  Nairobi: [-1.286, 36.817], Nyeri: [-0.42, 36.947], Nanyuki: [0.006, 37.074], Mombasa: [-4.043, 39.668], Kisumu: [-0.091, 34.768],
  Nakuru: [-0.303, 36.08], Eldoret: [0.514, 35.27], Thika: [-1.033, 37.069], Machakos: [-1.517, 37.263], Kampala: [0.347, 32.582],
};
const TOWNS = Object.keys(PLACES);

const num = (id: string, name: string, unit: string, mean: number): Field => ({ id, name, type: "number", unit, mean });
const cat = (id: string, name: string, values: string[]): Field => ({ id, name, type: "category", values });
const date = (id: string, name: string): Field => ({ id, name, type: "date" });
const ident = (id: string, name: string, uniqueRatio: number): Field => ({ id, name, type: "id", uniqueRatio });
const place = (id: string, name: string): Field => ({ id, name, type: "place", values: TOWNS });
const region = cat("region", "Region", REGIONS);
const country = cat("country", "Country", COUNTRIES);

const L = { station: { to: "stations", name: "Station" }, customer: { to: "customers", name: "Customer" }, vehicle: { to: "vehicles", name: "Vehicle" },
  battery: { to: "batteries", name: "Battery" }, charger: { to: "fast_chargers", name: "Charger" }, site: { to: "sites", name: "Site" } } satisfies Record<string, Link>;

const rec = (
  id: string, name: string, singular: string, kind: RecordType["kind"], module: AccessModule, volume: number,
  fields: Field[], links: Link[] = [], page?: string,
): RecordType => ({ id, name, singular, kind, module, volume, fields, links, page, defaultTimeField: fields.find((f) => f.type === "date")!.id });

const RECORDS: RecordType[] = [
  rec("swaps", "Swaps", "swap", "event", "swap_info", 5200, [
    date("occurredAt", "Time of swap"), num("kwh", "kWh billed", "kWh", 1.9), num("points", "Points charged", "pts", 46), num("duration", "Swap duration", "s", 95),
    cat("status", "Status", ["Completed", "Cross-station", "RFID mismatch", "Skipped", "Recovered", "Flagged"]),
    ident("customerId", "Customers", 0.42), ident("vehicleId", "Vehicles", 0.4), ident("batteryId", "Batteries", 0.7),
  ], [L.station, L.customer, L.vehicle], "/swap-transactions"),
  rec("swap_charges", "Swap charges", "swap charge", "event", "pricing", 5200, [
    date("chargedAt", "Time charged"), num("amount", "Amount", "KES", 210), num("slab1", "Slab 1 energy", "kWh", 1.2), num("slab2", "Slab 2 energy", "kWh", 0.7),
    cat("rateSlot", "Rate", ["Standard", "Custom window"]), cat("plan", "Pricing plan", ["Default", "Nairobi CBD", "Upcountry Saver", "Night Rider Promo", "Commuter Hours Pilot"]),
  ], [L.station, L.customer], "/swap-station-pricing"),
  rec("swap_sessions", "Swap audit sessions", "audit session", "event", "swap_info", 5200, [
    date("startedAt", "Session start"), num("length", "Session length", "s", 140), num("steps", "Steps", "", 9),
    cat("verdict", "Verdict", ["Compliant", "Non-compliant"]), cat("scenario", "Scenario", ["Normal swap", "Double deposit", "Timeout", "Door forced", "RFID retry"]),
  ], [L.station], "/swap-audit"),
  rec("tampering_alerts", "Tampering alerts", "tampering alert", "event", "swap_info", 14, [
    date("detectedAt", "Detected"), num("penalty", "Penalty", "KES", 500), num("offences", "Offence count", "", 1.6),
    cat("violation", "Violation", ["Battery not returned", "Wrong battery", "Door forced", "Cable cut", "Double bill"]), cat("status", "Status", ["Open", "Reviewed", "Penalised", "Dismissed"]),
  ], [L.station, L.customer]),
  rec("support_tickets", "Support tickets", "support ticket", "event", "swap_info", 85, [
    date("openedAt", "Opened"), num("resolutionHours", "Time to resolve", "h", 6),
    cat("topic", "Topic", ["Swap failed", "Wallet", "Battery range", "App", "Station closed", "Other"]), cat("status", "Status", ["Open", "Waiting", "Resolved"]), cat("channel", "Channel", ["Call", "WhatsApp", "App", "Walk-in"]),
  ], [L.customer, L.station]),
  rec("wallet_transactions", "Wallet transactions", "wallet transaction", "event", "wallet_info", 9800, [
    date("occurredAt", "Time"), num("amount", "Amount", "KES", 320), num("balanceAfter", "Balance after", "KES", 410),
    cat("direction", "Direction", ["Credit", "Debit"]), cat("category", "Category", ["Recharge", "Swap", "Fast charge", "Home charge", "Promo points", "Referral bonus", "Referee bonus", "Exit refund"]),
    cat("status", "Status", ["Completed", "Pending", "Failed", "Reversed"]), ident("customerId", "Customers", 0.35),
  ], [L.customer], "/wallet-transactions"),
  rec("recharges", "Recharges", "recharge", "event", "wallet_info", 3100, [
    date("requestedAt", "Requested"), num("amount", "Amount", "KES", 350),
    cat("status", "Status", ["Success", "Pending", "Failed"]), cat("channel", "Channel", ["M-Pesa", "Card", "Bank"]), ident("customerId", "Customers", 0.6),
  ], [L.customer], "/wallet-transactions"),
  rec("refunds", "Refunds", "refund", "event", "wallet_info", 40, [
    date("issuedAt", "Issued"), num("amount", "Amount", "KES", 640), cat("reason", "Reason", ["Exit", "Double charge", "Failed swap", "Goodwill"]), cat("status", "Status", ["Paid", "Pending", "Rejected"]),
  ], [L.customer]),
  rec("referrals", "Referrals", "referral", "event", "wallet_info", 60, [
    date("createdAt", "Referred"), num("bonus", "Bonus paid", "KES", 300), cat("status", "Status", ["Entered", "Awarded", "Expired"]),
  ], [L.customer]),
  rec("app_events", "App events", "app event", "event", "wallet_info", 210000, [
    date("at", "Time"), cat("event", "Event", ["App open", "Station search", "Swap started", "Top-up started", "Top-up completed", "Referral shared", "Support opened"]),
    cat("platform", "Platform", ["Android", "iOS"]), ident("customerId", "Customers", 0.08),
  ], [L.customer]),
  rec("customers", "Customers", "customer", "thing", "wallet_info", 48000, [
    date("joinedAt", "Joined"), num("balance", "Wallet balance", "KES", 380),
    cat("type", "Type", ["BaaS", "Non-BaaS"]), cat("status", "Status", ["Active", "Dormant", "Suspended", "Churned", "Pending KYC"]), cat("partner", "Partner", PARTNERS), region, country,
  ]),
  rec("vehicles", "Vehicles", "vehicle", "thing", "vehicle", 21500, [
    date("dateOfSale", "Date of sale"), date("lastConnected", "Last connected"), num("odometer", "Odometer", "km", 14200), num("soc", "State of charge", "%", 62),
    cat("status", "Status", ["Active", "New", "Test", "Used"]), cat("connectivity", "Connectivity", ["Online", "Offline", "GPS only", "Cloud only"]),
    cat("immobilisation", "Immobilisation", ["None", "Requested", "Immobilised", "Release requested"]), cat("model", "Model", ["Emara", "Emara Cargo", "Emara Lite"]),
    cat("tenant", "Tenant", PARTNERS), cat("firmware", "VCU firmware", ["v4.2.1", "v4.1.0", "v4.0.3", "v3.9.8"]), region, country, place("location", "Location"),
  ], [], "/vehicle-tracking"),
  rec("vehicle_trips", "Vehicle trips", "trip", "event", "vehicle", 64000, [
    date("startedAt", "Trip start"), num("distance", "Distance", "km", 7.4), num("duration", "Duration", "min", 21), num("energy", "Energy used", "kWh", 0.31), ident("vehicleId", "Vehicles", 0.25),
  ], [L.vehicle]),
  rec("vehicle_faults", "Vehicle faults", "fault", "event", "vehicle", 310, [
    date("raisedAt", "Raised"), cat("severity", "Severity", ["Low", "Medium", "High", "Critical"]), cat("system", "System", ["Motor", "Controller", "BMS link", "Brakes", "Display", "Telematics"]), cat("status", "Status", ["Open", "Cleared"]),
  ], [L.vehicle]),
  rec("immobilisations", "Immobilisations", "immobilisation", "event", "vehicle", 45, [
    date("requestedAt", "Requested"), cat("reason", "Reason", ["Missed payment", "Theft", "Test", "Other"]), cat("outcome", "Outcome", ["Immobilised", "Failed", "Cancelled", "Released"]),
  ], [L.vehicle]),
  rec("service_jobs", "Service jobs", "service job", "event", "vehicle", 120, [
    date("openedAt", "Opened"), num("cost", "Cost", "KES", 1800), num("hours", "Hours in workshop", "h", 3.2),
    cat("type", "Type", ["Scheduled", "Repair", "Accident", "Recall"]), cat("status", "Status", ["Open", "Waiting for parts", "Done"]),
  ], [L.vehicle]),
  rec("deliveries", "Vehicle deliveries", "delivery", "event", "vehicle", 55, [
    date("deliveredAt", "Delivered"), cat("channel", "Channel", ["Partner", "Direct", "Resale"]), cat("stage", "Stage", ["Sold", "Delivered to partner", "Delivered to customer"]),
  ], [L.vehicle, L.customer]),
  rec("preorders", "Pre-orders", "pre-order", "event", "vehicle", 35, [
    date("createdAt", "Created"), num("deposit", "Deposit", "KES", 5000), cat("stage", "Stage", ["Registered", "Pre-ordered", "Deposit paid", "Activated", "Cancelled"]),
  ], [L.customer]),
  rec("scanner_actions", "Scanner actions", "scanner action", "event", "scanner", 380, [
    date("timestamp", "Time"), cat("actionType", "Action", ["Bring-up", "Handover", "RFID link", "RFID unlink", "Sale", "Return", "Test ride", "Firmware check"]),
    cat("syncStatus", "Sync", ["Synced", "Pending", "Failed"]), cat("rfidStatus", "RFID", ["Linked", "Unlinked", "Mismatch"]), cat("tenant", "Tenant", PARTNERS),
  ], [L.vehicle], "/scanner-provisioning"),
  rec("batteries", "Batteries", "battery", "thing", "vehicle", 39000, [
    date("firstDeployedAt", "First deployed"), date("lastSeen", "Last seen"), num("soc", "State of charge", "%", 58), num("health", "Health", "%", 93), num("cycles", "Charge cycles", "", 410),
    cat("state", "State", ["Pre bring-up", "Ready 1", "Storage", "Ready 2", "Active", "Quarantine", "Retired"]), cat("assetType", "Held in", ["Station", "Vehicle", "Warehouse"]), region,
  ], [], "/battery-tracking"),
  rec("battery_events", "Battery events", "battery event", "event", "vehicle", 900, [
    date("at", "Time"), cat("type", "Event", ["Registered", "Bring-up 1", "Stored", "Charged in storage", "Bring-up 2", "Deployed", "Quarantined", "Repaired", "Released", "Retired"]),
  ], [L.battery]),
  rec("battery_shipments", "Battery shipments", "shipment", "event", "vehicle", 2, [
    date("arrivedAt", "Arrived"), num("batteries", "Batteries in shipment", "", 120), cat("warehouse", "Warehouse", ["Nairobi DC", "Mombasa Port", "Kampala DC"]),
  ]),
  rec("stations", "Swap stations", "swap station", "thing", "charging", 420, [
    date("goLiveDate", "Go-live date"), num("batteriesInstalled", "Batteries installed", "", 18), num("rating", "Rating", "", 4.4),
    cat("name", "Name", STATIONS), cat("status", "Status", ["Live", "Under maintenance", "Offline", "Planned"]), region, country, cat("zone", "Zone", ZONES), place("location", "Location"),
  ], [L.site], "/zeno-charging"),
  rec("fast_chargers", "Fast chargers", "fast charger", "thing", "charging", 260, [
    date("goLiveDate", "Go-live date"), num("power", "Power", "kW", 3.3), cat("status", "Status", ["Live", "Under maintenance", "Offline", "Planned"]), region, country, place("location", "Location"),
  ], [L.site], "/zeno-charging"),
  rec("fast_charge_sessions", "Fast charge sessions", "fast charge session", "event", "charging", 1400, [
    date("startedAt", "Session start"), num("kwh", "Energy delivered", "kWh", 3.1), num("amount", "Amount", "KES", 180), num("duration", "Duration", "min", 24),
    cat("outcome", "Outcome", ["Completed", "Stopped early", "Failed"]), ident("customerId", "Customers", 0.5),
  ], [L.charger, L.customer, L.vehicle]),
  rec("home_charge_sessions", "Home charge sessions", "home charge session", "event", "charging", 2600, [
    date("startedAt", "Session start"), num("kwh", "Energy delivered", "kWh", 1.4), num("amount", "Amount", "KES", 60), ident("customerId", "Customers", 0.3),
  ], [L.customer, L.vehicle]),
  rec("station_outages", "Station outages", "outage", "event", "charging", 9, [
    date("startedAt", "Outage start"), num("minutes", "Downtime", "min", 85), cat("cause", "Cause", ["Power", "Network", "Hardware", "Maintenance"]),
  ], [L.station]),
  rec("sites", "Sites", "site", "thing", "charging", 520, [
    date("leaseSigned", "Lease signed"), date("leaseExpiry", "Lease expiry"), num("monthlyRent", "Monthly rent", "KES", 14500),
    cat("town", "Town", TOWNS), country, cat("zone", "Zone", ZONES), cat("accessType", "Access", ["Public", "Private"]), cat("phase", "Phase", ["Single Phase", "Three Phase"]), place("location", "Location"),
  ], [], "/zeno-charging"),
  rec("rent_payments", "Rent payments", "rent payment", "event", "charging", 17, [
    date("paidAt", "Paid"), num("amount", "Amount", "KES", 14500), cat("frequency", "Frequency", ["Monthly", "Quarterly", "Annual"]), cat("method", "Method", ["Paybill", "Bank transfer"]),
  ], [L.site]),
  rec("electricity_bills", "Electricity bills", "electricity bill", "event", "charging", 14, [
    date("billedAt", "Billed"), num("amount", "Amount", "KES", 22000), num("kwh", "Energy", "kWh", 1100), cat("tariff", "Tariff", ["EV tariff", "Commercial", "Domestic"]), cat("service", "Service", ["Pre-paid", "Post-paid"]),
  ], [L.site]),
  rec("pricing_changes", "Pricing plan changes", "pricing change", "event", "pricing", 0.4, [
    date("changedAt", "Changed"), cat("plan", "Pricing plan", ["Default", "Nairobi CBD", "Upcountry Saver", "Night Rider Promo", "Commuter Hours Pilot"]), cat("change", "Change", ["Created", "Rates edited", "Stations assigned", "Scheduled", "Ended"]),
  ]),
  rec("users", "Dome users", "Dome user", "thing", "user_management", 26, [
    date("createdAt", "Created"), cat("role", "Role", ["Super Admin", "Internal User", "Internal Viewer", "External Admin", "External Viewer"]), cat("status", "Status", ["Active", "Inactive"]),
  ], [], "/users"),
  rec("sign_ins", "Dome sign-ins", "sign-in", "event", "user_management", 140, [
    date("at", "Time"), cat("outcome", "Outcome", ["Signed in", "Wrong code", "Expired code"]), cat("role", "Role", ["Super Admin", "Internal User", "Internal Viewer", "External Admin", "External Viewer"]),
  ]),
];

const METRICS: NamedMetric[] = [
  { id: "swap_revenue", name: "Swap revenue", record: "swap_charges", unit: "KES", calc: { type: "sum", field: "amount" },
    definition: "Everything charged for swaps: the amount on every swap charge, at the rates in force when the swap happened." },
  { id: "swap_success_rate", name: "Swap success rate", record: "swaps", unit: "%", calc: { type: "rate", base: 0.968, spread: 0.02 },
    definition: "Completed swaps as a share of all swaps started. Skipped, flagged and RFID-mismatch swaps count as not completed." },
  { id: "station_uptime", name: "Station uptime", record: "stations", unit: "%", calc: { type: "rate", base: 0.982, spread: 0.015 },
    definition: "The share of the period a live station could serve a swap. Planned maintenance counts as downtime." },
  { id: "fleet_online", name: "Fleet online", record: "vehicles", unit: "%", calc: { type: "rate", base: 0.91, spread: 0.04 },
    definition: "Vehicles that connected in the last 24 hours, as a share of active vehicles." },
  { id: "recharge_success_rate", name: "Recharge success rate", record: "recharges", unit: "%", calc: { type: "rate", base: 0.94, spread: 0.03 },
    definition: "Recharges that reached the wallet, as a share of all recharge requests." },
  { id: "audit_compliance", name: "Swap audit compliance", record: "swap_sessions", unit: "%", calc: { type: "rate", base: 0.93, spread: 0.04 },
    definition: "Audit sessions with a Compliant verdict, as a share of all audited sessions." },
];

export const REGISTRY_SEED: Registry = { records: RECORDS, metrics: METRICS };
