import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BatteryStatus =
  | "pre_bringup"
  | "deployment_ready"
  | "active_network"
  | "pd_testing"
  | "quarantine"
  | "retired";

export interface Battery {
  id: string;
  serial: string;
  status: BatteryStatus;
  warehouse: "Babadogo" | "Ruaraka";
  shipmentNumber: string;
  dateReceived: string;
  daysInStorage: number;
  currentAssignment?: string;
  assignmentType?: "vehicle" | "swap_station";
  currentLocation: string;
  repairCount: number;
  firmwareVersion: string;
  quarantineReason?: string;
  retireReason?: string;
  technician?: string;
}

const MOCK_BATTERIES: Battery[] = [
  // --- active_network: 28 ---
  { id: "bat-001", serial: "ZBT-2026-0380", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0005", assignmentType: "swap_station", currentLocation: "Nan Matt 1, Nanyuki",          repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-002", serial: "ZBT-2026-0381", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0005", assignmentType: "swap_station", currentLocation: "Nan Matt 1, Nanyuki",          repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-003", serial: "ZBT-2026-0382", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0002", assignmentType: "swap_station", currentLocation: "Peak Place, Nanyuki",           repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-004", serial: "ZBT-2026-0383", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0002", assignmentType: "swap_station", currentLocation: "Peak Place, Nanyuki",           repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-005", serial: "ZBT-2026-0384", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0016", assignmentType: "swap_station", currentLocation: "Peak Place 2, Nanyuki",        repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-006", serial: "ZBT-2026-0385", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0006", assignmentType: "swap_station", currentLocation: "Zeno Hub, Nyeri",              repairCount: 1, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-007", serial: "ZBT-2026-0386", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0006", assignmentType: "swap_station", currentLocation: "Zeno Hub, Nyeri",              repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-008", serial: "ZBT-2026-0387", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentAssignment: "BS0003", assignmentType: "swap_station", currentLocation: "Dormans, Nanyuki",             repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-009", serial: "ZBT-2026-0388", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0025", assignmentType: "swap_station", currentLocation: "Kasarani Hub, Nairobi",        repairCount: 0, firmwareVersion: "2.1.3", technician: "Vijayanand P" },
  { id: "bat-010", serial: "ZBT-2026-0389", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0025", assignmentType: "swap_station", currentLocation: "Kasarani Hub, Nairobi",        repairCount: 0, firmwareVersion: "2.1.3", technician: "Vijayanand P" },
  { id: "bat-011", serial: "ZBT-2026-0390", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0009", assignmentType: "swap_station", currentLocation: "Zeno Hub, Eastern Bypass",    repairCount: 0, firmwareVersion: "2.1.3", technician: "Patrick N" },
  { id: "bat-012", serial: "ZBT-2026-0391", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0009", assignmentType: "swap_station", currentLocation: "Zeno Hub, Eastern Bypass",    repairCount: 0, firmwareVersion: "2.1.3", technician: "Patrick N" },
  { id: "bat-013", serial: "ZBT-2026-0392", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0029", assignmentType: "swap_station", currentLocation: "Cumulus Suppliers, Nyeri",    repairCount: 0, firmwareVersion: "2.1.3", technician: "George K" },
  { id: "bat-014", serial: "ZBT-2026-0393", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0029", assignmentType: "swap_station", currentLocation: "Cumulus Suppliers, Nyeri",    repairCount: 1, firmwareVersion: "2.1.3", technician: "George K" },
  { id: "bat-015", serial: "ZBT-2026-0394", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0047", assignmentType: "swap_station", currentLocation: "Nan Matt 2, Nanyuki",         repairCount: 0, firmwareVersion: "2.1.3", technician: "Vijayanand P" },
  { id: "bat-016", serial: "ZBT-2026-0395", status: "active_network", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0047", assignmentType: "swap_station", currentLocation: "Nan Matt 2, Nanyuki",         repairCount: 0, firmwareVersion: "2.1.3", technician: "Vijayanand P" },
  { id: "bat-017", serial: "ZBT-2026-0396", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0045", assignmentType: "swap_station", currentLocation: "KFA Naromoru, Nanyuki",      repairCount: 0, firmwareVersion: "2.1.3", technician: "Patrick N" },
  { id: "bat-018", serial: "ZBT-2026-0397", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentAssignment: "BS0045", assignmentType: "swap_station", currentLocation: "KFA Naromoru, Nanyuki",      repairCount: 0, firmwareVersion: "2.1.3", technician: "Patrick N" },
  { id: "bat-019", serial: "ZBT-2026-0398", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "ME92ZPSFB1J001988", assignmentType: "vehicle",       currentLocation: "NBO, Bike ME92ZPSFB1J001988", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-020", serial: "ZBT-2026-0399", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "ME92ZPSEB1J001547", assignmentType: "vehicle",       currentLocation: "NBO, Bike ME92ZPSEB1J001547", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-021", serial: "ZBT-2026-0400", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "ME92ZPSFB1J001905", assignmentType: "vehicle",       currentLocation: "NBO, Bike ME92ZPSFB1J001905", repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-022", serial: "ZBT-2026-0401", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "ME92ZPSFB1J001934", assignmentType: "vehicle",       currentLocation: "NBO, Bike ME92ZPSFB1J001934", repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-023", serial: "ZBT-2026-0402", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "BS0043", assignmentType: "swap_station", currentLocation: "Zeno HQ, Baba Dogo",         repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-024", serial: "ZBT-2026-0403", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "BS0043", assignmentType: "swap_station", currentLocation: "Zeno HQ, Baba Dogo",         repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-025", serial: "ZBT-2026-0404", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "BS0017", assignmentType: "swap_station", currentLocation: "Extra Miles, Eastleigh",      repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-026", serial: "ZBT-2026-0405", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "BS0017", assignmentType: "swap_station", currentLocation: "Extra Miles, Eastleigh",      repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-027", serial: "ZBT-2026-0406", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "BS0027", assignmentType: "swap_station", currentLocation: "Zeno Hub, Westlands",         repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-028", serial: "ZBT-2026-0407", status: "active_network", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-05", daysInStorage: 0, currentAssignment: "BS0027", assignmentType: "swap_station", currentLocation: "Zeno Hub, Westlands",         repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },

  // --- deployment_ready: 8 ---
  { id: "bat-029", serial: "ZBT-2026-0408", status: "deployment_ready", warehouse: "Babadogo", shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-10", daysInStorage: 19, currentLocation: "Babadogo Warehouse", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-030", serial: "ZBT-2026-0409", status: "deployment_ready", warehouse: "Babadogo", shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-10", daysInStorage: 19, currentLocation: "Babadogo Warehouse", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-031", serial: "ZBT-2026-0410", status: "deployment_ready", warehouse: "Babadogo", shipmentNumber: "SHP-2026-014", dateReceived: "2026-07-10", daysInStorage: 19, currentLocation: "Babadogo Warehouse", repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-032", serial: "ZBT-2026-0411", status: "deployment_ready", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-15", daysInStorage: 14, currentLocation: "Ruaraka Warehouse",  repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-033", serial: "ZBT-2026-0412", status: "deployment_ready", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-15", daysInStorage: 14, currentLocation: "Ruaraka Warehouse",  repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-034", serial: "ZBT-2026-0413", status: "deployment_ready", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-15", daysInStorage: 14, currentLocation: "Ruaraka Warehouse",  repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-035", serial: "ZBT-2026-0414", status: "deployment_ready", warehouse: "Babadogo", shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-18", daysInStorage: 11, currentLocation: "Babadogo Warehouse", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },
  { id: "bat-036", serial: "ZBT-2026-0415", status: "deployment_ready", warehouse: "Babadogo", shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-18", daysInStorage: 11, currentLocation: "Babadogo Warehouse", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },

  // --- pre_bringup: 5 ---
  { id: "bat-037", serial: "ZBT-2026-0416", status: "pre_bringup", warehouse: "Babadogo", shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-20", daysInStorage: 9,  currentLocation: "Babadogo Warehouse, Pallet 3", repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-038", serial: "ZBT-2026-0417", status: "pre_bringup", warehouse: "Babadogo", shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-20", daysInStorage: 9,  currentLocation: "Babadogo Warehouse, Pallet 3", repairCount: 0, firmwareVersion: "2.1.4", technician: "Patrick N" },
  { id: "bat-039", serial: "ZBT-2026-0418", status: "pre_bringup", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-20", daysInStorage: 9,  currentLocation: "Ruaraka Warehouse, Pallet 1",  repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-040", serial: "ZBT-2026-0419", status: "pre_bringup", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-20", daysInStorage: 9,  currentLocation: "Ruaraka Warehouse, Pallet 1",  repairCount: 0, firmwareVersion: "2.1.4", technician: "George K" },
  { id: "bat-041", serial: "ZBT-2026-0420", status: "pre_bringup", warehouse: "Babadogo", shipmentNumber: "SHP-2026-015", dateReceived: "2026-07-20", daysInStorage: 9,  currentLocation: "Babadogo Warehouse, Pallet 4", repairCount: 0, firmwareVersion: "2.1.4", technician: "Vijayanand P" },

  // --- quarantine: 3 ---
  { id: "bat-042", serial: "ZBT-2026-0421", status: "quarantine", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentLocation: "Babadogo, Quarantine Bay", repairCount: 2, firmwareVersion: "2.0.9", quarantineReason: "Capacity Failure",     technician: "Vijayanand P" },
  { id: "bat-043", serial: "ZBT-2026-0422", status: "quarantine", warehouse: "Ruaraka",  shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentLocation: "Ruaraka, Quarantine Bay",  repairCount: 1, firmwareVersion: "2.1.3", quarantineReason: "Communication Failure", technician: "Patrick N" },
  { id: "bat-044", serial: "ZBT-2026-0423", status: "quarantine", warehouse: "Babadogo", shipmentNumber: "SHP-2026-013", dateReceived: "2026-06-20", daysInStorage: 0, currentLocation: "Babadogo, Quarantine Bay", repairCount: 0, firmwareVersion: "2.1.3", quarantineReason: "Physical Damage",      technician: "George K" },

  // --- retired: 1 ---
  { id: "bat-045", serial: "ZBT-2026-0379", status: "retired", warehouse: "Babadogo", shipmentNumber: "SHP-2026-012", dateReceived: "2026-06-01", daysInStorage: 0, currentLocation: "Babadogo, Retired Store", repairCount: 3, firmwareVersion: "2.0.9", retireReason: "Beyond Repair", technician: "Vijayanand P" },
];

interface BatteriesState {
  batteries: Battery[];
}

export const useBatteriesStore = create<BatteriesState>()(
  persist(
    () => ({ batteries: MOCK_BATTERIES }),
    { name: "zeno-batteries" }
  )
);
