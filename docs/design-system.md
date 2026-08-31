# Zeno Asset Tracking — Design System

A small, reusable foundation extracted from the Asset Tracking screens. Every
brand and status colour lives in **one place**; every screen consumes tokens and
shared primitives rather than re-declaring hex values or dot colours.

## Tokens (`src/app/globals.css` → `@theme`)

Colours are Tailwind theme tokens, so they're available as utilities
(`bg-zeno-teal`, `text-zeno-red`, `ring-zeno-teal`, `bg-status-online`, …).

### Brand
| Token | Hex | Used for |
|---|---|---|
| `zeno-teal` | `#003B49` | Sidebar, primary surface actions (Apply, Login, Show on Map) |
| `zeno-teal-hover` | `#00505F` | Teal button hover |
| `zeno-red` | `#FF3B06` | Signature vermilion — logo, Export, Immobilize, active accents |
| `zeno-red-hover` | `#E03500` | Red button hover |
| `zeno-ink` | `#192E35` | Deepest text / dark surfaces |
| `zeno-stone` | `#E8E9E9` | Muted fills |
| `zeno-bg` | `#F6F7F8` | App canvas |

### Operational status — _the signature_
In a fleet-ops tool the dot's colour **is** the information. One map, read by
every badge, pill, and (future) map pin.

| Token | Hex | Meaning |
|---|---|---|
| `status-online` | `#22C55E` | Online · Immobilization Off (healthy) |
| `status-offline` | `#EF4444` | Offline · Immobilized (alert) |
| `status-gps` | `#FB923C` | GPS offline |
| `status-cloud` | `#FACC15` | Cloud offline |
| `status-idle` | `#94A3B8` | Unknown / no signal |

Status → colour/label maps live in **`src/lib/asset-status.ts`**.

## Typography
- **Work Sans** — display/headings, via `var(--font-display)` (sidebar, nav).
- **Geist Sans** — body & tabular data (default `body` font).

## Reusable components (`src/components/ui/`)

| Component | File | Purpose |
|---|---|---|
| `Button` (`primary`/`teal`/`outline`/`ghost`/…) | `button.tsx` | All actions. `primary`=red signature, `teal`=surface action |
| `ConnectivityBadge`, `ImmobilizationBadge`, `VehicleStatusPill`, `StatusDot`, `StatusLabel` | `StatusIndicator.tsx` | Status display — driven entirely by `asset-status.ts` |
| `Field`, `SelectField`, `TriggerField`, `SearchInput`, `SegmentedControl` | `FilterControls.tsx` | Form/filter controls with shared focus ring + chevron |
| `Modal`, `Pagination`, `Badge`, `Card` | existing | Reused as-is |

### Rule of thumb
Adding a new status, filter, or action? Extend the map/token — never re-declare
a hex value or a dot colour inline. If you're typing `#FF3B06` or `bg-green-500`
for a status, reach for a token or `asset-status.ts` instead.
