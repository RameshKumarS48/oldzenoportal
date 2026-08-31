import { addWeeks, format } from "date-fns";

export interface PreorderWeekData {
  weekStart: string;
  appDownloads: { actual: number };
  cumulativeDownloads: { actual: number };
  registrations: { actual: number };
  downloadToRegRate: { actual: number };
  preorders: { actual: number };
  registrationToPreorderRate: { actual: number };
  preorderToActivationRate: { actual: number };
  activations: { actual: number };
  organicDownloads: { actual: number };
  referralDownloads: { actual: number };
  paidDownloads: { actual: number };
  organicPreorders: { actual: number };
  referralPreorders: { actual: number };
  avgTimeToPreorderDays: { actual: number };
  avgTimeToActivationDays: { actual: number };
  dropOffAtRegistration: { actual: number };
  dropOffAtPreorder: { actual: number };
  depositsPaidKES: { actual: number };
  avgDepositKES: { actual: number };
  preorderCancellations: { actual: number };
  cancellationRate: { actual: number };
}

export const PREORDER_WEEKS = Array.from({ length: 18 }, (_, i) => {
  const date = addWeeks(new Date("2026-06-01"), i);
  return { weekStart: format(date, "yyyy-MM-dd"), label: format(date, "d-MMM-yy") };
});

let cumDownloads = 0;

// Funnel narrative:
// Wks 1-2: Stealth / waitlist mode — minimal downloads
// Wks 3-4: Soft launch to early adopters
// Wks 5-8: Public launch — downloads spike, referral programme kicks in
// Wks 9-14: Steady growth, referral becomes major channel
// Wks 15-18: Partner channel opens, growth accelerates

