# Asset Tracking filters: drawer with chips

**Scope: UI only.** The store (`src/store/asset-tracking.ts`), filter logic, filter
values, setters, option lists and `resetFilters` are unchanged. Every filter holds a
single value. List View and Map View read the same filtered list, as before.

## Why the drawer again, not pills

The previous step used Jira / Shopify Polaris-style filter pills: one popover per
filter, each applying on its own.

- **That suits changing one filter, but this page usually sets several.** For
  example, Status + Tenant + Connectivity. With pills, each one took a full round:
  open the menu → choose the filter → pick a value → popover closes. That's three
  or four clicks per filter.
- **The drawer shows every filter at once,** so several can be set in one pass and
  applied together.
- **Pills' strengths were kept as chips:** each active filter is visible, removable
  with one click, and one click from its control.

## Single value per filter

Each filter stays a dropdown with one value, as the store expects (`status: string`,
not `string[]`).

- **Checkbox lists** ("active or new") would need multi-select matching in the
  filter logic and array values in the store. That's a logic change, so it's
  **deferred**.
- **When it's taken on,** a chip's value would become a count or a joined list (for
  example `Status: active, new`). The drawer's groups and order can stay as they are.

## Layout

**Row 1:**

- **Search:** `Search VIN, customer, phone, plate, IMEI…`.
  - Fixed at 384px (`sm:w-96`, full width on small screens).
  - Applies as you type.
- **Filters** button (`secondary`, `SlidersHorizontal` icon).
  - While any filter is active, it takes the tinted selected style
    (`bg-zeno-teal/10 text-zeno-teal`, the tint used for selected rows and tags) and
    shows a filled `zeno-red` count badge.
  - It's neutral when nothing is active. Search isn't counted.
- **Export**, on the right, unchanged.

**Row 2** is only shown while at least one filter is active; nothing is reserved
otherwise:

- **One chip per active filter,** in this fixed order (not the order they were
  added): Status, Connectivity, Immobilization, Tenant, Store Code, Date of Sale,
  Odo Range, VCU, ZeConnect, EVCC.
  - The order goes from what the vehicle is doing now, to who owns it, to its
    history, to firmware. So the filters operators ask about first lead the row and
    are the last to overflow.
- **Clear filters** (✕ and text) comes after the chips, in the existing
  `text-slate-500 hover:text-slate-700` text-button style, at normal contrast.
- **Chip:** tinted "Field: value", plus a separate × button.
  - **Clicking the chip** opens the drawer with focus on that filter's control. If
    that's a firmware filter, the Firmware group opens first.
  - **×** resets that filter to "All" straight away through its existing setter.
    Odo clears both ends.
  - **Long values** are cut with an ellipsis (`max-w-40`). The full "Field: value"
    shows on hover (`title`) and is in the chip's accessible name.

### Overflow rules

- **Row 2 is at most two lines.**
- **How it's worked out:** an invisible copy of every chip is measured, and the
  chips are packed into lines as `flex-wrap` would pack them. The row shows as many
  chips, in order, as fit in two lines together with a **"+N more"** chip and Clear
  filters.
- **"+N more"** opens the drawer, where every filter is visible.
- **The count is recalculated** whenever the row's width or the chips change.

## Drawer

- **Placement:** slides in from the right, 448px wide (`sm:w-md`, full width on small
  screens), over a dimmed backdrop.
  - It overlays the whole page, so it never shifts or clips the table or the map.
  - It copies Swap Audit's `SessionDrawer` pattern: the overlay and backdrop, the
    slide-in, `inert` while closed, Tab kept inside, and scrolling over the backdrop
    blocked.
  - Like that drawer, it's rendered in place inside `<main>`, so the dark-mode
    overrides in `globals.css` reach it.
- **Groups**, in the same order as the chips, with caption-style headings, in two
  columns of the existing `SelectField`:
  - **Vehicle:** Status, Connectivity, Immobilization, Tenant
  - **Ownership:** Store Code
  - **Usage:**
    - Date of Sale: one date field with a clear button. It's a single day, and
      writes the same `07 May 2026` text the filter matches on.
    - Odo From and Odo To: on one row. An empty field means no limit at that end.
  - **Firmware:** VCU, ZeConnect, EVCC.
    - Collapsed by default, because it's the least-used group.
    - It opens automatically when one of its filters is active, or when a firmware
      chip opened the drawer, so an applied value is never hidden.

### Draft and footer

- **The drawer covers the table,** so edits go to a draft copied from the store when
  it opens, and nothing reaches the table until **Apply**.
- **Apply:**
  - It's disabled while the draft would apply exactly the filters already in place.
    The comparison uses the values Apply would write, not the field text, so "0100"
    over an applied 100 counts as unchanged.
  - Otherwise it reads `Apply · N`, where N is the number of filters active in the
    draft. It reads plain `Apply` when the draft has none, for example after
    emptying every field.
  - It writes only the changed filters through the existing setters, then closes.
- **Cancel, ✕, Esc and a backdrop click** discard the draft and close.
- **Clear filters** (left of the footer) clears **all** filters straight away through
  `resetFilters` and closes.
- **Focus:** when the drawer opens, it goes to the chosen filter's control, or to the
  "Filters" heading. On close, it returns to the chip or button that opened the
  drawer, or to the Filters button if that chip has gone.

## One "Clear filters"

There's one action with one behaviour: clear **all** filters **at once** with the
store's `resetFilters`.

- It has the same label and the same effect on the page and in the drawer.
- It doesn't take part in the drawer's draft.
- It also empties the search box, because that's what `resetFilters` does.

The earlier versions had a draft-only "Reset" / "Clear all" in the drawer next to a
page "Clear all" that applied at once. Two names for two different effects was
confusing, so that was dropped.

## Files

| File | Holds |
|---|---|
| `FilterBar.tsx` | Rows 1 and 2, chip overflow, drawer open/close and focus |
| `FiltersSheet.tsx` | The drawer: draft, groups, footer |
| `filter-defs.ts` | Filter order, labels, options, chip text, date conversion |

The previous step's Filter menu and pill popovers (`FilterPopover.tsx`,
`FilterEditor.tsx`) were removed.

## Known issues left unfixed

These were found in the pre-change audit and deliberately left alone:

1. **Immobilization options don't match the data.** Vehicles store `On` / `Off`, but
   the dropdown offers `Immobilized` / `Mobilized`. "Mobilized" never matches. The
   45 `Off` vehicles can't be filtered for.
2. **Date of Sale is a single exact day,** not a range.
3. **Odo Range has no validation.** From can be greater than To, and negative numbers
   can be typed.
4. **Tenant "None" matches no sample vehicle.** It only matches bikes provisioned
   without a tenant.
5. **Filters aren't kept in the URL** and reset on reload.
6. **Tenant and Store Code aren't linked,** so combinations that match nothing can
   be chosen.
7. **The shared `SelectField` doesn't link its label to its dropdown,** so screen
   readers don't announce the dropdown's name. The date and Odo fields carry their
   own `aria-label`.
