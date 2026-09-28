import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomerStatus = "free" | "active" | "inactive" | "no_account" | "invalid" | "pre_order" | "pre_offer" | "zeno_paid";
export type CustomerType = "retail" | "partner";
export type OnboardingSource = "customer_app" | "website" | "onboarding_app" | "dashboard";
export type AcquisitionSource = "scanner_app" | "referral" | "walk_in" | "partner_direct" | "online";

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  nationalId: string;
  customerType: CustomerType;
  partner: string;
  vehicleId?: string;
  preOrderDate?: string;
  activationDate?: string;
  referralCode: string;
  referredBy?: string;
  referralCodeUsed?: string;
  source: AcquisitionSource;
  onboardingSource: OnboardingSource;
  status: CustomerStatus;
  region: "nbo" | "nanyuki" | "naromoru" | "nyeri";
  totalSwaps?: number;
  totalKwhConsumed?: number;
  outstandingBalanceKES?: number;
  promoPointsAllocated: number;
  referralPointsBalance: number;
  promoEverAllocated: boolean;
  isDeleted?: boolean;
  rfidDisabled?: boolean;
  createdAt: string;
}

function nextId(customers: Customer[]): string {
  const nums = customers.map((c) => parseInt(c.id.replace("CX-", ""), 10)).filter(Boolean);
  return `CX-${Math.max(...nums, 1035) + 1}`;
}