const RAW = [
  // wk1
  { dl:120,  reg:78,  pre:22,  act:18, org:110, ref:6,   paid:4,   orgPre:20, refPre:2,  t2Pre:2.1, t2Act:8.4,  dropReg:42,  dropPre:56,  dep:220000,  avgDep:10000, cancel:1,  canRate:4.5  },
  // wk2
  { dl:145,  reg:95,  pre:28,  act:22, org:130, ref:9,   paid:6,   orgPre:25, refPre:3,  t2Pre:2.0, t2Act:8.1,  dropReg:50,  dropPre:67,  dep:268000,  avgDep:9571,  cancel:1,  canRate:3.6  },
  // wk3 — soft launch
  { dl:280,  reg:185, pre:52,  act:38, org:210, ref:45,  paid:25,  orgPre:42, refPre:10, t2Pre:1.9, t2Act:7.8,  dropReg:95,  dropPre:133, dep:504000,  avgDep:9692,  cancel:2,  canRate:3.8  },
  // wk4
  { dl:360,  reg:242, pre:70,  act:54, org:260, ref:65,  paid:35,  orgPre:55, refPre:15, t2Pre:1.8, t2Act:7.5,  dropReg:118, dropPre:172, dep:680000,  avgDep:9714,  cancel:3,  canRate:4.3  },
  // wk5 — public launch
  { dl:680,  reg:462, pre:138, act:98, org:420, ref:170, paid:90,  orgPre:95, refPre:43, t2Pre:1.7, t2Act:7.2,  dropReg:218, dropPre:324, dep:1332000, avgDep:9652,  cancel:5,  canRate:3.6  },
  // wk6
  { dl:820,  reg:558, pre:170, act:124,org:490, ref:215, paid:115, orgPre:112,refPre:58, t2Pre:1.6, t2Act:6.9,  dropReg:262, dropPre:388, dep:1640000, avgDep:9647,  cancel:6,  canRate:3.5  },
  // wk7
  { dl:910,  reg:619, pre:192, act:142,org:528, ref:248, paid:134, orgPre:122,refPre:70, t2Pre:1.5, t2Act:6.7,  dropReg:291, dropPre:427, dep:1848000, avgDep:9625,  cancel:7,  canRate:3.6  },
  // wk8
  { dl:980,  reg:667, pre:210, act:156,org:560, ref:278, paid:142, orgPre:132,refPre:78, t2Pre:1.4, t2Act:6.5,  dropReg:313, dropPre:457, dep:2022000, avgDep:9629,  cancel:7,  canRate:3.3  },
  // wk9
  { dl:1040, reg:707, pre:228, act:172,org:582, ref:308, paid:150, orgPre:140,refPre:88, t2Pre:1.4, t2Act:6.3,  dropReg:333, dropPre:479, dep:2196000, avgDep:9632,  cancel:8,  canRate:3.5  },
  // wk10
  { dl:1090, reg:741, pre:244, act:186,org:600, ref:334, paid:156, orgPre:148,refPre:96, t2Pre:1.3, t2Act:6.1,  dropReg:349, dropPre:497, dep:2352000, avgDep:9639,  cancel:8,  canRate:3.3  },
  // wk11
  { dl:1130, reg:769, pre:258, act:198,org:614, ref:356, paid:160, orgPre:155,refPre:103,t2Pre:1.3, t2Act:5.9,  dropReg:361, dropPre:511, dep:2484000, avgDep:9628,  cancel:9,  canRate:3.5  },
  // wk12
  { dl:1160, reg:789, pre:270, act:210,org:624, ref:372, paid:164, orgPre:160,refPre:110,t2Pre:1.2, t2Act:5.7,  dropReg:371, dropPre:519, dep:2610000, avgDep:9667,  cancel:9,  canRate:3.3  },
  // wk13
  { dl:1180, reg:802, pre:280, act:220,org:630, ref:384, paid:166, orgPre:164,refPre:116,t2Pre:1.2, t2Act:5.5,  dropReg:378, dropPre:522, dep:2706000, avgDep:9664,  cancel:10, canRate:3.6  },
  // wk14 — partner channel opens
  { dl:1280, reg:870, pre:308, act:240,org:650, ref:420, paid:210, orgPre:172,refPre:136,t2Pre:1.1, t2Act:5.3,  dropReg:410, dropPre:562, dep:2982000, avgDep:9682,  cancel:10, canRate:3.2  },
  // wk15
  { dl:1380, reg:938, pre:336, act:262,org:670, ref:460, paid:250, orgPre:180,refPre:156,t2Pre:1.1, t2Act:5.1,  dropReg:442, dropPre:602, dep:3258000, avgDep:9696,  cancel:11, canRate:3.3  },
  // wk16
  { dl:1460, reg:992, pre:360, act:280,org:686, ref:492, paid:282, orgPre:188,refPre:172,t2Pre:1.0, t2Act:4.9,  dropReg:468, dropPre:632, dep:3492000, avgDep:9700,  cancel:12, canRate:3.3  },
  // wk17
  { dl:1520, reg:1034,pre:380, act:298,org:698, ref:518, paid:304, orgPre:194,refPre:186,t2Pre:1.0, t2Act:4.7,  dropReg:488, dropPre:654, dep:3686000, avgDep:9700,  cancel:12, canRate:3.2  },
  // wk18
  { dl:1560, reg:1061,pre:398, act:314,org:706, ref:538, paid:316, orgPre:200,refPre:198,t2Pre:0.9, t2Act:4.5,  dropReg:501, dropPre:663, dep:3862000, avgDep:9704,  cancel:13, canRate:3.3  },
];

export const PREORDER_KPI_DATA: PreorderWeekData[] = RAW.map((r, i) => {
  cumDownloads += r.dl;
  return {
    weekStart: PREORDER_WEEKS[i].weekStart,
    appDownloads:               { actual: r.dl },
    cumulativeDownloads:        { actual: cumDownloads },
    registrations:              { actual: r.reg },
    downloadToRegRate:          { actual: Math.round((r.reg / r.dl) * 1000) / 10 },
    preorders:                  { actual: r.pre },
    registrationToPreorderRate: { actual: Math.round((r.pre / r.reg) * 1000) / 10 },
    preorderToActivationRate:   { actual: Math.round((r.act / r.pre) * 1000) / 10 },
    activations:                { actual: r.act },
    organicDownloads:           { actual: r.org },
    referralDownloads:          { actual: r.ref },
    paidDownloads:              { actual: r.paid },
    organicPreorders:           { actual: r.orgPre },
    referralPreorders:          { actual: r.refPre },
    avgTimeToPreorderDays:      { actual: r.t2Pre },
    avgTimeToActivationDays:    { actual: r.t2Act },
    dropOffAtRegistration:      { actual: r.dropReg },
    dropOffAtPreorder:          { actual: r.dropPre },
    depositsPaidKES:            { actual: r.dep },
    avgDepositKES:              { actual: r.avgDep },
    preorderCancellations:      { actual: r.cancel },
    cancellationRate:           { actual: r.canRate },
  };
});

