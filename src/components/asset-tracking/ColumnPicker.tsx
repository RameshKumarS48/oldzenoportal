"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { COLUMNS, DEFAULT_COLUMNS, type ColumnId } from "./vehicle-columns";
import { ToolbarPopover, type DismissReason } from "./ToolbarPopover";

const same = (a: ColumnId[], b: ColumnId[]) => a.length === b.length && a.every((c) => b.includes(c));

/**
 * The list's columns, in the toolbar popover under the Columns button. It works
 * like the Filters popover: ticks change a draft copied from the current
 * columns on open, and only Apply shows (and saves) them. Cancel, Esc and an
 * outside click discard the draft. "Reset to default" isn't a draft action:
 * like Clear filters, it restores (and saves) the default set at once and
 * resets the boxes, but leaves the popover open. VIN can't be hidden.
 */
export function ColumnPicker({
  anchorRef,
  visible,
  onChange,
  onDismiss,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: ColumnId[];
  onChange: (cols: ColumnId[]) => void;
  onDismiss: (reason: DismissReason) => void;
}) {
  // Mounted only while open, so the draft starts from the columns showing now.
  const [draft, setDraft] = useState<ColumnId[]>(visible);

  function toggle(id: ColumnId, on: boolean) {
    // Kept in column order whatever order they're ticked in.
    setDraft((d) => COLUMNS.filter((c) => (c.id === id ? on : d.includes(c.id))).map((c) => c.id));
  }

  return (
    <ToolbarPopover
      id="asset-columns-popover"
      title="Columns"
      anchorRef={anchorRef}
      width="w-70"
      initialFocus='[role="checkbox"]:not([disabled])'
      onDismiss={onDismiss}
      footerAction={{
        label: "Reset to default",
        onClick: () => {
          onChange(DEFAULT_COLUMNS);
          // The boxes follow, so the popover shows the default set and Apply has nothing to do.
          setDraft(DEFAULT_COLUMNS);
        },
      }}
      applyLabel="Apply"
      applyDisabled={same(draft, visible)}
      onApply={() => {
        onChange(draft);
        onDismiss("close");
      }}
    >
      <div className="space-y-2">
        {COLUMNS.map(({ id, label }) => (
          <Checkbox
            key={id}
            label={label}
            checked={draft.includes(id)}
            disabled={id === "vin"}
            onChange={(on) => toggle(id, on)}
            className="items-center gap-2 text-sm"
          />
        ))}
      </div>
    </ToolbarPopover>
  );
}
