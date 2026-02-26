# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
```

No test or lint commands are configured.

## Architecture

This is a **Next.js 15 / React 19 / TypeScript prototype** for an analytics dashboard showing product listing statistics (Russian-language UI). The app renders a single fixed right-side drawer (920px) with synchronized interactive charts.

### Data Flow

1. `StatisticsDrawer` loads daily stats from `lib/item_stats/item1.json` (30 days of impressions, views, contacts, spending, VAS periods)
2. Mouse hover on any chart column triggers shared `hoverIndex` state → syncs overlay across all chart sections, date scale, and VAS timeline
3. `useLayoutEffect` calculates tooltip position and overlay X coordinates reactively
4. `BarChart` normalizes data to a 0–100 scale for stacked segment rendering
5. `VasGantt` converts Unix timestamp ranges to visual timeline segments
6. `ChartTooltip` renders a floating breakdown of the hovered column's data

### Key Components

- [components/StatisticsDrawer.tsx](components/StatisticsDrawer.tsx) — Root component managing all state (hover, tooltip, overlays) and layout
- [components/BarChart.tsx](components/BarChart.tsx) — Reusable stacked bar chart for 4 metrics
- [components/VasGantt.tsx](components/VasGantt.tsx) — Gantt-style timeline for VAS promotional service periods
- [components/ChartTooltip.tsx](components/ChartTooltip.tsx) — Floating tooltip component
- [lib/data.ts](lib/data.ts) — Chart color schemes, metadata, and 30-day sample dataset
- [lib/utils.ts](lib/utils.ts) — Russian date labels and number formatting (non-breaking spaces, commas)
- [lib/item_stats/](lib/item_stats/) — Per-item daily stats JSON files (`item1.json`, `item2.json`, `item3.json`)

### Import Alias

`@/*` maps to the project root (e.g., `@/lib/utils`, `@/components/BarChart`).

### Styling

All styles are in [app/globals.css](app/globals.css) — vanilla CSS with no utility framework. The drawer is a fixed right-side panel. Font: Manrope (Latin + Cyrillic, weights 500 and 800).

## Session Hygiene

At the end of each session, update this file to reflect any architectural changes, new patterns, or commands discovered during the session.

### Figma Integration

The project has Figma MCP enabled via `.claude/settings.local.json`. Use `mcp__figma__get_design_context` when working from Figma designs.