export const PREORDER_METRIC_DEFINITIONS = [
  { key: "appDownloads",               label: "App Downloads",                group: "Funnel",     unit: "#",   definition: "Total app installs (iOS + Android) this week." },
  { key: "cumulativeDownloads",        label: "Cumulative Downloads",         group: "Funnel",     unit: "#",   definition: "Running total app installs since launch." },
  { key: "registrations",              label: "Registrations",                group: "Funnel",     unit: "#",   definition: "Users who completed account registration this week." },
  { key: "downloadToRegRate",          label: "Download → Register Rate",     group: "Funnel",     unit: "%",   definition: "Percentage of new downloads that completed registration in the same week." },
  { key: "preorders",                  label: "Pre-orders Placed",            group: "Funnel",     unit: "#",   definition: "Confirmed pre-orders (deposit paid) placed this week." },
  { key: "registrationToPreorderRate", label: "Register → Pre-order Rate",   group: "Funnel",     unit: "%",   definition: "Percentage of registrations that converted to a pre-order this week." },
  { key: "preorderToActivationRate",   label: "Pre-order → Activation Rate", group: "Funnel",     unit: "%",   definition: "Percentage of pre-orders that resulted in a bike activation this week." },
  { key: "activations",                label: "Activations from Pre-orders",  group: "Funnel",     unit: "#",   definition: "Bikes activated this week where the owner had a prior pre-order." },
  { key: "organicDownloads",           label: "Organic Downloads",            group: "Acquisition",unit: "#",   definition: "Downloads attributed to organic (non-paid, non-referral) search & discovery." },
  { key: "referralDownloads",          label: "Referral Downloads",           group: "Acquisition",unit: "#",   definition: "Downloads attributed to a referral link shared by an existing user." },
  { key: "paidDownloads",              label: "Paid Downloads",               group: "Acquisition",unit: "#",   definition: "Downloads attributed to paid UA campaigns (Meta, Google, TikTok)." },
  { key: "organicPreorders",           label: "Organic Pre-orders",           group: "Acquisition",unit: "#",   definition: "Pre-orders from organically acquired users." },
  { key: "referralPreorders",          label: "Referral Pre-orders",          group: "Acquisition",unit: "#",   definition: "Pre-orders from referral-acquired users." },
  { key: "avgTimeToPreorderDays",      label: "Avg Days: Register → Pre-order",group:"Time",      unit: "days",definition: "Average calendar days from account creation to first pre-order." },
  { key: "avgTimeToActivationDays",    label: "Avg Days: Pre-order → Activation",group:"Time",    unit: "days",definition: "Average calendar days from pre-order to bike delivery and activation." },
  { key: "dropOffAtRegistration",      label: "Drop-off at Registration",     group: "Drop-off",  unit: "#",   definition: "Downloads this week that did not complete registration within 7 days." },
  { key: "dropOffAtPreorder",          label: "Drop-off at Pre-order",        group: "Drop-off",  unit: "#",   definition: "Registrations that did not progress to a pre-order within 7 days." },
  { key: "depositsPaidKES",            label: "Deposits Paid (KES)",          group: "Payments",  unit: "KES", definition: "Total pre-order deposit value collected this week." },
  { key: "avgDepositKES",              label: "Avg Deposit (KES)",            group: "Payments",  unit: "KES", definition: "Average deposit amount per pre-order. Standard deposit: 10,000 KES." },
  { key: "preorderCancellations",      label: "Pre-order Cancellations",      group: "Payments",  unit: "#",   definition: "Pre-orders cancelled (deposit refunded) this week." },
  { key: "cancellationRate",           label: "Cancellation Rate (%)",        group: "Payments",  unit: "%",   definition: "Cancellations as a % of all active pre-orders. Alert if >5%." },
];
