# Asset Tracking list and filters: toolbar popovers, chips and columns

**Scope: UI only.** The store (`src/store/asset-tracking.ts`), data, filter logic,
sort logic, filter values, setters, option lists and `resetFilters` are unchanged.
Export still writes every field. Every filter holds a single value. List View and Map
View read the same filtered list, as before.

## How we got here

1. **Filter pills** (Jira / Shopify Polaris style), one popover per filter. These were
   dropped because this page usually sets several filters together, for example Status
   + Tenant + Connectivity. Each filter cost a full open → choose → pick → close round,
   three or four clicks.
2. **A side drawer** with every filter, a draft and Apply. It fixed the click count.
3. **A popover under the Filters button** (current). It keeps the drawer's content and
   draft rules, and now matches the Columns popover.

The pills' strengths were kept as chips: each active filter is visible, removable
with one click, and one click from its control.

## Why Filters and Columns are both popovers

- **They're the same kind of control:** a view setting for the list below them. They
  don't open new content, so they belong next to the button that opens them, not in a
  panel across the page.
- **They follow the same rules:**
  - A draft copied on open, and Apply to commit it.
  - Cancel, Esc and an outside click discard the draft.
  - The footer's left action acts at once, without waiting for Apply.
  
  Matching look and placement makes those shared rules obvious.
- **One pattern to learn.** With a drawer for one and a popover for the other, users
  had to learn two ways to do the same thing.
- **Neither covers the table.** The list stays in view while the setting is changed.

## Single value per filter

Each filter stays a dropdown with one value, as the store expects (`status: string`,
not `string[]`).

- **Checkbox lists** ("active or new") would need multi-select matching in the
  filter logic and array values in the store. That's a logic change, so it's
  **deferred**.
- **When it's taken on,** a chip's value would become a count or a joined list (for
  example `Status: active, new`). The popover's groups and order can stay as they are.

## Layout

**Row 1:**

- **Search:** `Search VIN, customer, phone, plate, IMEI…`.
  - Fixed at 384px (`sm:w-96`, full width on small screens).
  - Applies as you type.
