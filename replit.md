# Analysis Buddy V2 (The Broker Tool - B²)

## Overview
A Next.js 16 commercial real estate deal pipeline management application built with React 19, TypeScript, and Tailwind CSS 4. Features deal tracking, lease analysis, analytics, collaboration tools, and more. Uses local storage by default, with optional Supabase integration for cloud sync.

## Design System
- **Theme**: "Modern Institutional" — deep navy/slate base with warm gold/amber accents
- **Color palette**: oklch-based tokens in globals.css — navy primary, gold ring/accent, warm gray backgrounds
- **Light mode**: Warm whites/grays, deep navy primary buttons
- **Dark mode**: Deep navy backgrounds, lighter slate cards, amber accents
- **Typography**: Geist Sans / Geist Mono, antialiased rendering
- **Components**: shadcn/ui-style with CVA variants (button, card, badge, input, tabs, etc.)

## Project Architecture
- **Framework**: Next.js 16 with Turbopack (App Router)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS 4, Radix UI components, Lucide icons, Recharts
- **State**: Local storage (Supabase optional via NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **Node.js**: v22

## Project Structure
```
src/
  app/          - Next.js App Router pages and API routes
  components/   - React components (analysis, auth, charts, deals, etc.)
  context/      - React context providers (AuthContext)
  hooks/        - Custom hooks
  lib/          - Utility libraries
public/         - Static assets
docs/           - Documentation
```

## Key Components
- **AppContainer**: Main app shell with nav header and view switching
- **PipelineApp/Dashboard**: Deal pipeline with kanban and list views
- **LeaseAnalyzerApp**: UI layer for lease analysis (~4,977 lines, calculation-free)
- **DailyUpdateModal**: Daily deal status tracking

## Calculation Architecture
- **Single source of truth**: All financial calculations live in `src/lib/calculations/`
  - `cashflow-engine.ts` — `buildAnnualCashflow()` (canonical cashflow builder)
  - `metrics-engine.ts` — `npv()`, `npvFromFlows()`, `effectiveRentPSF()` (canonical metrics)
- **Monthly compounding**: All NPV uses monthly compounding internally (EAR → monthly rate conversion)
- **analysis-engine.ts** — orchestration layer, delegates to calculation engines
- **Types**: Canonical `AnnualLine` type in `src/types/cashflow.ts`
- **Conventions**: See `src/lib/calculations/CONVENTIONS.md` for rounding rules, escalation, and formulas

## Development
- **Dev server**: `npx next dev -H 0.0.0.0 -p 5000`
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Tests**: `npm test`

## Replit Configuration
- Frontend runs on port 5000 (0.0.0.0)
- `allowedDevOrigins: ['*']` configured in next.config.ts for Replit iframe proxy
- CSP headers adjusted to allow frame-ancestors for Replit preview
- X-Frame-Options set to ALLOWALL for iframe compatibility

## Recent Changes
- 2026-02-16: P0 Math Hardening complete — removed ~505 lines of duplicate calc engine from LeaseAnalyzerApp, unified NPV to monthly compounding, consolidated AnnualLine types, added 13 parity tests (159 total), documented financial conventions
- 2026-02-16: Premium UI redesign — "Modern Institutional" theme with navy/gold palette, polished components, refined header/nav, upgraded deal pipeline cards, premium login/signup pages, polished modals
- 2026-02-16: Initial Replit setup — configured Next.js for Replit environment
