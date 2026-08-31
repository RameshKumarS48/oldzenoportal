import { create } from "zustand";

export type AssetVehicle = {
  id: string;
  vin: string;
  customerName: string;
  customerPhone: string;
  status: "active" | "new" | "test" | "used";
  tenant: string;
  storeCode: string;
  dateOfSale: string;
  odometer: number;
  plate: string;
  imei: string;
  connectivity: "Online" | "Offline" | "GpsOffline" | "CloudOffline";
  lastConnected: string;
  lastLocationTime: string;
  immobilization:
    | "On"
    | "Off"
    | "ImmobilizedRequestSent"
    | "MobilizedRequestSent"
    | "ImmobilizedRequestAck"
    | "MobilizedRequestAck";
  soc: number;
  lat: number;
  long: number;
  vcuFirmware: string;
  zeConnectFirmware: string;
  evccFirmware: string;
  rfidTag?: string;
};

export type FilterState = {
  immobilization: string;
  dateOfSale: string;
  connectivity: string;
  odoFrom: number | null;
  odoTo: number | null;
  storeCode: string;
  vcu: string;
  zeConnect: string;
  evcc: string;
  status: string;
  tenant: string;
  search: string;
};

const DEFAULT_FILTERS: FilterState = {
  immobilization: "All",
  dateOfSale: "All",
  connectivity: "All",
  odoFrom: null,
  odoTo: null,
  storeCode: "All",
  vcu: "All",
  zeConnect: "All",
  evcc: "All",
  status: "All",
  tenant: "All",
  search: "",
};