const MOCK_CUSTOMERS: Customer[] = [
  // Active / Zeno Paid: NBO, watu (partner)
  { id: "CX-1001", name: "Nickson Mwiti",      phone: "254-716195164", nationalId: "32847561", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J001988", activationDate: "2026-07-21", referralCode: "ZNO-MW001", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nbo",      totalSwaps: 142, totalKwhConsumed: 273,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2026-07-19" },
  { id: "CX-1002", name: "Fredrick Ochieng",   phone: "254-722135002", nationalId: "30912847", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J001905", activationDate: "2026-07-20", referralCode: "ZNO-OC002", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nbo",      totalSwaps: 388, totalKwhConsumed: 745,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2026-07-18" },
  { id: "CX-1003", name: "Erick Nganda",       phone: "254-792913491", nationalId: "33412509", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J001934", activationDate: "2026-07-20", referralCode: "ZNO-NG003", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nbo",      totalSwaps: 521, totalKwhConsumed: 1001, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-07-18" },
  { id: "CX-1004", name: "Augustine Mbevi",    phone: "254-795645403", nationalId: "28765430", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSEB1J001616", activationDate: "2026-07-22", referralCode: "ZNO-MB004", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nbo",      totalSwaps: 477, totalKwhConsumed: 916,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-07-20" },
  { id: "CX-1005", name: "Zechariah Anita",    phone: "254-118831352", nationalId: "29304817", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J001942", activationDate: "2026-07-20", referralCode: "ZNO-AN005", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nbo",      totalSwaps: 643, totalKwhConsumed: 1235, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-07-18" },
  { id: "CX-1006", name: "Moses Mwangi",       phone: "254-748679190", nationalId: "31928475", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J001938", activationDate: "2026-07-21", referralCode: "ZNO-MW006", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nbo",      totalSwaps: 655, totalKwhConsumed: 1258, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2026-07-19" },
  { id: "CX-1007", name: "Vincent King'oo",    phone: "254-798793747", nationalId: "34019283", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSEB1J001423", activationDate: "2026-07-23", referralCode: "ZNO-KG007", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nbo",      totalSwaps: 252, totalKwhConsumed: 484,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-07-21" },
  { id: "CX-1008", name: "James Ng'ang'a",     phone: "254-714542787", nationalId: "27634918", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSEB1J001547", activationDate: "2026-07-23", referralCode: "ZNO-NG008", onboardingSource: "dashboard",      source: "walk_in",        status: "active",     region: "nbo",      totalSwaps: 89,  totalKwhConsumed: 171,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-07-21" },
  { id: "CX-1009", name: "Muvunyi Jean",       phone: "254-759566854", nationalId: "36012847", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSEB1J001526", activationDate: "2026-07-23", referralCode: "ZNO-JN009", onboardingSource: "onboarding_app", source: "partner_direct", status: "active",     region: "nbo",      totalSwaps: 90,  totalKwhConsumed: 173,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2026-07-21" },
  { id: "CX-1010", name: "Patrick Kamau",      phone: "254-712345678", nationalId: "30123456", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J001998", activationDate: "2026-06-15", referralCode: "ZNO-KM010", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nbo",      totalSwaps: 312, totalKwhConsumed: 599,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-06-13" },
  { id: "CX-1011", name: "Diana Wanjiku",      phone: "254-733456789", nationalId: "28934567", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSFB1J002003", activationDate: "2026-05-10", referralCode: "ZNO-WJ011", onboardingSource: "dashboard",      source: "walk_in",        status: "zeno_paid",  region: "nbo",      totalSwaps: 498, totalKwhConsumed: 957,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-05-08" },
  { id: "CX-1012", name: "Samuel Odhiambo",    phone: "254-754567890", nationalId: "31245678", customerType: "partner", partner: "watu",    vehicleId: "ME92ZPSEB1J002010", activationDate: "2026-04-02", referralCode: "ZNO-OD012", referredBy: "CX-1004", referralCodeUsed: "ZNO-MB004", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nbo",      totalSwaps: 623, totalKwhConsumed: 1197, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-03-31" },
  // Active: NBO, mkopa (partner)
  { id: "CX-1013", name: "Grace Akinyi",       phone: "254-701234567", nationalId: "29567891", customerType: "partner", partner: "mkopa",   vehicleId: "ME92ZPSFB1J002021", activationDate: "2026-03-14", referralCode: "ZNO-AK013", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nbo",      totalSwaps: 712, totalKwhConsumed: 1368, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-03-12" },
  { id: "CX-1014", name: "Brian Mutua",        phone: "254-722345678", nationalId: "32678901", customerType: "partner", partner: "mkopa",   vehicleId: "ME92ZPSFB1J002028", activationDate: "2026-02-28", referralCode: "ZNO-MT014", onboardingSource: "dashboard",      source: "walk_in",        status: "zeno_paid",  region: "nbo",      totalSwaps: 789, totalKwhConsumed: 1516, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-02-26" },
  { id: "CX-1015", name: "Faith Chebet",       phone: "254-743678901", nationalId: "33789012", customerType: "partner", partner: "mkopa",   vehicleId: "ME92ZPSEB1J002033", activationDate: "2026-01-20", referralCode: "ZNO-CB015", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nbo",      totalSwaps: 801, totalKwhConsumed: 1539, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-01-18" },
  { id: "CX-1016", name: "Joseph Kariuki",     phone: "254-764789012", nationalId: "27890123", customerType: "partner", partner: "mkopa",   vehicleId: "ME92ZPSFB1J002039", activationDate: "2025-11-05", referralCode: "ZNO-KR016", referredBy: "CX-1015", referralCodeUsed: "ZNO-CB015", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nbo",      totalSwaps: 588, totalKwhConsumed: 1130, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-11-03" },
  { id: "CX-1017", name: "Anne Njeri",         phone: "254-785890123", nationalId: "35901234", customerType: "partner", partner: "mkopa",   vehicleId: "ME92ZPSEB1J002045", activationDate: "2025-09-18", referralCode: "ZNO-NJ017", onboardingSource: "dashboard",      source: "walk_in",        status: "zeno_paid",  region: "nbo",      totalSwaps: 421, totalKwhConsumed: 809,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-09-16" },
  // Active: Nanyuki, gw (partner)
  { id: "CX-1018", name: "Peter Nderitu",      phone: "254-711901234", nationalId: "30012345", customerType: "partner", partner: "gw",      vehicleId: "ME92ZPSFB1J002051", activationDate: "2026-06-01", referralCode: "ZNO-ND018", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nanyuki",  totalSwaps: 265, totalKwhConsumed: 509,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-05-30" },
  { id: "CX-1019", name: "Mary Wambui",        phone: "254-732012345", nationalId: "28123456", customerType: "partner", partner: "gw",      vehicleId: "ME92ZPSEB1J002058", activationDate: "2026-05-14", referralCode: "ZNO-WB019", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nanyuki",  totalSwaps: 347, totalKwhConsumed: 667,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-05-12" },
  { id: "CX-1020", name: "John Njoroge",       phone: "254-753123456", nationalId: "31234567", customerType: "partner", partner: "gw",      vehicleId: "ME92ZPSFB1J002063", activationDate: "2026-04-22", referralCode: "ZNO-NR020", referralCodeUsed: "ZNO-KG007", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "nanyuki",  totalSwaps: 412, totalKwhConsumed: 791,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-04-20" },
  { id: "CX-1021", name: "Rose Wanjiru",       phone: "254-774234567", nationalId: "34345678", customerType: "partner", partner: "gw",      vehicleId: "ME92ZPSEB1J002069", activationDate: "2025-12-10", referralCode: "ZNO-WR021", onboardingSource: "dashboard",      source: "walk_in",        status: "zeno_paid",  region: "nanyuki",  totalSwaps: 630, totalKwhConsumed: 1210, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-12-08" },
  { id: "CX-1022", name: "David Maina",        phone: "254-795345678", nationalId: "29456789", customerType: "partner", partner: "gw",      vehicleId: "ME92ZPSFB1J002074", activationDate: "2025-10-03", referralCode: "ZNO-MA022", onboardingSource: "onboarding_app", source: "scanner_app",    status: "zeno_paid",  region: "nanyuki",  totalSwaps: 562, totalKwhConsumed: 1080, outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-10-01" },
  // Active: Nyeri, captive / 4g (partner)
  { id: "CX-1023", name: "Lucy Waithera",      phone: "254-716456789", nationalId: "32567890", customerType: "partner", partner: "captive", vehicleId: "ME92ZPSFB1J002080", activationDate: "2026-03-08", referralCode: "ZNO-WT023", onboardingSource: "onboarding_app", source: "partner_direct", status: "zeno_paid",  region: "nyeri",    totalSwaps: 318, totalKwhConsumed: 611,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2026-03-06" },
  { id: "CX-1024", name: "Michael Kimani",     phone: "254-737567890", nationalId: "27678901", customerType: "partner", partner: "captive", vehicleId: "ME92ZPSEB1J002086", activationDate: "2026-01-15", referralCode: "ZNO-KI024", onboardingSource: "website",        source: "online",         status: "zeno_paid",  region: "nyeri",    totalSwaps: 484, totalKwhConsumed: 930,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2026-01-13" },
  { id: "CX-1025", name: "Agnes Nyambura",     phone: "254-758678901", nationalId: "33789012", customerType: "partner", partner: "4g",      vehicleId: "ME92ZPSFB1J002091", activationDate: "2025-11-22", referralCode: "ZNO-NY025", onboardingSource: "customer_app",   source: "referral",       status: "zeno_paid",  region: "naromoru", totalSwaps: 395, totalKwhConsumed: 759,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-11-20" },
  // Inactive (partner)
  { id: "CX-1026", name: "Paul Omondi",        phone: "254-779789012", nationalId: "30890123", customerType: "partner", partner: "mkopa",                                   activationDate: "2025-08-10", referralCode: "ZNO-OM026", onboardingSource: "dashboard",      source: "walk_in",        status: "inactive",   region: "nbo",      totalSwaps: 120, totalKwhConsumed: 230,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-08-08" },
  { id: "CX-1027", name: "Hannah Atieno",      phone: "254-700890123", nationalId: "36901234", customerType: "partner", partner: "gw",                                      activationDate: "2025-07-01", referralCode: "ZNO-AT027", onboardingSource: "onboarding_app", source: "scanner_app",    status: "inactive",   region: "nanyuki",  totalSwaps: 87,  totalKwhConsumed: 167,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 1000, promoEverAllocated: false, createdAt: "2025-06-29" },
  { id: "CX-1028", name: "Charles Njuguna",    phone: "254-721901234", nationalId: "28012345", customerType: "partner", partner: "4g",                                      activationDate: "2025-06-15", referralCode: "ZNO-NJ028", onboardingSource: "customer_app",   source: "referral",       status: "inactive",   region: "nanyuki",  totalSwaps: 54,  totalKwhConsumed: 104,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-06-13" },
  { id: "CX-1029", name: "Esther Mumbi",       phone: "254-742012345", nationalId: "31123456", customerType: "partner", partner: "watu",                                    activationDate: "2025-05-20", referralCode: "ZNO-MB029", onboardingSource: "dashboard",      source: "walk_in",        status: "inactive",   region: "nyeri",    totalSwaps: 201, totalKwhConsumed: 386,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-05-18" },
  // No account (were "defaulted")
  { id: "CX-1030", name: "George Onyango",     phone: "254-763123456", nationalId: "34234567", customerType: "partner", partner: "mkopa",   vehicleId: "ME92ZPSFB1J002101", activationDate: "2025-04-10", referralCode: "ZNO-ON030", onboardingSource: "onboarding_app", source: "scanner_app",    status: "no_account", region: "nbo",      totalSwaps: 156, totalKwhConsumed: 300,  outstandingBalanceKES: 4500, promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-04-08" },
  { id: "CX-1031", name: "Mercy Wangari",      phone: "254-784234567", nationalId: "29345678", customerType: "partner", partner: "gw",      vehicleId: "ME92ZPSEB1J002107", activationDate: "2025-03-22", referralCode: "ZNO-WG031", onboardingSource: "customer_app",   source: "referral",       status: "no_account", region: "nanyuki",  totalSwaps: 89,  totalKwhConsumed: 171,  outstandingBalanceKES: 2800, promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-03-20" },
  { id: "CX-1032", name: "Isaac Kiprotich",    phone: "254-705345678", nationalId: "32456789", customerType: "partner", partner: "captive", vehicleId: "ME92ZPSFB1J002113", activationDate: "2025-02-08", referralCode: "ZNO-KP032", onboardingSource: "onboarding_app", source: "partner_direct", status: "no_account", region: "nyeri",    totalSwaps: 310, totalKwhConsumed: 595,  outstandingBalanceKES: 7200, promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-02-06" },
  { id: "CX-1033", name: "Beatrice Ndunge",    phone: "254-726456789", nationalId: "27567890", customerType: "partner", partner: "4g",      vehicleId: "ME92ZPSEB1J002119", activationDate: "2025-01-14", referralCode: "ZNO-ND033", onboardingSource: "website",        source: "online",         status: "no_account", region: "naromoru", totalSwaps: 198, totalKwhConsumed: 380,  outstandingBalanceKES: 5600, promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-01-12" },
  { id: "CX-1034", name: "Robert Aloo",        phone: "254-747567890", nationalId: "35678901", customerType: "partner", partner: "mkopa",                                   activationDate: "2025-01-05", referralCode: "ZNO-AL034", onboardingSource: "dashboard",      source: "walk_in",        status: "inactive",   region: "nbo",      totalSwaps: 420, totalKwhConsumed: 807,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-01-03" },
  { id: "CX-1035", name: "Stella Makena",      phone: "254-768678901", nationalId: "30789012", customerType: "partner", partner: "gw",                                      activationDate: "2025-02-20", referralCode: "ZNO-MK035", onboardingSource: "onboarding_app", source: "scanner_app",    status: "inactive",   region: "nanyuki",  totalSwaps: 290, totalKwhConsumed: 557,  outstandingBalanceKES: 0,    promoPointsAllocated: 0,    referralPointsBalance: 0,    promoEverAllocated: false, createdAt: "2025-02-18" },
  // Retail customers (new)
  { id: "CX-1036", name: "Kevin Otieno",       phone: "254-711223344", nationalId: "38001234", customerType: "retail",  partner: "",                                        referralCode: "ZNO-OT036", onboardingSource: "customer_app",   source: "online",         status: "pre_order",  region: "nbo",      promoPointsAllocated: 5000, referralPointsBalance: 0,    promoEverAllocated: true,  createdAt: "2026-08-01", preOrderDate: "2026-08-01" },
  { id: "CX-1037", name: "Lydia Kamau",        phone: "254-722334455", nationalId: "37112345", customerType: "retail",  partner: "",                                        referralCode: "ZNO-KM037", onboardingSource: "website",        source: "online",         status: "pre_order",  region: "nbo",      promoPointsAllocated: 5000, referralPointsBalance: 0,    promoEverAllocated: true,  createdAt: "2026-08-03", preOrderDate: "2026-08-03" },
  { id: "CX-1038", name: "Dennis Mutahi",      phone: "254-733445566", nationalId: "36223456", customerType: "retail",  partner: "",                                        referralCode: "ZNO-MH038", onboardingSource: "customer_app",   source: "referral",       status: "pre_offer",  region: "nanyuki",  promoPointsAllocated: 5000, referralPointsBalance: 1000, promoEverAllocated: true,  createdAt: "2026-07-28", referralCodeUsed: "ZNO-ND018" },
  { id: "CX-1039", name: "Caroline Njoki",     phone: "254-744556677", nationalId: "39334567", customerType: "retail",  partner: "",        vehicleId: "ME92ZPSFB1J003001", activationDate: "2026-07-15", referralCode: "ZNO-NJ039", onboardingSource: "dashboard",      source: "walk_in",        status: "active",     region: "nyeri",    totalSwaps: 12,  totalKwhConsumed: 23,   outstandingBalanceKES: 0,    promoPointsAllocated: 5000, referralPointsBalance: 0,    promoEverAllocated: true,  createdAt: "2026-07-13" },
];

type CustomerFormData = Omit<Customer, "id" | "createdAt" | "referralCode">;

interface CustomersState {
  customers: Customer[];
  addCustomer: (data: CustomerFormData) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deactivateCustomer: (id: string) => void;
  restoreCustomer: (id: string) => void;
  softDeleteCustomer: (id: string) => void;
  hardDeleteCustomer: (id: string) => void;
}

export const useCustomersStore = create<CustomersState>()(
  persist(
    (set, get) => ({
      customers: MOCK_CUSTOMERS,

      addCustomer: (data) => {
        const customers = get().customers;
        const id = nextId(customers);
        const initials = data.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);
        const referralCode = `ZNO-${initials}${id.replace("CX-", "")}`;
        set((s) => ({
          customers: [...s.customers, {
            ...data,
            id,
            referralCode,
            createdAt: new Date().toISOString().slice(0, 10),
          }],
        }));
      },

      updateCustomer: (id, patch) => {
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      deactivateCustomer: (id) => {
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, status: "inactive" } : c)),
        }));
      },

      restoreCustomer: (id) => {
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, status: "active" } : c)),
        }));
      },

      softDeleteCustomer: (id) => {
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, isDeleted: true, status: "inactive" } : c)),
        }));
      },

      hardDeleteCustomer: (id) => {
        set((s) => ({
          customers: s.customers.filter((c) => c.id !== id),
        }));
      },
    }),
    {
      name: "zeno-customers",
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          // Reset to fresh mock data on schema change
          return { customers: MOCK_CUSTOMERS };
        }
        return persisted as CustomersState;
      },
    }
  )
);