- **Columns** button (`Columns3` icon), List view only. See
  [List columns](#list-columns).
  - When the visible set differs from the default, it shows the number of visible
    columns in a count badge (screen readers hear "Columns, 12 visible"). It shows
    nothing extra for the default set.
- **Filters** button (`SlidersHorizontal` icon).
  - While any filter is active, it takes the tinted selected style
    (`bg-zeno-teal/10 text-zeno-teal`, the tint used for selected rows and tags) with
    a tinted border (`border-zeno-teal/30`), and shows the count badge.
  - It's neutral when nothing is active. Search isn't counted.
- **Button style:**
  - Both use the shared `Button` (`outline`), with its hover and focus states, in the
    Swap Audit drawer's Previous/Next look: white, bordered, `text-slate-700` with the
    icon in the same colour.
  - At the default size plus the 1px border they're 38px tall, the same as the search
    box. Search, Columns and Filters form one group with 12px gaps.
- **Count badges** (Filters and Columns) are filled `zeno-teal`, the sidebar's dark
  navy, with white text (about 12:1). They replaced the earlier `zeno-red` Filters
  badge, which was only about 3.6:1 for 10px text.
- **Border contrast:** the toolbar border is `slate-300`, on the buttons and the
  search box alike.
  - The Swap Audit buttons' `slate-200` was about 1.2:1 against the slate-50 page,
    which made the group hard to see.
  - `slate-300` (the outline `Button`'s own border) is about 1.4:1. That's still
    under the 3:1 that WCAG 1.4.11 asks for when a border is what identifies a
    control. Here the text labels identify the buttons, and `slate-300` was chosen
    as the visible-but-light option.
  - `slate-500` (about 4.6:1) is the nearest existing token that would pass 3:1, if
    that's ever required.
  - `globals.css` maps only `border-slate-200` for dark mode, so in dark mode these
    `slate-300` borders stay light grey.
- **Export**, on the right, unchanged.

**Row 2** is only shown while at least one filter is active; nothing is reserved
otherwise:

- **One chip per active filter,** in this fixed order (not the order they were
  added): Status, Connectivity, Immobilization, Tenant, Store Code, Date of Sale,
  Odo Range, VCU, ZeConnect, EVCC.
  - The order goes from what the vehicle is doing now, to who owns it, to its
    history, to firmware. So the filters operators ask about first lead the row and
    are the last to overflow.
- **Clear filters** (✕ and text) comes after the chips, in the app's existing link
  style (`text-zeno-teal font-medium hover:underline`, 12.2:1). It used to be
  `text-slate-500`, which passed (4.76:1) but read as disabled.
- **Chip:** tinted "Field: value", plus a separate × button.
  - **Clicking the chip** opens the Filters popover with focus on that filter's
    control. The popover is still anchored to the Filters button, not the chip.
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
- **"+N more"** opens the Filters popover, where every filter is visible.
- **The count is recalculated** whenever the row's width or the chips change.

## The shared popover

`ToolbarPopover.tsx` is the one shell both popovers use, so they look and behave the
same.

- **Structure:**
  - **Title row:** a caption-style title only. There's no ✕.
  - **Middle:** the only part that scrolls.
  - **Footer:** stays put. A text action on the left, in the teal link style;
    **Cancel** (`outline`, small) and **Apply** (`primary`, small) on the right.
  - **Apply** uses the same `primary` Button variant as Export: filled `zeno-red`
    (#FF3B06), the brand orange-red. Disabled, it's the same colour at 50% opacity.
- **Style:** `border-slate-200`, `rounded-xl`, `shadow-lg`, white, with the same
  16px side padding in every section.
- **Size:** Filters is 560px wide and Columns is 280px (`w-70`). Both are capped at
  70% of the window's height, and less if the window runs out below.
  - The footer buttons are the small size so that "Reset to default", Cancel and
    Apply fit in 280px. Filters uses the same size to match.
- **Placement:** fixed under its button, left-aligned to it, and moved left if it
  would run off the right edge.
  - It floats over the page, so it never moves or clips the table.
  - It's rendered in place inside `<main>`, so the dark-mode overrides in
    `globals.css` reach it.
- **One at a time:** `FilterBar` tracks which popover is open. Each is only
  rendered while open, so opening the other one (or closing this one) throws its
  draft away.
- **Dismissal:** Cancel, Esc and an outside click all discard the draft and close.
  - There's no ✕. Cancel sits in the fixed footer, so it's always in view, and a
    second close control would do the same thing.
- **Native controls:** the browser draws open dropdown lists and date pickers above
  the page. Using them isn't an outside click, because the control they belong to is
  inside the popover.
- **Focus and keyboard:**
  - On open, focus moves to the chosen filter's control (when a chip opened it), or
    the first control.
  - Tab stays inside while the popover is open.
  - On close, focus returns to the button or chip that opened it, or to the Filters
    button if that chip has gone. An outside click that lands on another control
    leaves focus there.
  - The popover is a `dialog` named by its title. Its button has
    `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.

## Filters popover

- **Groups,** in the same order as the chips, with caption-style headings, all
  expanded so no applied value is ever hidden.
- **Layout:** a six-part grid, so groups of three run three across, groups of two
  run two across, and no cell is empty:
  - **Vehicle:** Status | Connectivity | Immobilization
  - **Ownership:** Tenant | Store Code
  - **Usage:**
    - Date of Sale: one date field with a clear button, in one cell. It's a single
      day, and writes the same `07 May 2026` text the filter matches on.
    - Odo From and Odo To: side by side, sharing the other cell. An empty field
      means no limit at that end.
  - **Firmware:** VCU | ZeConnect | EVCC
- **Controls** are the existing `SelectField` and the same field style. On the
  three-across rows, a long value such as "ImmobilizedRequestSent" is cut off while
  the dropdown is closed, and shows in full when it's open.

### Draft and footer

- **Draft:** edits go to a draft copied from the store when the popover opens, and
  nothing reaches the table until **Apply**.
- **Apply:**
  - It's disabled while the draft would apply exactly the filters already in place.
    The comparison uses the values Apply would write, not the field text, so "0100"
    over an applied 100 counts as unchanged.
  - Otherwise it reads `Apply · N`, where N is the number of filters active in the
    draft. It reads plain `Apply` when the draft has none.
  - It writes only the changed filters through the existing setters, then closes.
- **Clear filters** (left of the footer) clears **all** filters straight away through
  `resetFilters`, and the popover **stays open**.
  - The fields reset to "All" to show the cleared state, so Apply has nothing left
    to do and is disabled.
  - The user can pick new filters from a clean slate without reopening.
  - Focus stays on Clear filters.

## One "Clear filters"

There's one action with one behaviour: clear **all** filters **at once** with the
store's `resetFilters`.

- It has the same label and the same effect on the page and in the Filters popover.
- It doesn't take part in the popover's draft. In the popover, it also resets the
  fields, and it doesn't close the popover.
- On the page, focus moves to the Filters button, because the chips row it sat in
  disappears.
- It also empties the search box, because that's what `resetFilters` does.

Earlier versions had a draft-only "Reset" / "Clear all" in the drawer next to a
page "Clear all" that applied at once. Two names for two different effects was
confusing, so that was dropped.

## List columns

### Column set and default

**All columns, in order:** VIN, Plate, Customer Name, Customer Phone, Tenant, Status,
Connectivity, Immobilization, Date of Sale, IMEI, Store Code, Odo, VCU, ZeConnect,
EVCC.

- **Every field the table showed before is still there.** The separate Last Connected
  column is folded into Connectivity.
- **Connectivity** shows the existing badge, with the last connection underneath in
  the secondary text style, as an age: `just now`, `5 min ago`, `3 h ago`, `3 d ago`.
  - The age is calculated from the stored timestamp each time it's shown, and moves
    on every minute.
  - Hovering it shows the exact time (`01 Sep 2026, 13:01 EAT`). Screen readers get
    the exact time too.
  - The stored text has no timezone. Every vehicle is in Kenya, so it's read as EAT
    (UTC+3), as Swap Audit labels its times.
- **Customer Name and Customer Phone** stay separate columns.
- **Visible by default:** VIN, Plate, Customer Name, Customer Phone, Tenant, Status,
  Connectivity, Immobilization, Date of Sale, IMEI. These identify a vehicle and its
  owner and give its current state.
- **Hidden by default:** Store Code, Odo, VCU, ZeConnect, EVCC. These are needed for
  particular jobs, such as store reconciliation, service, and firmware rollout, and
  are one tick away.

### Column picker

- **"Columns"** sits between search and Filters, and only shows in List view, since
  columns don't apply to the map.
- **Popover:** the shared popover, 280px wide. It holds a checkbox list (the
  existing `Checkbox`) in column order.
  - VIN is always checked and disabled, so a row can always be identified.
  - The list keeps column order, whatever order boxes are ticked in.
- **Draft:** opening copies the current columns into a draft. Ticking changes only
  the draft, and the table doesn't change until Apply.
- **Footer:**
  - **Reset to default** (left) restores the default set straight away and saves it.
    The popover **stays open**, as with Clear filters.
    - It isn't a draft action. The boxes reset to the default set, so Apply has
      nothing left to do and is disabled.
  - **Apply** is disabled while the draft matches the columns showing. Otherwise it
    shows the draft's columns and saves them (see Persistence).
- **Not `ColumnFilterPanel`:** that component (used on Data → Vehicles) can't lock
  VIN or reset, and uses the Filters icon. Changing it would change that page too.

### Persistence: per browser, for now

- **The selection is saved in `localStorage` on Apply** (and on Reset to default),
  keyed by the signed-in user's ID
  (`zeno:asset-tracking:columns:<userId>`). So it's per user on each browser.
- **Every read and write is wrapped in `try`/`catch`.** If storage is unavailable, as
  in a private window or with blocked site data, the selection still works for the
  visit (it's kept in memory), and the next visit starts from the default.
- **Anything unreadable falls back to the default.** Unknown column IDs are dropped,
  and VIN is always included.
- **Suggested for later:** account-level persistence, so the selection follows a user
  across browsers and devices. It needs a backend preference store, so it's out of
  scope here.

### Sorting

Only **Customer Name, Connectivity, Date of Sale and Odo** have sort controls. They
use the store's existing `setSort`, which compares numbers as numbers and everything
else as text.

- **Ordered values sort:** a name, a date, a distance, a connection state. Sorting
  answers "who's first", "what sold most recently" and "what has the most km".
- **Categories use filters:** Status, Immobilization, Tenant, Store Code and firmware
  have a handful of values. Sorting them only groups rows, and a filter does that
  better.
- **Identifiers use search:** VIN, Plate, Phone and IMEI. Nobody scans these in
  order; they're looked up.

Each sortable header is a real button, so it works from the keyboard, and the column
carries `aria-sort`. The other headers are plain text.

The Date of Sale and Connectivity sorts have known problems. See items 8 and 9
under Known issues.

### Column widths

**Each column has a fixed width.** It's sized to the longest current value or its
header, whichever is wider. Sortable headers add 16px for the arrow.

- **How they were measured:** with the app's own fonts. Geist widths come from the
  font file in `next`. Geist Mono is fixed at 7.2px per character at 12px.
- **What's included:** each width includes the compact cell padding used throughout
  (`px-3`, 12px each side). Widths are rounded up to 4px. The ID columns that fit
  exactly get 4px to spare.
- **Text is kept on one line** (`whitespace-nowrap`).
- **The widths live in `vehicle-columns.ts`.**

| Column | Kind | Longest value now | Width |
|---|---|---|---|
| VIN | ID, mono | `ME92ZPSAB1J000542` | 152 |
| Plate | ID, mono | `KMGS921G` | 84 |
| Customer Name | Text, truncates past 128px | `Samuel Kariuki Muraya` (the only one cut off) | 152 |
| Customer Phone | Number | `254-769764550` | 132 |
| Tenant | Text, fits all | `zeno-internal/demo_bikes` | 200 |
| Status | Pill | `active` | 76 |
| Connectivity | Dot and label, age below | `Cloud offline`; the header with its arrow | 124 |
| Immobilization | Dot and label | `Immobilized` (the mis-typed value); real labels max out at `Req sent` | 120 |
| Date of Sale | Date | The header with its arrow (wider than `11 Jan 2026`) | 112 |
| IMEI | ID, mono | 15 digits | 136 |
| Store Code | ID, mono | `ke-nbo-mbsa-wtu` | 136 |
| Odo | Number, right-aligned, digits line up | `46,569`; room for `999,999` | 80 |
| VCU | ID, mono | `2.2.5 (1)` | 92 |
| ZeConnect | ID, mono | `1.0.0dev1 (177)` | 136 |
| EVCC | ID, mono | `1.0.5dev1 (2)` | 120 |

**The rules behind the table:**

- **IDs** (VIN, Plate, IMEI, Store Code, firmware) are monospace and always shown in
  full. Plate and Store Code moved to monospace to match the other IDs.
- **Text:**
  - Customer Name truncates past 128px of text with an ellipsis, and shows the full
    name on hover. That fits 51 of the 52 names.
  - Tenant fits every value (176px of text). The internal tenants differ only at the
    end (`zeno-internal/demo_bikes`, `/test_bike`, `/pd_bikes`), so truncating would
    hide exactly what tells them apart. It still truncates, with the full value on
    hover, if a longer tenant is added.
- **Badges** fit their widest label.

**Layout:**

- **Same width whatever is visible.** The table uses a fixed layout, so a column is
  the same width whichever others are showing. A blank last column takes any spare
  width.
- **Sideways scrolling only when needed.** The table is at least as wide as its
  visible columns added together, so it scrolls sideways only when they don't fit.
  - The 10 default columns come to 1,288px. On a 1440px screen with the sidebar
    open, about 1,170px is available, so the default view scrolls about 120px.
  - That was accepted to keep the default set. It fits from about a 1,560px window,
    or with the sidebar collapsed.
- **Widths need re-checking when data changes.** They're fitted to today's sample
  data. If real data brings longer values (a longer tenant, a 7-digit odometer),
  re-measure. Fixed widths don't grow, so an untruncated ID would spill into the
  next cell.

### Copy fields

**VIN, Plate, Customer Phone and IMEI** use the shared `CopyButton`, as on Swap Audit
and Tampering Alerts.

- The icon appears when the value is hovered or focused, and takes no space.
- It stops the click and the key press, so copying never opens the vehicle page.
- Clicking anywhere else in the row still opens the vehicle page.
- Empty values show "–" and have no copy button.

## Files

| File | Holds |
|---|---|
| `FilterBar.tsx` | Rows 1 and 2, chip overflow, which popover is open, focus return |
| `ToolbarPopover.tsx` | The shared popover: placement, title / body / footer, dismissal, focus |
| `FiltersPopover.tsx` | Filters content: draft, grid, Clear filters, Apply · N |
| `filter-defs.ts` | Filter order, labels, options, chip text, date conversion |
| `VehicleTable.tsx` | The list: fixed-width columns, cells, sort headers, copy, last-connected age |
| `ColumnPicker.tsx` | Columns content: draft checkbox list, Reset to default |
| `vehicle-columns.ts` | Column order, labels, widths, defaults, sort keys, saved selection |

Removed along the way: the pill menu and popovers (`FilterPopover.tsx`,
`FilterEditor.tsx`), and the side drawer (`FiltersSheet.tsx`).

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
8. **Date of Sale sorts as text, not as a date.** `"07 May 2026"` is compared
   alphabetically, so the day comes first: "01 Sep 2026" sorts before
   "07 May 2026". Fixing it means comparing dates in the store's sort, which is a
   logic change.
9. **Connectivity sorts by status name only** (CloudOffline, GpsOffline, Offline,
   Online), not by last connection. The stored last-connected text has the same
   day-first problem as Date of Sale, so no time-ordered sort exists yet.
10. **A hidden column can still be the sort column.** Hiding a sorted column (Odo, for
    example) leaves the rows in that order with no arrow showing. The store's
    `setSort` can only toggle direction, not clear the sort.
