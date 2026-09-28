import { addWeeks, format } from "date-fns";

export interface ReferralWeekData {
  weekStart: string;
  referralsEntered: { actual: number };
  referralsAwarded: { actual: number };
  totalSales: { actual: number };
  referralAttachRate: { actual: number };
  avgDaysToAward: { actual: number };
  pendingReferrals: { actual: number };
}

export const REFERRAL_WEEKS = Array.from({ length: 18 }, (_, i) => {
  const date = addWeeks(new Date("2026-06-01"), i);
  return { weekStart: format(date, "yyyy-MM-dd"), label: format(date, "d-MMM-yy") };
});

// Referral program ramp-up narrative:
// Wks 1-4:  Pre-launch (no entries)
// Wks 5-8:  Soft launch, small volumes, awards lagging entry by 3+ weeks
// Wks 9-12: Growing adoption, weekly entries climbing, awards still slow
// Wks 13-16: Scaling, backlog building in pending state
// Wk 17:  Week 28 actuals: 41 entered, 2 awarded, 86 sales, 2%, 4 days, 68 pending
// Wk 18:  Week 29 actuals: 14 entered, 47 awarded, 134 sales, 35%, 0.04 days, 73 pending

const RAW: Omit<ReferralWeekData, "weekStart">[] = [
  // Wk 1: 2026-06-01
  { referralsEntered:{actual:0},  referralsAwarded:{actual:0},  totalSales:{actual:52},  referralAttachRate:{actual:0},    avgDaysToAward:{actual:0},     pendingReferrals:{actual:0}  },
  // Wk 2: 2026-06-08
  { referralsEntered:{actual:0},  referralsAwarded:{actual:0},  totalSales:{actual:58},  referralAttachRate:{actual:0},    avgDaysToAward:{actual:0},     pendingReferrals:{actual:0}  },
  // Wk 3: 2026-06-15
  { referralsEntered:{actual:0},  referralsAwarded:{actual:0},  totalSales:{actual:61},  referralAttachRate:{actual:0},    avgDaysToAward:{actual:0},     pendingReferrals:{actual:0}  },
  // Wk 4: 2026-06-22
  { referralsEntered:{actual:0},  referralsAwarded:{actual:0},  totalSales:{actual:64},  referralAttachRate:{actual:0},    avgDaysToAward:{actual:0},     pendingReferrals:{actual:0}  },
  // Wk 5: 2026-06-29 (soft launch)
  { referralsEntered:{actual:4},  referralsAwarded:{actual:0},  totalSales:{actual:67},  referralAttachRate:{actual:0},    avgDaysToAward:{actual:0},     pendingReferrals:{actual:4}  },
  // Wk 6: 2026-07-06
  { referralsEntered:{actual:7},  referralsAwarded:{actual:0},  totalSales:{actual:70},  referralAttachRate:{actual:0},    avgDaysToAward:{actual:0},     pendingReferrals:{actual:11} },
  // Wk 7: 2026-07-13
  { referralsEntered:{actual:9},  referralsAwarded:{actual:1},  totalSales:{actual:72},  referralAttachRate:{actual:1.4}, avgDaysToAward:{actual:21.84}, pendingReferrals:{actual:19} },
  // Wk 8: 2026-07-20
  { referralsEntered:{actual:11}, referralsAwarded:{actual:1},  totalSales:{actual:75},  referralAttachRate:{actual:1.3}, avgDaysToAward:{actual:18.5},  pendingReferrals:{actual:29} },
  // Wk 9: 2026-07-27
  { referralsEntered:{actual:14}, referralsAwarded:{actual:1},  totalSales:{actual:78},  referralAttachRate:{actual:1.3}, avgDaysToAward:{actual:16.2},  pendingReferrals:{actual:42} },
  // Wk 10: 2026-08-03
  { referralsEntered:{actual:18}, referralsAwarded:{actual:0},  totalSales:{actual:80},  referralAttachRate:{actual:0},   avgDaysToAward:{actual:0},     pendingReferrals:{actual:60} },
  // Wk 11: 2026-08-10
  { referralsEntered:{actual:22}, referralsAwarded:{actual:0},  totalSales:{actual:82},  referralAttachRate:{actual:0},   avgDaysToAward:{actual:0},     pendingReferrals:{actual:82} },
  // Wk 12: 2026-08-17
  { referralsEntered:{actual:28}, referralsAwarded:{actual:0},  totalSales:{actual:84},  referralAttachRate:{actual:0},   avgDaysToAward:{actual:0},     pendingReferrals:{actual:110}},
  // Wk 13: 2026-08-24
  { referralsEntered:{actual:33}, referralsAwarded:{actual:0},  totalSales:{actual:85},  referralAttachRate:{actual:0},   avgDaysToAward:{actual:0},     pendingReferrals:{actual:143}},
  // Wk 14: 2026-08-31
  { referralsEntered:{actual:38}, referralsAwarded:{actual:1},  totalSales:{actual:85},  referralAttachRate:{actual:1.2}, avgDaysToAward:{actual:8.0},   pendingReferrals:{actual:180}},
  // Wk 15: 2026-09-07
  { referralsEntered:{actual:40}, referralsAwarded:{actual:1},  totalSales:{actual:86},  referralAttachRate:{actual:1.2}, avgDaysToAward:{actual:6.5},   pendingReferrals:{actual:219}},
  // Wk 16: 2026-09-14
  { referralsEntered:{actual:39}, referralsAwarded:{actual:1},  totalSales:{actual:87},  referralAttachRate:{actual:1.1}, avgDaysToAward:{actual:5.2},   pendingReferrals:{actual:257}},
  // Wk 17: 2026-09-21 = Week 28 actuals
  { referralsEntered:{actual:41}, referralsAwarded:{actual:2},  totalSales:{actual:86},  referralAttachRate:{actual:2},   avgDaysToAward:{actual:4},     pendingReferrals:{actual:68} },
  // Wk 18: 2026-09-28 = Week 29 actuals
  { referralsEntered:{actual:14}, referralsAwarded:{actual:47}, totalSales:{actual:134}, referralAttachRate:{actual:35},  avgDaysToAward:{actual:0.04},  pendingReferrals:{actual:73} },
];

export const REFERRAL_KPI_DATA: ReferralWeekData[] = RAW.map((row, i) => ({
  weekStart: REFERRAL_WEEKS[i].weekStart,
  ...row,
}));

export const REFERRAL_METRIC_DEFINITIONS = [
  { key: "referralsEntered",    label: "Referrals Entered",       group: "Referral", unit: "#",   definition: "Total referral codes entered by customers during booking in the given week (Mon–Sun)." },
  { key: "referralsAwarded",    label: "Referrals Awarded",       group: "Referral", unit: "#",   definition: "Number of referral codes that were validated and awarded, i.e. a sale completed with the referral code attached." },
  { key: "totalSales",          label: "Total Sales / Deliveries",group: "Sales",    unit: "#",   definition: "Total bikes sold and delivered across M-Kopa, Greenwheels, and Retail channels." },
  { key: "referralAttachRate",  label: "Referral Attach Rate",    group: "Referral", unit: "%",   definition: "Percentage of the week's sales that had a valid referral code attached: referral sales ÷ total sales × 100." },
  { key: "avgDaysToAward",      label: "Avg Days to Award",       group: "Referral", unit: "days",definition: "Average calendar days between a referral code being entered in the system and the corresponding referral award being issued." },
  { key: "pendingReferrals",    label: "Pending Referrals",       group: "Referral", unit: "#",   definition: "Count of referral codes that are in a pending state as of Sunday 23:59 of that week. Entered but not yet awarded or rejected." },
];