const MOCK_VEHICLES: AssetVehicle[] = [
  {
    id: "1", vin: "ME92ZPSBB1J000760", customerName: "Peter Ngure", customerPhone: "254-769103069",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "07 May 2026",
    odometer: 15489, plate: "KMGY105Z", imei: "867963074737462", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:06", lastLocationTime: "01 Sep 2026 13:06",
    immobilization: "Off", soc: 83, lat: -1.245366, long: 36.913031,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "2", vin: "ME92ZPSDB1J001111", customerName: "Ian Waruiro Mukiri", customerPhone: "254-725528919",
    status: "active", tenant: "retail/cash", storeCode: "ke-nbo-zhq", dateOfSale: "03 Jun 2026",
    odometer: 4705, plate: "KMHA287J", imei: "860851086846248", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:50", lastLocationTime: "01 Sep 2026 12:50",
    immobilization: "Off", soc: 71, lat: -1.286389, long: 36.820556,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "3", vin: "ME92ZPSAB1J000542", customerName: "Gilbert M'itonga", customerPhone: "254-724148077",
    status: "active", tenant: "retail/fortune", storeCode: "ke-nbo-zhq", dateOfSale: "07 Mar 2026",
    odometer: 7461, plate: "KMGX871S", imei: "861685072590637", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:35", lastLocationTime: "01 Sep 2026 12:35",
    immobilization: "On", soc: 45, lat: -1.301, long: 36.797,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "4", vin: "ME92ZPSFA1J000112", customerName: "", customerPhone: "254-727445501",
    status: "active", tenant: "retail/4g", storeCode: "ke-nrm-zgs", dateOfSale: "20 Aug 2025",
    odometer: 36155, plate: "KMGS080M", imei: "863406078890972", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:24", lastLocationTime: "01 Sep 2026 12:24",
    immobilization: "Off", soc: 92, lat: -0.391, long: 36.956,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "5", vin: "ME92ZPSBB1J000817", customerName: "Meshack Kibet", customerPhone: "254-703298854",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "14 May 2026",
    odometer: 18366, plate: "KMGY148Y", imei: "867963074737082", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:21", lastLocationTime: "01 Sep 2026 12:21",
    immobilization: "Off", soc: 67, lat: -1.267, long: 36.835,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "6", vin: "ME92ZPSFA1J000103", customerName: "", customerPhone: "254-704662168",
    status: "active", tenant: "retail/4g", storeCode: "ke-nyr-ctr-zhb", dateOfSale: "23 Sep 2025",
    odometer: 8640, plate: "KMGS108M", imei: "867963074743957", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:16", lastLocationTime: "01 Sep 2026 12:16",
    immobilization: "Off", soc: 55, lat: -0.432, long: 36.949,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.5dev1 (2)",
  },
  {
    id: "7", vin: "ESUM0220522000030", customerName: "Simon Nthenge", customerPhone: "254-746003675",
    status: "active", tenant: "zeno-internal/demo_bikes", storeCode: "ke-nbo-zhq", dateOfSale: "22 May 2026",
    odometer: 15905, plate: "KMGQ026X", imei: "863406076615124", connectivity: "Online",
    lastConnected: "31 Aug 2026 14:02", lastLocationTime: "31 Aug 2026 14:02",
    immobilization: "Off", soc: 78, lat: -1.292, long: 36.812,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (168)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "8", vin: "ME92ZPSLA1J000164", customerName: "", customerPhone: "254-711325407",
    status: "active", tenant: "retail/4g", storeCode: "ke-nbo-zhq", dateOfSale: "29 Oct 2025",
    odometer: 46569, plate: "KMGU127A", imei: "867963074742215", connectivity: "Online",
    lastConnected: "31 Aug 2026 13:59", lastLocationTime: "31 Aug 2026 13:59",
    immobilization: "Off", soc: 39, lat: -1.319, long: 36.845,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "9", vin: "ME92ZPSBB1J000840", customerName: "Kelvin Juma", customerPhone: "254-769764550",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "14 May 2026",
    odometer: 16582, plate: "KMGY155Y", imei: "867963074737918", connectivity: "Online",
    lastConnected: "31 Aug 2026 13:58", lastLocationTime: "31 Aug 2026 13:58",
    immobilization: "Off", soc: 62, lat: -1.254, long: 36.897,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "10", vin: "ME92ZPSDA2J000073", customerName: "Josephat Ratemo", customerPhone: "254-799777208",
    status: "active", tenant: "retail/zeno_captive", storeCode: "ke-nyk-zhq", dateOfSale: "22 Jul 2025",
    odometer: 18207, plate: "KMGR271V", imei: "867963074744104", connectivity: "Online",
    lastConnected: "31 Aug 2026 13:57", lastLocationTime: "31 Aug 2026 13:57",
    immobilization: "Off", soc: 88, lat: -0.414, long: 36.942,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "11", vin: "ME92ZPSFB1J002180", customerName: "Samuel Kariuki Muraya", customerPhone: "254-721825157",
    status: "active", tenant: "retail/watu", storeCode: "ke-nbo-zhq", dateOfSale: "14 Aug 2026",
    odometer: 2772, plate: "KMHC028L", imei: "860300087747385", connectivity: "Online",
    lastConnected: "31 Aug 2026 13:56", lastLocationTime: "31 Aug 2026 13:56",
    immobilization: "Off", soc: 95, lat: -1.278, long: 36.833,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "12", vin: "ME92ZPSBC1J001033", customerName: "Grace Wanjiku", customerPhone: "254-712334455",
    status: "active", tenant: "fleet/mkopa", storeCode: "ke-nbo-mkp", dateOfSale: "11 Jan 2026",
    odometer: 28940, plate: "KMGP341K", imei: "864123056782341", connectivity: "Online",
    lastConnected: "31 Aug 2026 13:44", lastLocationTime: "31 Aug 2026 13:44",
    immobilization: "Off", soc: 74, lat: -1.265, long: 36.808,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "13", vin: "ME92ZPSCC1J001245", customerName: "Mary Achieng", customerPhone: "254-733445566",
    status: "active", tenant: "retail/tugende", storeCode: "ke-jgo-mkp", dateOfSale: "03 Feb 2026",
    odometer: 11230, plate: "KMGT217R", imei: "865234167890452", connectivity: "GpsOffline",
    lastConnected: "30 Aug 2026 09:22", lastLocationTime: "30 Aug 2026 09:22",
    immobilization: "Off", soc: 33, lat: -0.870, long: 37.002,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "14", vin: "ME92ZPSFD1J002310", customerName: "John Odhiambo", customerPhone: "254-741234567",
    status: "active", tenant: "retail/safari_customer", storeCode: "ke-nbo-mbsa-wtu", dateOfSale: "28 Apr 2026",
    odometer: 9877, plate: "KMHB019P", imei: "867345289012567", connectivity: "Online",
    lastConnected: "01 Sep 2026 11:55", lastLocationTime: "01 Sep 2026 11:55",
    immobilization: "Off", soc: 61, lat: -1.310, long: 36.860,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "15", vin: "ME92ZPSAA2J000089", customerName: "David Mwangi", customerPhone: "254-758901234",
    status: "active", tenant: "retail/4g", storeCode: "ke-nrm-zgs", dateOfSale: "15 Nov 2025",
    odometer: 42110, plate: "KMGV088Q", imei: "863789012456789", connectivity: "Online",
    lastConnected: "01 Sep 2026 10:41", lastLocationTime: "01 Sep 2026 10:41",
    immobilization: "MobilizedRequestSent", soc: 50, lat: -0.368, long: 36.972,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "16", vin: "ME92ZPSBD1J001502", customerName: "Faith Njeri", customerPhone: "254-765012345",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "01 Jun 2026",
    odometer: 6312, plate: "KMGY422T", imei: "867963074741334", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:01", lastLocationTime: "01 Sep 2026 13:01",
    immobilization: "Off", soc: 87, lat: -1.239, long: 36.921,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "17", vin: "ME92ZPSCA1J001677", customerName: "James Otieno", customerPhone: "254-771123456",
    status: "active", tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "19 Mar 2026",
    odometer: 14988, plate: "KMGT508W", imei: "864567890123456", connectivity: "Offline",
    lastConnected: "29 Aug 2026 16:33", lastLocationTime: "29 Aug 2026 16:33",
    immobilization: "ImmobilizedRequestSent", soc: 22, lat: -1.297, long: 36.815,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "18", vin: "ME92ZPSFB1J002099", customerName: "Lucy Wangari", customerPhone: "254-788234567",
    status: "active", tenant: "retail/watu", storeCode: "ke-nbo-zhq", dateOfSale: "10 Aug 2026",
    odometer: 3421, plate: "KMHC009G", imei: "860145678901234", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:48", lastLocationTime: "01 Sep 2026 12:48",
    immobilization: "Off", soc: 96, lat: -1.283, long: 36.825,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "19", vin: "ME92ZPSAC1J000743", customerName: "Michael Kariuki", customerPhone: "254-792345678",
    status: "active", tenant: "retail/fortune", storeCode: "ke-nbo-zhq", dateOfSale: "24 Apr 2026",
    odometer: 8954, plate: "KMGX944H", imei: "861901234567890", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:07", lastLocationTime: "01 Sep 2026 12:07",
    immobilization: "Off", soc: 69, lat: -1.312, long: 36.782,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "20", vin: "ME92ZPSAL1J000991", customerName: "Sarah Mutua", customerPhone: "254-700456789",
    status: "active", tenant: "retail/4g", storeCode: "ke-nyk-zhq", dateOfSale: "06 Jan 2026",
    odometer: 22741, plate: "KMGR810N", imei: "867456789012345", connectivity: "Online",
    lastConnected: "01 Sep 2026 11:29", lastLocationTime: "01 Sep 2026 11:29",
    immobilization: "Off", soc: 58, lat: -0.401, long: 36.940,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "21", vin: "ME92ZPSBF1J001120", customerName: "Benjamin Kimani", customerPhone: "254-715678901",
    status: "active", tenant: "fleet/mkopa", storeCode: "ke-nbo-mkp", dateOfSale: "22 Feb 2026",
    odometer: 19876, plate: "KMGP587C", imei: "864890123456789", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:59", lastLocationTime: "01 Sep 2026 12:59",
    immobilization: "Off", soc: 77, lat: -1.271, long: 36.802,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "22", vin: "ME92ZPSCB1J001389", customerName: "Agnes Waweru", customerPhone: "254-726789012",
    status: "active", tenant: "retail/safari_customer", storeCode: "ke-nbo-mbsa-wtu", dateOfSale: "15 Apr 2026",
    odometer: 7102, plate: "KMGS763V", imei: "865123456789012", connectivity: "Online",
    lastConnected: "01 Sep 2026 11:44", lastLocationTime: "01 Sep 2026 11:44",
    immobilization: "Off", soc: 84, lat: -1.305, long: 36.867,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "23", vin: "ME92ZPSDC2J000201", customerName: "Thomas Oduya", customerPhone: "254-737890123",
    status: "active", tenant: "zeno-internal/pd_bikes", storeCode: "ke-nbo-zhq", dateOfSale: "30 Mar 2026",
    odometer: 5587, plate: "KMGX211B", imei: "861234567890123", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:03", lastLocationTime: "01 Sep 2026 13:03",
    immobilization: "Off", soc: 91, lat: -1.289, long: 36.819,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "24", vin: "ME92ZPSFE1J002410", customerName: "Patricia Auma", customerPhone: "254-748901234",
    status: "active", tenant: "retail/watu", storeCode: "ke-nbo-zhq", dateOfSale: "25 Aug 2026",
    odometer: 1288, plate: "KMHB873D", imei: "860678901234567", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:31", lastLocationTime: "01 Sep 2026 12:31",
    immobilization: "Off", soc: 99, lat: -1.275, long: 36.827,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "25", vin: "ME92ZPSBG1J001044", customerName: "Robert Omondi", customerPhone: "254-759012345",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "17 Apr 2026",
    odometer: 13221, plate: "KMGY038E", imei: "867963074739667", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:10", lastLocationTime: "01 Sep 2026 13:10",
    immobilization: "Off", soc: 73, lat: -1.241, long: 36.916,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "26", vin: "ME92ZPSAD1J000877", customerName: "Caroline Njoroge", customerPhone: "254-763123456",
    status: "active", tenant: "retail/cash", storeCode: "ke-nbo-zhq", dateOfSale: "12 Feb 2026",
    odometer: 17640, plate: "KMGR455F", imei: "867012345678901", connectivity: "Online",
    lastConnected: "31 Aug 2026 22:17", lastLocationTime: "31 Aug 2026 22:17",
    immobilization: "Off", soc: 44, lat: -1.295, long: 36.811,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "27", vin: "ME92ZPSCD1J001556", customerName: "Dennis Kamau", customerPhone: "254-774234567",
    status: "active", tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "08 May 2026",
    odometer: 9334, plate: "KMGS921G", imei: "865456789012345", connectivity: "CloudOffline",
    lastConnected: "28 Aug 2026 14:05", lastLocationTime: "28 Aug 2026 14:05",
    immobilization: "ImmobilizedRequestAck", soc: 18, lat: -1.308, long: 36.790,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "28", vin: "ME92ZPSFF1J002550", customerName: "Elizabeth Chebet", customerPhone: "254-785345678",
    status: "active", tenant: "retail/watu", storeCode: "ke-nbo-zhq", dateOfSale: "27 Aug 2026",
    odometer: 978, plate: "KMHB994H", imei: "860901234567890", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:44", lastLocationTime: "01 Sep 2026 12:44",
    immobilization: "Off", soc: 100, lat: -1.282, long: 36.822,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "29", vin: "ME92ZPSBH1J001188", customerName: "George Muthoni", customerPhone: "254-796456789",
    status: "active", tenant: "fleet/mkopa", storeCode: "ke-nbo-mkp", dateOfSale: "05 Mar 2026",
    odometer: 24556, plate: "KMGP674J", imei: "864234567890123", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:52", lastLocationTime: "01 Sep 2026 12:52",
    immobilization: "Off", soc: 56, lat: -1.268, long: 36.806,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "30", vin: "ME92ZPSAE1J000930", customerName: "Hannah Anyango", customerPhone: "254-707567890",
    status: "active", tenant: "retail/safari_customer", storeCode: "ke-tmu-zgs", dateOfSale: "29 Nov 2025",
    odometer: 31200, plate: "KMGT104K", imei: "867567890123456", connectivity: "GpsOffline",
    lastConnected: "30 Aug 2026 20:11", lastLocationTime: "30 Aug 2026 20:11",
    immobilization: "Off", soc: 29, lat: -0.643, long: 37.128,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "31", vin: "ME92ZPSCE1J001720", customerName: "Isaac Korir", customerPhone: "254-718678901",
    status: "new", tenant: "retail/4g", storeCode: "ke-nyk-zhq", dateOfSale: "29 Aug 2026",
    odometer: 144, plate: "KMGT912L", imei: "865789012345678", connectivity: "Online",
    lastConnected: "01 Sep 2026 10:19", lastLocationTime: "01 Sep 2026 10:19",
    immobilization: "Off", soc: 98, lat: -0.409, long: 36.945,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "32", vin: "ME92ZPSFG1J002688", customerName: "Joan Mwangi", customerPhone: "254-729789012",
    status: "new", tenant: "retail/watu", storeCode: "ke-nbo-zhq", dateOfSale: "30 Aug 2026",
    odometer: 67, plate: "KMHC127M", imei: "860345678901234", connectivity: "Online",
    lastConnected: "01 Sep 2026 09:55", lastLocationTime: "01 Sep 2026 09:55",
    immobilization: "Off", soc: 100, lat: -1.279, long: 36.828,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "33", vin: "ME92ZPSBI1J001300", customerName: "Kevin Kiplagat", customerPhone: "254-740890123",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "25 Mar 2026",
    odometer: 11778, plate: "KMGY566N", imei: "867963074740122", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:04", lastLocationTime: "01 Sep 2026 13:04",
    immobilization: "Off", soc: 66, lat: -1.248, long: 36.910,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "34", vin: "ME92ZPSAF1J001010", customerName: "Lilian Wambua", customerPhone: "254-751901234",
    status: "active", tenant: "retail/cash", storeCode: "ke-nbo-zhq", dateOfSale: "09 Jan 2026",
    odometer: 25440, plate: "KMGR692P", imei: "867890123456789", connectivity: "Online",
    lastConnected: "31 Aug 2026 23:58", lastLocationTime: "31 Aug 2026 23:58",
    immobilization: "Off", soc: 42, lat: -1.291, long: 36.817,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "35", vin: "ME92ZPSCF1J001880", customerName: "Moses Onyango", customerPhone: "254-762012345",
    status: "test", tenant: "zeno-internal/test_bike", storeCode: "ke-nbo-zhq", dateOfSale: "11 Aug 2026",
    odometer: 2210, plate: "KMHB358Q", imei: "865012345678901", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:38", lastLocationTime: "01 Sep 2026 12:38",
    immobilization: "Off", soc: 85, lat: -1.286, long: 36.820,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "36", vin: "ME92ZPSFH1J002740", customerName: "Nancy Kamau", customerPhone: "254-773123456",
    status: "active", tenant: "retail/watu", storeCode: "ke-nbo-zhq", dateOfSale: "22 Aug 2026",
    odometer: 1905, plate: "KMHB766R", imei: "860567890123456", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:21", lastLocationTime: "01 Sep 2026 12:21",
    immobilization: "Off", soc: 93, lat: -1.277, long: 36.831,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "37", vin: "ME92ZPSBJ1J001422", customerName: "Paul Njuguna", customerPhone: "254-784234567",
    status: "active", tenant: "fleet/mkopa", storeCode: "ke-nbo-mkp", dateOfSale: "14 Apr 2026",
    odometer: 16341, plate: "KMGP805S", imei: "864456789012345", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:01", lastLocationTime: "01 Sep 2026 13:01",
    immobilization: "Off", soc: 71, lat: -1.262, long: 36.810,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "38", vin: "ME92ZPSAG1J001078", customerName: "Rose Achieng", customerPhone: "254-795345678",
    status: "used", tenant: "zeno-internal/demo_bikes", storeCode: "ke-nbo-zhq", dateOfSale: "14 Sep 2025",
    odometer: 38900, plate: "KMGQ523T", imei: "867234567890123", connectivity: "GpsOffline",
    lastConnected: "29 Aug 2026 11:43", lastLocationTime: "29 Aug 2026 11:43",
    immobilization: "MobilizedRequestAck", soc: 37, lat: -1.302, long: 36.798,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "39", vin: "ME92ZPSFI1J002812", customerName: "Stephen Mutahi", customerPhone: "254-706456789",
    status: "active", tenant: "retail/zeno_captive", storeCode: "ke-nyk-zhq", dateOfSale: "18 Aug 2026",
    odometer: 2115, plate: "KMHB599U", imei: "860789012345678", connectivity: "Online",
    lastConnected: "01 Sep 2026 11:51", lastLocationTime: "01 Sep 2026 11:51",
    immobilization: "Off", soc: 89, lat: -0.406, long: 36.947,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "40", vin: "ME92ZPSCG1J002000", customerName: "Virginia Waithaka", customerPhone: "254-717567890",
    status: "active", tenant: "retail/tugende", storeCode: "ke-jgo-mkp", dateOfSale: "16 Jun 2026",
    odometer: 6788, plate: "KMGU299V", imei: "865678901234567", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:15", lastLocationTime: "01 Sep 2026 12:15",
    immobilization: "Off", soc: 76, lat: -0.876, long: 37.010,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "41", vin: "ME92ZPSBK1J001533", customerName: "Wilson Kiptoo", customerPhone: "254-728678901",
    status: "active", tenant: "fleet/greenwheels", storeCode: "ke-nbo-grw-hq", dateOfSale: "02 May 2026",
    odometer: 14999, plate: "KMGY444W", imei: "867963074739881", connectivity: "Online",
    lastConnected: "01 Sep 2026 13:08", lastLocationTime: "01 Sep 2026 13:08",
    immobilization: "Off", soc: 64, lat: -1.243, long: 36.918,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "42", vin: "ME92ZPSAH1J001133", customerName: "Mercy Ndung'u", customerPhone: "254-739789012",
    status: "active", tenant: "retail/fortune", storeCode: "ke-nbo-zhq", dateOfSale: "27 Jan 2026",
    odometer: 20112, plate: "KMGX670X", imei: "861567890123456", connectivity: "Online",
    lastConnected: "01 Sep 2026 11:22", lastLocationTime: "01 Sep 2026 11:22",
    immobilization: "Off", soc: 48, lat: -1.315, long: 36.775,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "43", vin: "ME92ZPSCH1J002115", customerName: "Antony Wekesa", customerPhone: "254-750890123",
    status: "test", tenant: "zeno-internal/test_bike", storeCode: "ke-nbo-zhq", dateOfSale: "04 Aug 2026",
    odometer: 4490, plate: "KMHB212Y", imei: "865901234567890", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:04", lastLocationTime: "01 Sep 2026 12:04",
    immobilization: "Off", soc: 82, lat: -1.284, long: 36.823,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "44", vin: "ME92ZPSFJ1J002900", customerName: "Diana Moraa", customerPhone: "254-761901234",
    status: "new", tenant: "retail/4g", storeCode: "ke-nrm-zgs", dateOfSale: "31 Aug 2026",
    odometer: 12, plate: "KMHC290Z", imei: "860123456789012", connectivity: "Online",
    lastConnected: "01 Sep 2026 09:12", lastLocationTime: "01 Sep 2026 09:12",
    immobilization: "Off", soc: 100, lat: -0.374, long: 36.969,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "45", vin: "ME92ZPSAL1J001655", customerName: "Francis Mutua", customerPhone: "254-772012345",
    status: "active", tenant: "fleet/mkopa", storeCode: "ke-nbo-mkp", dateOfSale: "11 May 2026",
    odometer: 13340, plate: "KMGP937A", imei: "864678901234567", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:41", lastLocationTime: "01 Sep 2026 12:41",
    immobilization: "Off", soc: 60, lat: -1.258, long: 36.813,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "46", vin: "ME92ZPSBM1J001744", customerName: "Stella Ochieng", customerPhone: "254-783123456",
    status: "active", tenant: "retail/safari_customer", storeCode: "ke-nbo-mbsa-wtu", dateOfSale: "19 Jun 2026",
    odometer: 5899, plate: "KMGU081B", imei: "867678901234567", connectivity: "Online",
    lastConnected: "01 Sep 2026 11:55", lastLocationTime: "01 Sep 2026 11:55",
    immobilization: "Off", soc: 79, lat: -1.308, long: 36.862,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.6dev1 (2)",
  },
  {
    id: "47", vin: "ME92ZPSCI1J002245", customerName: "Henry Kirui", customerPhone: "254-794234567",
    status: "active", tenant: "retail/tireproz", storeCode: "ke-nbo-zhq", dateOfSale: "26 Jun 2026",
    odometer: 4211, plate: "KMGU455C", imei: "865234012345678", connectivity: "Offline",
    lastConnected: "28 Aug 2026 08:22", lastLocationTime: "28 Aug 2026 08:22",
    immobilization: "Immobilized" as "On", soc: 11, lat: -1.300, long: 36.803,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "48", vin: "ME92ZPSBN1J001866", customerName: "Irene Wanjiku", customerPhone: "254-705345678",
    status: "used", tenant: "zeno-internal/demo_bikes", storeCode: "ke-nbo-zhq", dateOfSale: "03 Oct 2025",
    odometer: 41220, plate: "KMGQ877D", imei: "867912345678901", connectivity: "CloudOffline",
    lastConnected: "27 Aug 2026 19:37", lastLocationTime: "27 Aug 2026 19:37",
    immobilization: "Off", soc: 25, lat: -1.298, long: 36.814,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "49", vin: "ME92ZPSFK1J002971", customerName: "Julius Omondi", customerPhone: "254-716456789",
    status: "active", tenant: "retail/zeno_captive", storeCode: "ke-nyk-zhq", dateOfSale: "15 Aug 2026",
    odometer: 2880, plate: "KMHB440E", imei: "860456789012345", connectivity: "Online",
    lastConnected: "01 Sep 2026 12:02", lastLocationTime: "01 Sep 2026 12:02",
    immobilization: "Off", soc: 94, lat: -0.398, long: 36.943,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
  {
    id: "50", vin: "ME92ZPSAL1J000233", customerName: "Catherine Ndegwa", customerPhone: "254-727567890",
    status: "active", tenant: "retail/cash", storeCode: "ke-nbo-zhq", dateOfSale: "10 Oct 2025",
    odometer: 33120, plate: "KMGR188F", imei: "867123456789012", connectivity: "Online",
    lastConnected: "01 Sep 2026 10:47", lastLocationTime: "01 Sep 2026 10:47",
    immobilization: "Off", soc: 52, lat: -1.293, long: 36.818,
    vcuFirmware: "2.2.5 (1)", zeConnectFirmware: "1.0.0dev1 (177)", evccFirmware: "1.0.8 (3)",
  },
];

// Fix vehicle 47 immobilization value
MOCK_VEHICLES[46].immobilization = "On";

type SortConfig = { column: keyof AssetVehicle; direction: "asc" | "desc" } | null;

type AssetTrackingStore = {
  vehicles: AssetVehicle[];
  filters: FilterState;
  sort: SortConfig;
  page: number;
  perPage: number;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setSort: (column: keyof AssetVehicle) => void;
  setPage: (page: number) => void;
  setPerPage: (n: number) => void;
  resetFilters: () => void;
  toggleImmobilization: (vin: string) => void;
  filteredVehicles: () => AssetVehicle[];
  // Write-through mutators used by the Scanner Provisioning Flow.
  getByVin: (vin: string) => AssetVehicle | undefined;
  upsertBike: (partial: { vin: string; tenant?: string; storeCode?: string }) => void;
  setStoreCode: (vin: string, storeCode: string) => void;
  setTenant: (vin: string, tenant: string) => void;
  assignCustomer: (
    vin: string,
    customerName: string,
    customerPhone: string,
    dateOfSale: string
  ) => void;
  setRfid: (vin: string, rfidTag: string) => void;
  deactivate: (vin: string) => void;
};

export const useAssetTrackingStore = create<AssetTrackingStore>((set, get) => ({
  vehicles: MOCK_VEHICLES,
  filters: { ...DEFAULT_FILTERS },
  sort: null,
  page: 1,
  perPage: 20,

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value }, page: 1 })),
  setSort: (column) =>
    set((s) => ({
      sort:
        s.sort?.column === column
          ? { column, direction: s.sort.direction === "asc" ? "desc" : "asc" }
          : { column, direction: "asc" },
    })),
  setPage: (page) => set({ page }),
  setPerPage: (perPage) => set({ perPage, page: 1 }),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS }, page: 1 }),

  toggleImmobilization: (vin) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) =>
        v.vin === vin
          ? { ...v, immobilization: v.immobilization === "Off" ? "On" : "Off" }
          : v
      ),
    })),

  getByVin: (vin) => get().vehicles.find((v) => v.vin === vin),

  upsertBike: ({ vin, tenant, storeCode }) =>
    set((s) => {
      if (s.vehicles.some((v) => v.vin === vin)) {
        return {
          vehicles: s.vehicles.map((v) =>
            v.vin === vin
              ? {
                  ...v,
                  ...(tenant !== undefined ? { tenant } : {}),
                  ...(storeCode !== undefined ? { storeCode } : {}),
                }
              : v
          ),
        };
      }
      const newBike: AssetVehicle = {
        id: `sp-${vin}`,
        vin,
        customerName: "",
        customerPhone: "",
        status: "new",
        tenant: tenant ?? "",
        storeCode: storeCode ?? "ke-nbo-zhq",
        dateOfSale: "",
        odometer: 0,
        plate: "",
        imei: "",
        connectivity: "Offline",
        lastConnected: "",
        lastLocationTime: "",
        immobilization: "Off",
        soc: 100,
        lat: -1.286389,
        long: 36.820556,
        vcuFirmware: "",
        zeConnectFirmware: "",
        evccFirmware: "",
      };
      return { vehicles: [newBike, ...s.vehicles] };
    }),

  setStoreCode: (vin, storeCode) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.vin === vin ? { ...v, storeCode } : v)),
    })),

  setTenant: (vin, tenant) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.vin === vin ? { ...v, tenant } : v)),
    })),

  assignCustomer: (vin, customerName, customerPhone, dateOfSale) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) =>
        v.vin === vin
          ? {
              ...v,
              customerName,
              customerPhone,
              status: "active",
              ...(dateOfSale ? { dateOfSale } : {}),
            }
          : v
      ),
    })),

  setRfid: (vin, rfidTag) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.vin === vin ? { ...v, rfidTag } : v)),
    })),

  deactivate: (vin) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) =>
        v.vin === vin
          ? { ...v, status: "used", rfidTag: "", customerName: "", customerPhone: "" }
          : v
      ),
    })),

  filteredVehicles: () => {
    const { vehicles, filters, sort } = get();
    let result = vehicles.slice();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          v.customerName.toLowerCase().includes(q) ||
          v.customerPhone.toLowerCase().includes(q) ||
          v.plate.toLowerCase().includes(q) ||
          v.imei.toLowerCase().includes(q)
      );
    }
    if (filters.immobilization !== "All") {
      result = result.filter((v) => v.immobilization === filters.immobilization);
    }
    if (filters.dateOfSale !== "All" && filters.dateOfSale) {
      result = result.filter((v) => v.dateOfSale === filters.dateOfSale);
    }
    if (filters.connectivity !== "All") {
      result = result.filter((v) => v.connectivity === filters.connectivity);
    }
    if (filters.odoFrom !== null) {
      result = result.filter((v) => v.odometer >= (filters.odoFrom ?? 0));
    }
    if (filters.odoTo !== null) {
      result = result.filter((v) => v.odometer <= (filters.odoTo ?? Infinity));
    }
    if (filters.storeCode !== "All") {
      result = result.filter((v) => v.storeCode === filters.storeCode);
    }
    if (filters.vcu !== "All") {
      result = result.filter((v) => v.vcuFirmware === filters.vcu);
    }
    if (filters.zeConnect !== "All") {
      result = result.filter((v) => v.zeConnectFirmware === filters.zeConnect);
    }
    if (filters.evcc !== "All") {
      result = result.filter((v) => v.evccFirmware === filters.evcc);
    }
    if (filters.status !== "All") {
      result = result.filter((v) => v.status === filters.status);
    }
    if (filters.tenant !== "All") {
      if (filters.tenant === "None") {
        result = result.filter((v) => !v.tenant);
      } else {
        result = result.filter((v) => v.tenant === filters.tenant);
      }
    }

    if (sort) {
      const { column, direction } = sort;
      result.sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  },
}));
