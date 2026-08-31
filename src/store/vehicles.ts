import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Vehicle {
  id: string;
  vin: string;
  customerName: string;
  customerPhone: string;
  status: "active" | "offroad" | "provisioning";
  tenant: string;
  storeCode: string;
  dateOfSale: string;
  odometer: number;
  plate: string;
  imei: string;
  connectivity: "Online" | "GpsOffline" | "Offline";
  lastConnected: string;
  immobilization: "On" | "Off";
  vcuFirmware: string;
  zeConnectFirmware: string;
  evccFirmware: string;
  partner: string;
  region: "nbo" | "nanyuki" | "naromoru" | "nyeri";
}

const MOCK_VEHICLES: Vehicle[] = [
  // --- Real records from screenshot ---
  { id: "v-001", vin: "ME92ZPSFB1J001988", customerName: "NICKSON MWITI",       customerPhone: "254-116195164", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-21", odometer: 1118, plate: "KMHB704R", imei: "860300087759307", connectivity: "Online",    lastConnected: "2026-07-29T14:27:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-002", vin: "ME92ZPSEB1J001526", customerName: "MUVUNYI JEAN",        customerPhone: "254-759566854", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-23", odometer: 150,  plate: "KMHB422W", imei: "860300087758036", connectivity: "GpsOffline", lastConnected: "2026-07-29T14:15:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-003", vin: "ME92ZPSEB1J001547", customerName: "James Ng'ang'a",      customerPhone: "254-714542787", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-23", odometer: 147,  plate: "KMHB421W", imei: "860300087760610", connectivity: "Online",    lastConnected: "2026-07-29T14:02:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-004", vin: "ME92ZPSFB1J001905", customerName: "Fredrick Ochieng",    customerPhone: "254-722135002", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-20", odometer: 454,  plate: "KMHB667R", imei: "860300087739945", connectivity: "Online",    lastConnected: "2026-07-29T13:59:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-005", vin: "ME92ZPSFB1J001934", customerName: "Erick Nganda",        customerPhone: "254-792913491", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-20", odometer: 815,  plate: "KMHB670R", imei: "860300087727924", connectivity: "Online",    lastConnected: "2026-07-29T13:59:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-006", vin: "ME92ZPSEB1J001616", customerName: "Augustine Mbevi",     customerPhone: "254-795645403", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-22", odometer: 791,  plate: "KMHB154W", imei: "860300087757509", connectivity: "Online",    lastConnected: "2026-07-29T13:56:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (168)", evccFirmware: "1.0.8 (3)",    partner: "watu",    region: "nbo" },
  { id: "v-007", vin: "ME92ZPSFB1J001942", customerName: "Zechariah Anita",     customerPhone: "254-118831352", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-20", odometer: 1067, plate: "KMHB668R", imei: "860300087750843", connectivity: "Online",    lastConnected: "2026-07-29T13:49:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-008", vin: "ME92ZPSEB1J001423", customerName: "Vincent King'oo Kau", customerPhone: "254-798793747", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-23", odometer: 418,  plate: "KMHB420W", imei: "860300087760669", connectivity: "Online",    lastConnected: "2026-07-29T13:39:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },
  { id: "v-009", vin: "ME92ZPSFB1J001938", customerName: "Moses Mwangi",        customerPhone: "254-748679190", status: "active",      tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-21", odometer: 1087, plate: "KMHB694R", imei: "860300087770882", connectivity: "Online",    lastConnected: "2026-07-29T13:39:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "watu",    region: "nbo" },

  // --- Nanyuki / mkopa ---
  { id: "v-010", vin: "ME92ZPSFB1J001872", customerName: "Peter Gitau",         customerPhone: "254-712345678", status: "active",      tenant: "wholesale/mkopa", storeCode: "ke-nan-zhq", dateOfSale: "2026-07-05", odometer: 1842, plate: "KMHB312A", imei: "860300087711234", connectivity: "Online",    lastConnected: "2026-07-29T12:10:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "mkopa",   region: "nanyuki" },
  { id: "v-011", vin: "ME92ZPSEB1J001890", customerName: "Grace Wanjiru",       customerPhone: "254-723456789", status: "active",      tenant: "wholesale/mkopa", storeCode: "ke-nan-zhq", dateOfSale: "2026-07-10", odometer: 1220, plate: "KMHB450B", imei: "860300087722345", connectivity: "Online",    lastConnected: "2026-07-29T11:55:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "mkopa",   region: "nanyuki" },
  { id: "v-012", vin: "ME92ZPSFB1J001911", customerName: "John Kamau",          customerPhone: "254-734567890", status: "active",      tenant: "wholesale/mkopa", storeCode: "ke-nan-zhq", dateOfSale: "2026-06-28", odometer: 2340, plate: "KMHB511C", imei: "860300087733456", connectivity: "GpsOffline", lastConnected: "2026-07-29T09:30:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "mkopa",   region: "nanyuki" },
  { id: "v-013", vin: "ME92ZPSEB1J001955", customerName: "Mary Nyambura",       customerPhone: "254-745678901", status: "offroad",     tenant: "wholesale/mkopa", storeCode: "ke-nan-zhq", dateOfSale: "2026-06-15", odometer: 1675, plate: "KMHB629D", imei: "860300087744567", connectivity: "Offline",   lastConnected: "2026-07-22T08:10:00Z", immobilization: "On",  vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "mkopa",   region: "nanyuki" },

  // --- Nyeri / gw ---
  { id: "v-014", vin: "ME92ZPSFB1J001866", customerName: "Samuel Muthoni",      customerPhone: "254-756789012", status: "active",      tenant: "retail/4g",       storeCode: "ke-nyr-zhq", dateOfSale: "2026-07-01", odometer: 2105, plate: "KMHB733E", imei: "860300087755678", connectivity: "Online",    lastConnected: "2026-07-29T13:00:00Z", immobilization: "Off", vcuFirmware: "2.2.4 (1)", zeConnectFirmware: "1.0.0dev1 (165)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "nyeri" },
  { id: "v-015", vin: "ME92ZPSEB1J001877", customerName: "Faith Njeri",         customerPhone: "254-767890123", status: "active",      tenant: "retail/4g",       storeCode: "ke-nyr-zhq", dateOfSale: "2026-07-08", odometer: 1430, plate: "KMHB819F", imei: "860300087766789", connectivity: "Online",    lastConnected: "2026-07-29T12:44:00Z", immobilization: "Off", vcuFirmware: "2.2.4 (1)", zeConnectFirmware: "1.0.0dev1 (165)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "nyeri" },
  { id: "v-016", vin: "ME92ZPSFB1J001921", customerName: "Daniel Kariuki",      customerPhone: "254-778901234", status: "offroad",     tenant: "retail/4g",       storeCode: "ke-nyr-zhq", dateOfSale: "2026-06-20", odometer: 900,  plate: "KMHB217G", imei: "860300087777890", connectivity: "Offline",   lastConnected: "2026-07-25T07:30:00Z", immobilization: "On",  vcuFirmware: "2.2.4 (1)", zeConnectFirmware: "1.0.0dev1 (165)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "nyeri" },
  { id: "v-017", vin: "ME92ZPSEB1J001933", customerName: "Rose Wambui",         customerPhone: "254-789012345", status: "active",      tenant: "retail/4g",       storeCode: "ke-nyr-zhq", dateOfSale: "2026-07-14", odometer: 760,  plate: "KMHB341H", imei: "860300087788901", connectivity: "Online",    lastConnected: "2026-07-29T12:20:00Z", immobilization: "Off", vcuFirmware: "2.2.4 (1)", zeConnectFirmware: "1.0.0dev1 (165)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "nyeri" },

  // --- Naro Moru / gw ---
  { id: "v-018", vin: "ME92ZPSFB1J001948", customerName: "Isaac Njoroge",       customerPhone: "254-700123456", status: "active",      tenant: "retail/4g",       storeCode: "ke-nrm-zhq", dateOfSale: "2026-07-12", odometer: 950,  plate: "KMHB488J", imei: "860300087799012", connectivity: "Online",    lastConnected: "2026-07-29T11:45:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "naromoru" },
  { id: "v-019", vin: "ME92ZPSEB1J001960", customerName: "Lucy Wairimu",        customerPhone: "254-711234567", status: "active",      tenant: "retail/4g",       storeCode: "ke-nrm-zhq", dateOfSale: "2026-07-18", odometer: 340,  plate: "KMHB562K", imei: "860300087800123", connectivity: "GpsOffline", lastConnected: "2026-07-29T10:10:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "naromoru" },
  { id: "v-020", vin: "ME92ZPSFB1J001973", customerName: "Joseph Maina",        customerPhone: "254-722345678", status: "provisioning", tenant: "retail/4g",      storeCode: "ke-nrm-zhq", dateOfSale: "2026-07-28", odometer: 50,   plate: "KMHB677L", imei: "860300087811234", connectivity: "Offline",   lastConnected: "2026-07-28T09:00:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "gw",      region: "naromoru" },

  // --- More NBO / captive / fortune ---
  { id: "v-021", vin: "ME92ZPSEB1J001985", customerName: "Diana Achieng",       customerPhone: "254-733456789", status: "active",      tenant: "retail/captive",  storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-15", odometer: 680,  plate: "KMHB720M", imei: "860300087822345", connectivity: "Online",    lastConnected: "2026-07-29T13:15:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "captive", region: "nbo" },
  { id: "v-022", vin: "ME92ZPSFB1J002001", customerName: "Brian Otieno",        customerPhone: "254-744567890", status: "active",      tenant: "retail/captive",  storeCode: "ke-nbo-zhq", dateOfSale: "2026-07-17", odometer: 510,  plate: "KMHB803N", imei: "860300087833456", connectivity: "Online",    lastConnected: "2026-07-29T13:05:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "captive", region: "nbo" },
  { id: "v-023", vin: "ME92ZPSEB1J002014", customerName: "Ann Chebet",          customerPhone: "254-755678901", status: "active",      tenant: "wholesale/mkopa", storeCode: "ke-nan-zhq", dateOfSale: "2026-06-10", odometer: 2490, plate: "KMHB134P", imei: "860300087844567", connectivity: "Online",    lastConnected: "2026-07-29T12:30:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "mkopa",   region: "nanyuki" },
  { id: "v-024", vin: "ME92ZPSFB1J002027", customerName: "Stephen Mutua",       customerPhone: "254-766789012", status: "offroad",     tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "2026-06-01", odometer: 1320, plate: "KMHB255Q", imei: "860300087855678", connectivity: "Offline",   lastConnected: "2026-07-20T16:00:00Z", immobilization: "On",  vcuFirmware: "2.2.3 (1)", zeConnectFirmware: "1.0.0dev1 (164)", evccFirmware: "1.0.5dev1 (1)", partner: "watu",    region: "nbo" },
  { id: "v-025", vin: "ME92ZPSEB1J002040", customerName: "Hellen Auma",         customerPhone: "254-777890123", status: "provisioning", tenant: "wholesale/mkopa", storeCode: "ke-nyr-zhq", dateOfSale: "2026-07-27", odometer: 60,   plate: "KMHB398R", imei: "860300087866789", connectivity: "Offline",   lastConnected: "2026-07-27T10:00:00Z", immobilization: "Off", vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (166)", evccFirmware: "1.0.6dev1 (2)", partner: "mkopa",   region: "nyeri" },
];

interface VehiclesState {
  vehicles: Vehicle[];
}

export const useVehiclesStore = create<VehiclesState>()(
  persist(
    () => ({ vehicles: MOCK_VEHICLES }),
    { name: "zeno-vehicles" }
  )
);
