/**
 * Swap Audit — the sample day of swap sessions, and the rules that judge them.
 *
 * A swap station cannot see whether its door latch was closed by a real battery
 * insertion. A rider can hold the collect door open and press the latch by hand:
 * the station reads "door closed" exactly as for a genuine collect and goes on to
 * dispense a charged battery. This module builds a day of sessions where that
 * happens in twelve different shapes, and scores each one.
 *
 * Everything here is deterministic. The generator runs off a seeded LCG, never
 * `Math.random`, so the same 44 transactions appear on every load and on every
 * machine — the same rule `src/lib/map-data.ts` keeps for its map pins. The order
 * of the random draws below is therefore load-bearing: reorder two calls and every
 * downstream S/N shifts.
 *
 * Clock values are plain minute/second counts, never `Date`. The page is client
 * rendered off a worker-rendered shell, and a `toLocaleTimeString` would disagree
 * between a UTC server and an IST browser.
 */

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

let seed = 20261006;

function rnd(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

/** Integer in [a, b], both ends inclusive. */
function ri(a: number, b: number): number {
  return a + Math.floor(rnd() * (b - a + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/** Fisher–Yates on a copy, walking from the end down. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i >= 1; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A 10-digit battery serial number. */
function sn(): string {
  return String(ri(1000000000, 9999999999));
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Slot label as it appears everywhere in the UI: S01 … S10. */
export function slotLabel(slot: number): string {
  return `S${pad(slot)}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type BatteryKind = "charged" | "depleted" | "foreign" | "phantom";

export interface Origin {
  /** `dispensed` = this station handed it out; `collected` = it was already read this session. */
  type: "dispensed" | "collected";
  slot: number;
  ago: number;
}

export interface Battery {
  sn: string | null;
  soc: number | null;
  kind: BatteryKind;
  /** Set on a foreign battery: the customer it is checked out to. */
  owner?: string;
  /** Set when the S/N read here is a battery the station already had. */
  origin?: Origin;
  /** Phantom only: why the slot is empty. */
  why?: "none" | "poll";
}

/** The ten slots, index 0 = S01. `null` = the station believes the slot is empty. */
export type SlotState = (Battery | null)[];

export interface Station {
  id: string;
  name: string;
}

export interface Customer {
  name: string;
  phone: string;
  rfid: string;
  id: string;
}

export type StepType = "collect" | "dispense" | "timeout" | "poll";

export interface Step {
  type: StepType;
  /** Seconds since the RFID tap. */
  t: number;
  /** The station's recorded slot state once this step has been applied. */
  state: SlotState;
  slot?: number;
  bat?: Battery | null;
  origin?: Origin;
  /** Collect only: the battery was read, then pulled back out through the open door. */
  withdrawn?: boolean;
  /** Timeout only. */
  mode?: "collect" | "dispense";
  /** Poll only. */
  slots?: number[];
  expected?: string[];
  post?: boolean;
}

export type VerdictStatus = "COMPLIANT" | "NON-COMPLIANT" | "REVIEW" | "NO SWAP";

export interface Flag {
  t: string;
  k: "bad" | "warn" | "ok" | "";
}

export interface Verdict {
  status: VerdictStatus;
  flags: Flag[];
  /** Recorded collects — every collect the station logged. */
  Rc: number;
  /** Confirmed collects — a battery was detected and the poll did not later find the slot empty. */
  Pc: number;
  /** Dispensed. */
  Dn: number;
  /** Confirmed collects − dispensed. Negative = the station is short. */
  bal: number;
}

export interface Scenario {
  key: string;
  name: string;
  description: string;
  events: EventScript[];
  weight: number;
}

export interface SwapTxn {
  id: string;
  sc: Scenario;
  station: Station;
  /** Minutes since midnight on 6 Oct 2026, IST. */
  startMinute: number;
  /** Session length in seconds. */
  endT: number;
  before: SlotState;
  after: SlotState;
  steps: Step[];
  cust: Customer;
  vehicle: string;
  checkedOut: string[];
  verdict: Verdict;
  /** Lowercased bag of everything the search box matches against. */
  haystack: string;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

export const STATIONS: Station[] = [
  { id: "STN-BLR-014", name: "HSR Layout" },
  { id: "STN-BLR-021", name: "Koramangala 5th Blk" },
  { id: "STN-BLR-033", name: "Whitefield ITPL" },
  { id: "STN-BLR-047", name: "Electronic City Ph 1" },
];

const FIRST_NAMES = [
  "Arjun", "Priya", "Ravi", "Meena", "Karthik", "Divya", "Suresh", "Anitha",
  "Vikram", "Lakshmi", "Naveen", "Shalini", "Manoj", "Deepa", "Rahul", "Kavya",
  "Imran", "Farah", "Prakash", "Sowmya", "Ganesh", "Harini", "Sandeep", "Nisha",
];

const LAST_NAMES = [
  "Kumar", "Reddy", "Nair", "Gowda", "Iyer", "Sharma", "Rao",
  "Menon", "Shetty", "Pillai", "Khan", "Hegde", "Naidu", "Prasad",
];

const PHONE_PREFIXES = [98, 99, 97, 90, 88, 70, 63];

/**
 * An event script entry.
 *
 * `["C", slotTok, batKey, opts]` collect · `["D", slotTok]` dispense ·
 * `["T", slotTok, mode]` slot opened and timed out.
 *
 * Slot tokens: `E0`/`E1` = 1st/2nd randomly chosen empty slot, `C0`/`C1` = 1st/2nd
 * randomly chosen charged slot. Battery keys: `A`/`B` = the customer's own two,
 * `F` = one checked out to someone else, `null` = nothing in the slot at door
 * close, `D:C0` = the battery just dispensed from C0 this session.
 */
type SlotTok = "E0" | "E1" | "C0" | "C1";
type BatKey = "A" | "B" | "F" | null | "D:C0";
export type EventScript =
  | ["C", SlotTok, BatKey, { withdrawn?: boolean }?]
  | ["D", SlotTok]
  | ["T", SlotTok, "collect" | "dispense"];

export const SCENARIOS: Scenario[] = [
  {
    key: "compliant",
    name: "Compliant swap",
    description: "Collect depleted → dispense charged, twice. Each collect reads the customer's own battery.",
    events: [["C", "E0", "A"], ["D", "C0"], ["C", "E1", "B"], ["D", "C1"]],
    weight: 12,
  },
  {
    key: "empty1",
    name: "No battery at 1st collect",
    description: "Door reported closed with nothing in the slot. The station still dispensed a charged battery",
    events: [["C", "E0", null], ["D", "C0"], ["C", "E1", "B"], ["D", "C1"]],
    weight: 2,
  },
  {
    key: "empty2",
    name: "No battery at 2nd collect",
    description: "First pair is genuine. Second collect closes with nothing in the slot",
    events: [["C", "E0", "A"], ["D", "C0"], ["C", "E1", null], ["D", "C1"]],
    weight: 3,
  },
  {
    key: "emptyBoth",
    name: "No battery at either collect",
    description: "Both collects close empty. Customer leaves with 2 charged batteries, hands in none",
    events: [["C", "E0", null], ["D", "C0"], ["C", "E1", null], ["D", "C1"]],
    weight: 1,
  },
  {
    key: "reinsertDispensed",
    name: "Dispensed battery re-inserted",
    description: "The battery just dispensed is read in the 2nd collect slot, then taken back out before the latch is pressed",
    events: [["C", "E0", "A"], ["D", "C0"], ["C", "E1", "D:C0", { withdrawn: true }], ["D", "C1"]],
    weight: 3,
  },
  {
    key: "reinsertOwn",
    name: "Same battery collected twice",
    description: "Customer's battery is read at the 1st collect, taken back out, then inserted again for the 2nd collect",
    events: [["C", "E0", "A", { withdrawn: true }], ["D", "C0"], ["C", "E1", "A"], ["D", "C1"]],
    weight: 2,
  },
  {
    key: "withdrawnPoll",
    name: "Slot found empty after session",
    description: "Battery read at the 1st collect, then taken back out. Nothing looked wrong until the post-session poll",
    events: [["C", "E0", "A", { withdrawn: true }], ["D", "C0"], ["C", "E1", "B"], ["D", "C1"]],
    weight: 2,
  },
  {
    key: "foreign",
    name: "Battery checked out to another customer",
    description: "Collected S/N is not one of this customer's batteries",
    events: [["C", "E0", "F"], ["D", "C0"], ["C", "E1", "B"], ["D", "C1"]],
    weight: 1,
  },
  {
    key: "half",
    name: "Single-battery swap",
    description: "One collect → dispense pair, then the customer ends the session",
    events: [["C", "E0", "A"], ["D", "C0"]],
    weight: 2,
  },
  {
    key: "dispTimeout",
    name: "Collected two, dispensed one",
    description: "2nd dispense slot opened but the battery was never taken (timeout)",
    events: [["C", "E0", "A"], ["D", "C0"], ["C", "E1", "B"], ["T", "C1", "dispense"]],
    weight: 2,
  },
  {
    key: "dispTimeout1",
    name: "Collected one, dispensed none",
    description: "Dispense slot opened after the first collect, battery never taken",
    events: [["C", "E0", "A"], ["T", "C0", "dispense"]],
    weight: 1,
  },
  {
    key: "aborted",
    name: "Session aborted",
    description: "Collect slot opened, nothing inserted, slot timed out",
    events: [["T", "E0", "collect"]],
    weight: 1,
  },
];

const SCENARIO_BY_KEY = new Map(SCENARIOS.map((s) => [s.key, s]));

// ── Customers ────────────────────────────────────────────────────────────────

function buildCustomers(): Customer[] {
  const out: Customer[] = [];
  for (let i = 0; i < 30; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const prefix = pick(PHONE_PREFIXES);
    const three = ri(100, 999);
    const five = ri(10000, 99999);
    const rfid = String(ri(10000000, 99999999));
    const id = `R-${ri(10000, 99999)}`;
    out.push({ name: `${first} ${last}`, phone: `+91 ${prefix}${three} ${five}`, rfid, id });
  }
  return out;
}

export const CUSTOMERS: Customer[] = buildCustomers();

// ── Verdict engine ───────────────────────────────────────────────────────────

/**
 * Scores a session from its steps alone. The scenario never reaches this
 * function: a scenario's verdict has to fall out of the evidence, or the tool is
 * just restating what it was told.
 */
export function verdict(steps: Step[]): Verdict {
  const col = steps.filter((s) => s.type === "collect");
  const disp = steps.filter((s) => s.type === "dispense");
  const tos = steps.filter((s) => s.type === "timeout");
  const poll = steps.find((s) => s.type === "poll");
  const pollSlots = poll?.slots ?? [];

  const Rc = col.length;
  const Pc = col.filter((s) => s.bat && !pollSlots.includes(s.slot!)).length;
  const Dn = disp.length;
  const bal = Pc - Dn;

  const flags: Flag[] = [];
  let hard = false;
  const bad = (t: string) => { flags.push({ t, k: "bad" }); hard = true; };
  const warn = (t: string) => flags.push({ t, k: "warn" });

  if (Rc === 0 && Dn === 0) {
    return {
      status: "NO SWAP",
      flags: [{ t: "Collect slot opened and timed out, no battery movement", k: "" }],
      Rc, Pc, Dn, bal,
    };
  }

  for (const s of col) {
    const at = slotLabel(s.slot!);
    if (!s.bat) {
      bad(`${at}: door closed, no battery detected`);
    } else if (s.origin?.type === "dispensed") {
      bad(`${at}: read ${s.bat.sn}, dispensed from ${slotLabel(s.origin.slot)} ${s.origin.ago}s earlier`);
    } else if (s.origin?.type === "collected") {
      bad(`${at}: read ${s.bat.sn}, already collected in ${slotLabel(s.origin.slot)}`);
    }
    if (s.bat?.kind === "foreign") {
      bad(`${at}: ${s.bat.sn} is checked out to ${s.bat.owner}`);
    }
  }

  if (poll) {
    bad(
      `Post-session poll: ${pollSlots.map(slotLabel).join(", ")} empty, ` +
      `expected ${(poll.expected ?? []).join(", ")}`
    );
  }

  for (const s of tos) {
    if (s.mode === "dispense") warn(`${slotLabel(s.slot!)}: dispense timed out, battery not taken`);
  }

  if (Pc !== 2) warn(`Confirmed collects ${Pc} (expected 2)`);
  if (Dn !== 2) warn(`Dispensed ${Dn} (expected 2)`);

  if (bal < 0) bad(`Battery loss: station short by ${-bal}`);
  else if (bal > 0) bad(`Station owes customer ${bal} battery`);

  if (flags.length === 0) {
    return {
      status: "COMPLIANT",
      flags: [{ t: "Collect → dispense, twice · customer's own batteries read · slots confirmed", k: "ok" }],
      Rc, Pc, Dn, bal,
    };
  }

  return { status: hard ? "NON-COMPLIANT" : "REVIEW", flags, Rc, Pc, Dn, bal };
}

// ── Building one transaction ─────────────────────────────────────────────────

const cloneState = (state: SlotState): SlotState => state.map((b) => (b ? { ...b } : null));

function buildTxn(sc: Scenario, station: Station, startMinute: number, index: number): SwapTxn {
  // 1. Where the station starts: three or four slots empty, the rest charged.
  const emptySlots = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, ri(3, 4));
  const before: SlotState = [];
  for (let slot = 1; slot <= 10; slot++) {
    before.push(
      emptySlots.includes(slot) ? null : { sn: sn(), soc: ri(92, 100), kind: "charged" }
    );
  }

  const chargedSlots: number[] = [];
  for (let slot = 1; slot <= 10; slot++) if (!emptySlots.includes(slot)) chargedSlots.push(slot);

  const E = shuffle(emptySlots);
  const C = shuffle(chargedSlots);
  const resolve = (tok: SlotTok): number => (tok === "E0" ? E[0] : tok === "E1" ? E[1] : tok === "C0" ? C[0] : C[1]);

  // 2. Who is swapping, and whose batteries are involved.
  const cust = pick(CUSTOMERS);
  // Picked out of the others rather than re-rolled on a clash: a re-roll would
  // draw a varying number of times and slide every later transaction's data.
  const other = pick(CUSTOMERS.filter((c) => c !== cust));

  const A: Battery = { sn: sn(), soc: ri(5, 18), kind: "depleted" };
  const B: Battery = { sn: sn(), soc: ri(5, 18), kind: "depleted" };
  const F: Battery = { sn: sn(), soc: ri(5, 18), kind: "foreign", owner: other.name };
  const byKey: Record<string, Battery> = { A, B, F };

  // 3. Walk the script, keeping what the station *records* apart from what is
  //    *physically* in each slot. The gap between the two is the whole point.
  const sys = cloneState(before);
  const phys = cloneState(before);
  const dispensed = new Map<number, { bat: Battery | null; t: number }>();
  const collectedSn = new Map<string, { slot: number; t: number }>();
  const steps: Step[] = [];
  let t = 0;

  for (const ev of sc.events) {
    t += ri(5, 12);

    if (ev[0] === "C") {
      const slot = resolve(ev[1]);
      const batKey = ev[2];
      const withdrawn = ev[3]?.withdrawn ?? false;

      let bat: Battery | null = null;
      let origin: Origin | undefined;

      if (typeof batKey === "string" && batKey.startsWith("D:")) {
        const fromSlot = resolve(batKey.slice(2) as SlotTok);
        const rec = dispensed.get(fromSlot);
        bat = rec?.bat ? { ...rec.bat } : null;
        if (rec) origin = { type: "dispensed", slot: fromSlot, ago: t - rec.t };
      } else if (batKey) {
        bat = { ...byKey[batKey] };
        const seen = bat.sn ? collectedSn.get(bat.sn) : undefined;
        if (seen) origin = { type: "collected", slot: seen.slot, ago: t - seen.t };
      }

      if (bat?.sn) collectedSn.set(bat.sn, { slot, t });

      sys[slot - 1] = bat
        ? { ...bat, ...(origin ? { origin } : {}) }
        : { kind: "phantom", sn: null, soc: null, why: "none" };
      phys[slot - 1] = bat && !withdrawn ? { ...bat } : null;

      steps.push({ type: "collect", slot, bat, origin, withdrawn, t, state: cloneState(sys) });
    } else if (ev[0] === "D") {
      const slot = resolve(ev[1]);
      const bat = sys[slot - 1];
      dispensed.set(slot, { bat, t });
      sys[slot - 1] = null;
      phys[slot - 1] = null;
      steps.push({ type: "dispense", slot, bat, t, state: cloneState(sys) });
    } else {
      const slot = resolve(ev[1]);
      const mode = ev[2];
      t += 50; // a timeout is the slot sitting open until the station gives up
      steps.push({
        type: "timeout",
        slot,
        mode,
        bat: mode === "dispense" ? sys[slot - 1] : null,
        t,
        state: cloneState(sys),
      });
    }
  }

  const endT = t + ri(3, 7);

  // 4. The post-session inventory poll: slots the station believes are full but
  //    which are physically empty. This is what catches a withdrawn battery.
  const missing: number[] = [];
  for (let slot = 1; slot <= 10; slot++) {
    const rec = sys[slot - 1];
    if (rec && rec.kind !== "phantom" && !phys[slot - 1]) missing.push(slot);
  }

  if (missing.length) {
    const pollState = cloneState(sys);
    for (const slot of missing) {
      const rec = sys[slot - 1]!;
      pollState[slot - 1] = { kind: "phantom", sn: rec.sn, soc: rec.soc, why: "poll" };
    }
    steps.push({
      type: "poll",
      slots: missing,
      expected: missing.map((slot) => sys[slot - 1]!.sn!).filter(Boolean),
      t: endT + ri(40, 110),
      state: pollState,
      post: true,
    });
  }

  const vehicle = `KA-${pad(ri(1, 53))}-${pick(["EV", "EZ", "EM"])}-${ri(1000, 9999)}`;

  const txn: SwapTxn = {
    id: `SWP-20261006-${String(index).padStart(3, "0")}`,
    sc,
    station,
    startMinute,
    endT,
    before,
    after: steps.length ? steps[steps.length - 1].state : cloneState(before),
    steps,
    cust,
    vehicle,
    checkedOut: [A.sn!, B.sn!],
    verdict: verdict(steps),
    haystack: "",
  };

  txn.haystack = searchIndex(txn);
  return txn;
}

/** Everything the search box is allowed to match, lowercased and run together. */
function searchIndex(txn: SwapTxn): string {
  const parts: string[] = [
    txn.id,
    txn.cust.name,
    txn.cust.phone,
    txn.cust.phone.replace(/\s/g, ""),
    txn.cust.rfid,
    txn.cust.id,
    txn.vehicle,
    txn.station.name,
    txn.station.id,
    txn.sc.name,
  ];
  for (const s of txn.steps) if (s.bat?.sn) parts.push(s.bat.sn);
  for (const b of txn.before) if (b?.sn) parts.push(b.sn);
  return parts.join(" ").toLowerCase();
}

// ── The day ──────────────────────────────────────────────────────────────────

function buildTransactions(): SwapTxn[] {
  // Each scenario appears weight + 1 times, so every shape is on screen at least
  // once and compliant swaps still dominate the way they do in the field.
  const bag: Scenario[] = [];
  for (const sc of SCENARIOS) for (let i = 0; i < sc.weight; i++) bag.push(sc);

  const mix = shuffle([...SCENARIOS, ...shuffle(bag)].slice(0, 46));
  const ordered = mix
    .map((sc, i) => ({ sc, i }))
    .sort((a, b) => {
      const ac = a.sc.key === "compliant" ? 0 : 1;
      const bc = b.sc.key === "compliant" ? 0 : 1;
      return ac - bc || a.i - b.i;
    })
    .map((x) => x.sc);

  let minute = 362; // 06:02 IST
  const out: SwapTxn[] = [];
  for (let i = 0; i < ordered.length; i++) {
    minute += ri(4, 21);
    const station = pick(STATIONS);
    out.push(buildTxn(ordered[i], station, minute, i + 1));
  }

  return out.reverse(); // newest first
}

export const SWAP_TXNS: SwapTxn[] = buildTransactions();

export const VERDICT_ORDER: VerdictStatus[] = ["COMPLIANT", "NON-COMPLIANT", "REVIEW", "NO SWAP"];

/** Totals across the whole day — the verdict chips show these, not the filtered counts. */
export const VERDICT_TOTALS: Record<VerdictStatus, number> = VERDICT_ORDER.reduce(
  (acc, status) => {
    acc[status] = SWAP_TXNS.filter((t) => t.verdict.status === status).length;
    return acc;
  },
  {} as Record<VerdictStatus, number>
);

/** §16: open on the oldest transaction, with four telling scenarios pre-selected. */
export const INITIAL_ACTIVE_ID = SWAP_TXNS[SWAP_TXNS.length - 1].id;

export const INITIAL_SELECTED_IDS: string[] = ["compliant", "empty2", "reinsertDispensed", "reinsertOwn"]
  .map((key) => [...SWAP_TXNS].reverse().find((t) => t.sc.key === key)?.id)
  .filter((id): id is string => Boolean(id));

export function scenarioByKey(key: string): Scenario | undefined {
  return SCENARIO_BY_KEY.get(key);
}

// ── Display vocabulary (§5) ──────────────────────────────────────────────────

export function stepLabel(step: Step): string {
  if (step.type === "dispense") return "DISPENSE";
  if (step.type === "timeout") return step.mode === "dispense" ? "DISPENSE TIMEOUT" : "COLLECT TIMEOUT";
  if (step.type === "poll") return "INVENTORY POLL";
  return step.bat ? "COLLECT" : "EMPTY COLLECT";
}

/** A collect is suspicious if nothing went in, the S/N is the station's own, or it belongs to someone else. */
export function isSuspicious(step: Step): boolean {
  if (step.type !== "collect") return false;
  return !step.bat || Boolean(step.origin) || step.bat.kind === "foreign";
}

export interface Detection {
  text: string;
  bad: boolean;
}

/** What the evidence says about one collect. */
export function detectionText(step: Step): Detection {
  if (!step.bat) return { text: "No battery detected", bad: true };
  if (step.origin?.type === "dispensed") {
    return {
      text: `Station battery · dispensed from ${slotLabel(step.origin.slot)} ${step.origin.ago}s ago`,
      bad: true,
    };
  }
  if (step.origin?.type === "collected") {
    return { text: `Already collected in ${slotLabel(step.origin.slot)} this session`, bad: true };
  }
  if (step.bat.kind === "foreign") return { text: `Checked out to ${step.bat.owner}`, bad: true };
  return { text: "Customer's battery", bad: false };
}

/** HH:MM from minutes since midnight. */
export function fmtClock(minutes: number): string {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

/** HH:MM:SS from minutes since midnight plus an offset in seconds. */
export function fmtClockSec(minutes: number, offsetSeconds: number): string {
  const total = minutes * 60 + offsetSeconds;
  return `${pad(Math.floor(total / 3600) % 24)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** Relative session time, t+MM:SS. */
export function fmtRel(t: number): string {
  return `t+${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** First letters of the first two words of a name. */
export function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("");
}
