# ADR-002: Frontend Stack & Component Library Selection

## Status: Accepted

## Date: 2026-03-08

## Context

The project requires a polished, production-quality dashboard UI. The brief specifies Next.js + TypeScript + Tailwind CSS. We need to select the right combination of component libraries to achieve SaaS-quality polish efficiently.

## Decision: Component Library Stack

### Core Foundation: shadcn/ui

**Why**: Not a traditional component library — it's copy-paste components built on Radix UI primitives. This gives us:

- Full ownership of components (no version lock-in)
- Tailwind CSS native (matches their stack)
- Accessible by default (Radix primitives)
- Theming via CSS variables (dark/light mode free)
- The industry standard for modern Next.js apps

**Components we'll use from shadcn/ui:**

- `Table` — document list
- `Form` + `Input` + `Select` — extraction editing
- `Dialog` / `Sheet` — modals and side panels
- `Badge` — status indicators
- `Card` — dashboard stats
- `Command` — search palette (Cmd+K)
- `Tabs` — detail view sections
- `Tooltip` — confidence score explanations
- `Skeleton` — loading states
- `Toast` (sonner) — notifications
- `DropdownMenu` — actions
- `Calendar` + `DatePicker` — date range filter

### Data Table: TanStack Table (React Table v8)

**Why**: The document list is the core UI. We need:

- Server-side sorting and pagination
- Column visibility toggles
- Faceted filtering
- Row selection for bulk actions
- shadcn/ui has a built-in data-table recipe using TanStack Table

### Charts: Recharts + Evil Charts styling

**Why**:

- Evil Charts is built on shadcn + Recharts — gives us beautiful pre-styled charts
- Recommended by shadcn himself
- Perfect for the extraction accuracy analytics feature
- Area charts, bar charts, pie charts for the analytics dashboard

### Animations: Framer Motion

**Why**:

- Page transitions between dashboard → detail view
- Upload drag-and-drop interactions
- Confidence score reveal animations
- Micro-interactions that make the app feel premium
- Industry standard for React animation

### File Upload: react-dropzone

**Why**:

- Battle-tested drag-and-drop file upload
- File type validation
- Progress tracking
- Small bundle size

### Loaders: LDRS (uiball)

**Why**:

- 48 beautiful, lightweight loader components
- React + web component support
- Will use for: document processing state, page transitions
- Specific loaders: `Waveform` for processing, `Ring` for general loading

### Additional Enhancement Libraries

- `nuqs` — URL state management for search/filter params (shareable URLs)
- `date-fns` — date formatting and range calculations
- `lucide-react` — icon library (shadcn/ui default)
- `next-themes` — dark/light mode
- `react-pdf` or `@react-pdf-viewer/core` — PDF preview in detail view
- `cmdk` — command palette for power users

### Typography & Fonts

- **Primary**: Inter (clean, professional, SaaS standard)
- **Monospace**: JetBrains Mono (for reference numbers, codes)
- Both available via `next/font` (zero layout shift)

### Theming: tweakCN

**Why**:

- Visual theme editor for shadcn/ui components
- Real-time preview of color schemes and component variants
- Generates production-ready CSS variables
- Simplifies creating a professional, cohesive color palette
- Ensures consistent theming across all shadcn components
- Allows rapid iteration on brand colors without manual CSS variable management

**Usage**:

- Use tweakCN to establish primary/secondary colors, radius, and semantic colors
- Export theme configuration to `globals.css`
- Maintain theme tokens for light/dark modes

## Rejected Alternatives


| Library       | Why Rejected                                                           |
| ------------- | ---------------------------------------------------------------------- |
| Kibo UI Table | Good but shadcn + TanStack Table is more flexible                      |
| Skiper UI     | Premium/paid components — licensing concern for open-source submission |
| KokonutUI     | Beautiful cards but niche — shadcn cards are sufficient                |
| Cult UI       | Interesting effects but too experimental for a business app            |
| ReactBits     | Great for creative sites, too playful for freight/logistics SaaS       |
| SmoothUI      | Limited component set, newer library                                   |
| PatternCraft  | Background patterns — may use subtly but not core                      |


## Design Principles

1. **Information density**: Logistics users need to see lots of data — no excessive whitespace
2. **Professional palette**: Slate/zinc grays, blue-600 primary, semantic colors for status
3. **Scannable**: Bold numbers, clear hierarchy, consistent alignment
4. **Fast**: Skeleton loading, optimistic updates, minimal layout shift

## Consequences

- shadcn/ui components are copied into project (larger codebase but full control)
- Must maintain consistent theming across all components (simplified by tweakCN)
- Framer Motion adds ~30KB to bundle (acceptable for the UX gain)
- Need to configure Tailwind theme tokens upfront (tweakCN streamlines this process)
- tweakCN provides a visual workflow for theme adjustments without manual CSS editing
