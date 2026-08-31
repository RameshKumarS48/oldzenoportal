import { addWeeks, format } from "date-fns";

export interface WalletWeekData {
  weekStart: string;
  pointsIssued: { actual: number };
  pointsRedeemed: { actual: number };
  walletLiabilityKES: { actual: number };
  avgWalletBalance: { actual: number };
  customersZeroBalance: { actual: number };
  pctZeroBalance: { actual: number };
  joinBonusPoints: { actual: number };
  referralEarnedPoints: { actual: number };
  rechargePoints: { actual: number };
  rechargeValueKES: { actual: number };
  rechargeTransactions: { actual: number };
  avgRechargeValueKES: { actual: number };
  rechargeMpesaKES: { actual: number };
  rechargeCardKES: { actual: number };
  rechargeBankKES: { actual: number };
  referralConversionRate: { actual: number };
  activeReferrers: { actual: number };
  referralJoiners: { actual: number };
  organicJoiners: { actual: number };
}

export const WALLET_WEEKS = Array.from({ length: 18 }, (_, i) => {
  const date = addWeeks(new Date("2026-06-01"), i);
  return { weekStart: format(date, "yyyy-MM-dd"), label: format(date, "d-MMM-yy") };
});

// Running liability accumulator
let liability = 0;

const RAW: Array<Omit<WalletWeekData, "weekStart" | "walletLiabilityKES">> = [
  // wk1: 820 customers, launch week – big join bonus, low referral
  { pointsIssued:{actual:48200}, pointsRedeemed:{actual:29800}, avgWalletBalance:{actual:98},  customersZeroBalance:{actual:41},  pctZeroBalance:{actual:5.0}, joinBonusPoints:{actual:15000}, referralEarnedPoints:{actual:0},    rechargePoints:{actual:33200}, rechargeValueKES:{actual:25400}, rechargeTransactions:{actual:38}, avgRechargeValueKES:{actual:668}, rechargeMpesaKES:{actual:16510}, rechargeCardKES:{actual:7112},  rechargeBankKES:{actual:1778}, referralConversionRate:{actual:12.0}, activeReferrers:{actual:5},  referralJoiners:{actual:2},  organicJoiners:{actual:10} },
  // wk2
  { pointsIssued:{actual:50100}, pointsRedeemed:{actual:31200}, avgWalletBalance:{actual:112}, customersZeroBalance:{actual:46},  pctZeroBalance:{actual:5.4}, joinBonusPoints:{actual:14000}, referralEarnedPoints:{actual:400},  rechargePoints:{actual:35700}, rechargeValueKES:{actual:27200}, rechargeTransactions:{actual:40}, avgRechargeValueKES:{actual:680}, rechargeMpesaKES:{actual:17408}, rechargeCardKES:{actual:7616},  rechargeBankKES:{actual:2176}, referralConversionRate:{actual:14.0}, activeReferrers:{actual:8},  referralJoiners:{actual:3},  organicJoiners:{actual:11} },
  // wk3
  { pointsIssued:{actual:51800}, pointsRedeemed:{actual:32600}, avgWalletBalance:{actual:127}, customersZeroBalance:{actual:50},  pctZeroBalance:{actual:5.7}, joinBonusPoints:{actual:13000}, referralEarnedPoints:{actual:800},  rechargePoints:{actual:38000}, rechargeValueKES:{actual:28900}, rechargeTransactions:{actual:42}, avgRechargeValueKES:{actual:688}, rechargeMpesaKES:{actual:18677}, rechargeCardKES:{actual:8092},  rechargeBankKES:{actual:2131}, referralConversionRate:{actual:16.0}, activeReferrers:{actual:10}, referralJoiners:{actual:4},  organicJoiners:{actual:10} },
  // wk4
  { pointsIssued:{actual:53200}, pointsRedeemed:{actual:34100}, avgWalletBalance:{actual:140}, customersZeroBalance:{actual:54},  pctZeroBalance:{actual:6.0}, joinBonusPoints:{actual:12000}, referralEarnedPoints:{actual:1200}, rechargePoints:{actual:40000}, rechargeValueKES:{actual:30600}, rechargeTransactions:{actual:44}, avgRechargeValueKES:{actual:695}, rechargeMpesaKES:{actual:20196}, rechargeCardKES:{actual:8262},  rechargeBankKES:{actual:2142}, referralConversionRate:{actual:17.5}, activeReferrers:{actual:12}, referralJoiners:{actual:5},  organicJoiners:{actual:10} },
  // wk5
  { pointsIssued:{actual:54600}, pointsRedeemed:{actual:35500}, avgWalletBalance:{actual:152}, customersZeroBalance:{actual:59},  pctZeroBalance:{actual:6.3}, joinBonusPoints:{actual:11000}, referralEarnedPoints:{actual:1800}, rechargePoints:{actual:41800}, rechargeValueKES:{actual:31800}, rechargeTransactions:{actual:46}, avgRechargeValueKES:{actual:691}, rechargeMpesaKES:{actual:20670}, rechargeCardKES:{actual:9222},  rechargeBankKES:{actual:1908}, referralConversionRate:{actual:19.0}, activeReferrers:{actual:15}, referralJoiners:{actual:6},  organicJoiners:{actual:10} },
  // wk6
  { pointsIssued:{actual:55900}, pointsRedeemed:{actual:36800}, avgWalletBalance:{actual:163}, customersZeroBalance:{actual:63},  pctZeroBalance:{actual:6.6}, joinBonusPoints:{actual:10500}, referralEarnedPoints:{actual:2400}, rechargePoints:{actual:43000}, rechargeValueKES:{actual:32800}, rechargeTransactions:{actual:48}, avgRechargeValueKES:{actual:683}, rechargeMpesaKES:{actual:22144}, rechargeCardKES:{actual:8528},  rechargeBankKES:{actual:2128}, referralConversionRate:{actual:21.0}, activeReferrers:{actual:18}, referralJoiners:{actual:7},  organicJoiners:{actual:9} },
  // wk7
  { pointsIssued:{actual:57100}, pointsRedeemed:{actual:38200}, avgWalletBalance:{actual:174}, customersZeroBalance:{actual:68},  pctZeroBalance:{actual:6.9}, joinBonusPoints:{actual:10000}, referralEarnedPoints:{actual:3000}, rechargePoints:{actual:44100}, rechargeValueKES:{actual:33700}, rechargeTransactions:{actual:50}, avgRechargeValueKES:{actual:674}, rechargeMpesaKES:{actual:22442}, rechargeCardKES:{actual:9676},  rechargeBankKES:{actual:1582}, referralConversionRate:{actual:23.0}, activeReferrers:{actual:21}, referralJoiners:{actual:8},  organicJoiners:{actual:9} },
  // wk8
  { pointsIssued:{actual:58400}, pointsRedeemed:{actual:39600}, avgWalletBalance:{actual:186}, customersZeroBalance:{actual:72},  pctZeroBalance:{actual:7.2}, joinBonusPoints:{actual:9500},  referralEarnedPoints:{actual:3800}, rechargePoints:{actual:45100}, rechargeValueKES:{actual:34500}, rechargeTransactions:{actual:51}, avgRechargeValueKES:{actual:676}, rechargeMpesaKES:{actual:23805}, rechargeCardKES:{actual:8625},  rechargeBankKES:{actual:2070}, referralConversionRate:{actual:25.0}, activeReferrers:{actual:24}, referralJoiners:{actual:9},  organicJoiners:{actual:9} },
  // wk9
  { pointsIssued:{actual:59600}, pointsRedeemed:{actual:40900}, avgWalletBalance:{actual:198}, customersZeroBalance:{actual:76},  pctZeroBalance:{actual:7.5}, joinBonusPoints:{actual:9000},  referralEarnedPoints:{actual:4600}, rechargePoints:{actual:46000}, rechargeValueKES:{actual:35200}, rechargeTransactions:{actual:52}, avgRechargeValueKES:{actual:677}, rechargeMpesaKES:{actual:23584}, rechargeCardKES:{actual:9856},  rechargeBankKES:{actual:1760}, referralConversionRate:{actual:27.0}, activeReferrers:{actual:27}, referralJoiners:{actual:10}, organicJoiners:{actual:9} },
  // wk10
  { pointsIssued:{actual:60700}, pointsRedeemed:{actual:42100}, avgWalletBalance:{actual:210}, customersZeroBalance:{actual:81},  pctZeroBalance:{actual:7.9}, joinBonusPoints:{actual:8500},  referralEarnedPoints:{actual:5400}, rechargePoints:{actual:46800}, rechargeValueKES:{actual:35900}, rechargeTransactions:{actual:54}, avgRechargeValueKES:{actual:665}, rechargeMpesaKES:{actual:24852}, rechargeCardKES:{actual:8975},  rechargeBankKES:{actual:2073}, referralConversionRate:{actual:28.5}, activeReferrers:{actual:30}, referralJoiners:{actual:11}, organicJoiners:{actual:9} },
  // wk11
  { pointsIssued:{actual:61800}, pointsRedeemed:{actual:43400}, avgWalletBalance:{actual:222}, customersZeroBalance:{actual:87},  pctZeroBalance:{actual:8.3}, joinBonusPoints:{actual:8000},  referralEarnedPoints:{actual:6200}, rechargePoints:{actual:47600}, rechargeValueKES:{actual:36700}, rechargeTransactions:{actual:55}, avgRechargeValueKES:{actual:667}, rechargeMpesaKES:{actual:25483}, rechargeCardKES:{actual:9175},  rechargeBankKES:{actual:2042}, referralConversionRate:{actual:30.0}, activeReferrers:{actual:33}, referralJoiners:{actual:12}, organicJoiners:{actual:9} },
  // wk12
  { pointsIssued:{actual:62800}, pointsRedeemed:{actual:44500}, avgWalletBalance:{actual:234}, customersZeroBalance:{actual:93},  pctZeroBalance:{actual:8.7}, joinBonusPoints:{actual:7500},  referralEarnedPoints:{actual:7000}, rechargePoints:{actual:48300}, rechargeValueKES:{actual:37200}, rechargeTransactions:{actual:56}, avgRechargeValueKES:{actual:664}, rechargeMpesaKES:{actual:25644}, rechargeCardKES:{actual:9672},  rechargeBankKES:{actual:1884}, referralConversionRate:{actual:31.5}, activeReferrers:{actual:36}, referralJoiners:{actual:13}, organicJoiners:{actual:9} },
  // wk13
  { pointsIssued:{actual:63700}, pointsRedeemed:{actual:45500}, avgWalletBalance:{actual:245}, customersZeroBalance:{actual:98},  pctZeroBalance:{actual:9.0}, joinBonusPoints:{actual:7000},  referralEarnedPoints:{actual:7800}, rechargePoints:{actual:48900}, rechargeValueKES:{actual:37800}, rechargeTransactions:{actual:57}, avgRechargeValueKES:{actual:663}, rechargeMpesaKES:{actual:26082}, rechargeCardKES:{actual:9828},  rechargeBankKES:{actual:1890}, referralConversionRate:{actual:33.0}, activeReferrers:{actual:38}, referralJoiners:{actual:14}, organicJoiners:{actual:8} },
  // wk14
  { pointsIssued:{actual:64500}, pointsRedeemed:{actual:46400}, avgWalletBalance:{actual:256}, customersZeroBalance:{actual:104}, pctZeroBalance:{actual:9.4}, joinBonusPoints:{actual:6500},  referralEarnedPoints:{actual:8600}, rechargePoints:{actual:49400}, rechargeValueKES:{actual:38200}, rechargeTransactions:{actual:58}, avgRechargeValueKES:{actual:659}, rechargeMpesaKES:{actual:27082}, rechargeCardKES:{actual:9742},  rechargeBankKES:{actual:1376}, referralConversionRate:{actual:34.5}, activeReferrers:{actual:40}, referralJoiners:{actual:15}, organicJoiners:{actual:8} },
  // wk15
  { pointsIssued:{actual:65100}, pointsRedeemed:{actual:47200}, avgWalletBalance:{actual:267}, customersZeroBalance:{actual:109}, pctZeroBalance:{actual:9.7}, joinBonusPoints:{actual:6000},  referralEarnedPoints:{actual:9200}, rechargePoints:{actual:49900}, rechargeValueKES:{actual:38800}, rechargeTransactions:{actual:59}, avgRechargeValueKES:{actual:658}, rechargeMpesaKES:{actual:27936}, rechargeCardKES:{actual:9312},  rechargeBankKES:{actual:1552}, referralConversionRate:{actual:36.0}, activeReferrers:{actual:42}, referralJoiners:{actual:16}, organicJoiners:{actual:8} },
  // wk16
  { pointsIssued:{actual:65400}, pointsRedeemed:{actual:47900}, avgWalletBalance:{actual:278}, customersZeroBalance:{actual:113}, pctZeroBalance:{actual:10.0},joinBonusPoints:{actual:5500},  referralEarnedPoints:{actual:9600}, rechargePoints:{actual:50300}, rechargeValueKES:{actual:39200}, rechargeTransactions:{actual:60}, avgRechargeValueKES:{actual:653}, rechargeMpesaKES:{actual:28184}, rechargeCardKES:{actual:9408},  rechargeBankKES:{actual:1608}, referralConversionRate:{actual:37.0}, activeReferrers:{actual:43}, referralJoiners:{actual:17}, organicJoiners:{actual:8} },
  // wk17
  { pointsIssued:{actual:65600}, pointsRedeemed:{actual:48400}, avgWalletBalance:{actual:289}, customersZeroBalance:{actual:116}, pctZeroBalance:{actual:10.4},joinBonusPoints:{actual:5200},  referralEarnedPoints:{actual:9800}, rechargePoints:{actual:50600}, rechargeValueKES:{actual:39600}, rechargeTransactions:{actual:61}, avgRechargeValueKES:{actual:649}, rechargeMpesaKES:{actual:28416}, rechargeCardKES:{actual:9900},  rechargeBankKES:{actual:1284}, referralConversionRate:{actual:37.5}, activeReferrers:{actual:44}, referralJoiners:{actual:17}, organicJoiners:{actual:8} },
  // wk18
  { pointsIssued:{actual:65800}, pointsRedeemed:{actual:48800}, avgWalletBalance:{actual:300}, customersZeroBalance:{actual:119}, pctZeroBalance:{actual:11.0},joinBonusPoints:{actual:5000},  referralEarnedPoints:{actual:10000},rechargePoints:{actual:50800}, rechargeValueKES:{actual:40000}, rechargeTransactions:{actual:62}, avgRechargeValueKES:{actual:645}, rechargeMpesaKES:{actual:28800}, rechargeCardKES:{actual:10000}, rechargeBankKES:{actual:1200}, referralConversionRate:{actual:38.0}, activeReferrers:{actual:45}, referralJoiners:{actual:18}, organicJoiners:{actual:8} },
];

