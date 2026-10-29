/** Slot label as it appears everywhere in the UI: S01 … S10. */
export function slotLabel(slot: number): string {
  return `S${String(slot).padStart(2, "0")}`;
}