export const WALLET_KPI_DATA: WalletWeekData[] = RAW.map((row, i) => {
  liability += row.pointsIssued.actual - row.pointsRedeemed.actual;
  return { weekStart: WALLET_WEEKS[i].weekStart, ...row, walletLiabilityKES: { actual: liability } };
});

export const WALLET_METRIC_DEFINITIONS = [
  { key: "pointsIssued",           label: "Points Issued",                group: "Points",   unit: "pts",  definition: "Total points credited to all customer wallets this week (join bonus + referral + recharge)." },
  { key: "pointsRedeemed",         label: "Points Redeemed",              group: "Points",   unit: "pts",  definition: "Total points debited from wallets this week via swap, fast charge, or home charge sessions." },
  { key: "walletLiabilityKES",     label: "Wallet Liability (KES)",       group: "Wallet",   unit: "KES",  definition: "Cumulative unredeemed points across all wallets. 1 pt = 1 KES. Balance-sheet liability." },
  { key: "avgWalletBalance",       label: "Avg Wallet Balance",           group: "Wallet",   unit: "KES",  definition: "Average wallet balance per active customer this week." },
  { key: "customersZeroBalance",   label: "Customers at Zero Balance",    group: "Wallet",   unit: "#",    definition: "Count of customers whose wallet balance reached zero as of week end. Churn risk signal." },
  { key: "pctZeroBalance",         label: "% Customers at Zero Balance",  group: "Wallet",   unit: "%",    definition: "Percentage of all active customers with a zero balance. Alert threshold: >15%." },
  { key: "joinBonusPoints",        label: "Join Bonus Points",            group: "Points",   unit: "pts",  definition: "Points issued via join_bonus events this week (1,000 pts per new activation)." },
  { key: "referralEarnedPoints",   label: "Referral Points Earned",       group: "Referral", unit: "pts",  definition: "Points credited via referral_earned events this week (both referrer and referee)." },
  { key: "rechargePoints",         label: "Recharge Points Added",        group: "Recharge", unit: "pts",  definition: "Points added to wallets via top-up recharge events this week." },
  { key: "rechargeValueKES",       label: "Total Recharged (KES)",        group: "Recharge", unit: "KES",  definition: "Total KES recharged by all customers this week across all payment methods." },
  { key: "rechargeTransactions",   label: "Recharge Transactions",        group: "Recharge", unit: "#",    definition: "Count of recharge (top-up) transactions processed this week." },
  { key: "avgRechargeValueKES",    label: "Avg Recharge Value",           group: "Recharge", unit: "KES",  definition: "Average KES per recharge transaction. Indicator of customer willingness to fund wallet." },
  { key: "rechargeMpesaKES",       label: "M-Pesa Recharge (KES)",        group: "Recharge", unit: "KES",  definition: "KES recharged via M-Pesa this week." },
  { key: "rechargeCardKES",        label: "Card Recharge (KES)",          group: "Recharge", unit: "KES",  definition: "KES recharged via debit/credit card this week." },
  { key: "rechargeBankKES",        label: "Bank Recharge (KES)",          group: "Recharge", unit: "KES",  definition: "KES recharged via bank transfer this week." },
  { key: "referralConversionRate", label: "Referral Conversion Rate",     group: "Referral", unit: "%",    definition: "Referrals activated / codes shared this week. Target >40%." },
  { key: "activeReferrers",        label: "Active Referrers",             group: "Referral", unit: "#",    definition: "Distinct customers who made a successful referral this week." },
  { key: "referralJoiners",        label: "New Joiners via Referral",     group: "Referral", unit: "#",    definition: "New customers who signed up using a referral code this week." },
  { key: "organicJoiners",         label: "Organic New Joiners",          group: "Referral", unit: "#",    definition: "New customers who signed up without a referral code this week." },
];
