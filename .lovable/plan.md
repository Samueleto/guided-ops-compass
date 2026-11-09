# Domain Manager AI — Frontend Plan

Frontend only. No Lovable Cloud or other hosted backend. Everything goes through a typed REST client that points at your Vultr Node.js API (`VITE_API_BASE_URL`). Until that API exists, a clearly labeled **Demo mode** adapter supplies the data.

## 1. Visual direction

- **Look:** Linear/Vercel style. Deep navy surfaces, indigo-to-violet accent gradient, crisp white cards in light mode. A faint grid/noise texture behind headers.
- **Type:** Geist-style pairing: "Sora" for headings, "Manrope" for body, "JetBrains Mono" for domains, URLs and timestamps.
- **Tokens:** Every color lives in `styles.css` as oklch: background, surface, elevated, primary (indigo), primary-glow (violet), plus status colors (ready, preparing, waiting, attention, in-use, used, failed), gradients and glow shadows. Light and dark modes, with a toggle that is remembered.
- **Motion:** Subtle and quick, 150–300ms. Steps slide when a wizard moves forward, checkmarks draw themselves in, live stages have a pulsing ring, small pulsing dots mark live items, and data loads behind skeleton shimmers.
- **Layout:** A collapsible icon sidebar on desktop, an icon rail on tablet, and a bottom tab bar plus drawer on mobile. The top bar has search, a Demo/Live badge, AI status, a theme toggle and a "Ask AI" button.

## 2. Pages

```text
/                 Dashboard
/buy              Buy & Prepare wizard (4 steps)
/domains          Inventory (search, filters, pagination)
/domains/$name    Domain detail
/rotation         Rotation wizard (4 steps) + schedules + history
/ai               AI Operations Assistant
/activity         Activity & History
/settings         Tabs: Namecheap, Cloudflare, Simple Kuma, OpenRouter, Automation, Connection (API URL / Demo-Live)
```

Each page gets its own title and description for sharing previews.

### Dashboard
- Stat cards: total, READY, active domain, USED, preparing, next rotation countdown, Namecheap balance.
- An **AI Operations Status** panel with three states: monitoring, investigating or assisting. It shows the current focus and a link to the AI page.
- An integration health grid (Namecheap, Cloudflare, Simple Kuma, OpenRouter) with latency and the time of the last check.
- Background jobs that are running now, with live progress.
- A recent activity feed plus a strip of recent recoveries.
- Quick actions: Buy Domains, Rotate Domain, Ask AI, View Activity.

### Buy & Prepare wizard
A shared `Wizard` shell: a stepper at the top, one step card at a time, and a sticky footer for actions.
1. **Quantity:** A 1–10 slider/stepper, locked to `.shop` with a $2 cap per domain. It shows the next sequential names (simi84, simi85…), estimated total, Namecheap balance and a budget bar. A warning appears if the balance is too low.
2. **Availability:** A grid of selectable cards showing available, price, premium flag and issues. Names that are unavailable, premium, over $2 or bought before are excluded automatically and shown as "skipped" with the reason.
3. **Execution:** A live tracker with a "Domain 2 of 10" header and an overall progress ring. It runs the 8 stages: purchase, CF zone, nameservers, activation wait, SSL/settings, Worker attach, landing check, READY. Each stage has a state (pending, running, waiting, done, attention, failed), elapsed time and a plain-language message. If something fails it shows "Needs attention" with actions: Retry stage, Skip domain, Ask AI.
4. **Completion:** A success screen listing the prepared domains, with View READY Domains and Prepare More buttons.
- The current job ID is saved locally. On a refresh, the page reattaches to the backend job and polls or streams it. Progress always comes from the job's status, so nothing is invented.

### Inventory
- Search, status filter chips with counts (READY, PREPARING, WAITING, ACTION REQUIRED, IN USE, USED, FAILED), sort, and a grid/table view toggle with pagination.
- Each card shows the name, registered and expiry dates, verification, Worker link, usage history and actions (View, Retry prep, Use for rotation, Ask AI).
- USED is permanent: the card is locked and cannot be rotated into again.
- Detail page: a stage timeline, DNS/SSL/Worker checks, rotation history and related activity.

### Rotation wizard
1. **Choose domain:** A big READY count, then a searchable list of 10 or more radio cards with an "Auto-select next eligible" option.
2. **Verify Kuma:** Connection status, the current landing URL and the new one (`https://{domain}/adultp/` exactly), side by side as a diff.
3. **Schedule:** Two large mode cards. **Rotate Once**, or **Automatic** at every 30m, 1h or 2h, a custom interval, daily at a time, or weekly on a day and time. Includes a timezone picker, a preview of the next 3 runs and a plain-English summary.
4. **Review & Track:** A summary, then a Rotate Now or Enable Schedule button. An immediate rotation shows a live 7-stage tracker in the same place. For a schedule, the screen shows "Schedule active, waiting for first run", which is different from a completed rotation. If no domains are left, a "Waiting for domains" state keeps the last working URL.
- Below the wizard: active schedules (pause, resume, delete) and the execution history.

### AI Operations Assistant
- Three panes on desktop, stacked tabs on mobile: a conversation list and suggested prompts | the chat | an operation inspector (tool calls, findings, timeline).
- Message blocks are their own components: Investigating, API check (per provider), Diagnosis (cause + evidence), Recommended fix (one-click action button), Auto-recovery (running), Recovery success, and Owner action required.
- Each tool call shows a status chip that comes from the backend's tool events. In demo mode, every AI card is marked "Demo".
- Answers stream in through SSE.

### Activity
- A timeline grouped by day, with search, filters for type and status, and a date range.
- Each entry expands to show its steps, raw details (collapsed) and a plain-language explanation of any error. Links go to the domain or AI chat involved.

### Settings
Tabbed forms that save to the backend. Credentials are never stored in the browser: key fields are write-only, showing "•••• set" after saving, and are sent to the backend once.
- **Namecheap:** API user and username, client IP, a test connection button, the price cap, and the name prefix plus next number.
- **Cloudflare:** Account ID, Worker name and route pattern, and default SSL mode.
- **Simple Kuma:** Base URL, the ADP campaign/landing ID, and the `/adultp/` path shown read-only.
- **OpenRouter:** Status, primary and fallback model pickers, monitoring toggles and a usage chart.
- **Automation:** Default quantity, rotation defaults, timezone and notifications.
- **Connection:** API base URL, the Demo/Live switch and a health check.

## 3. Component architecture

```text
src/
  lib/api/
    types.ts          Domain, Job, Stage, Rotation, Schedule, Activity, AiMessage, Integration...
    client.ts         fetch wrapper (base URL, errors, timeout, JSON), SSE helper
    endpoints.ts      typed functions: domains.list, purchase.quote, purchase.start, jobs.get/stream,
                      rotation.run, schedules.*, ai.chat (stream), activity.list, settings.*, health
    adapter.ts        picks live vs demo by setting
    demo/             in-memory demo store + stage-by-stage job simulator (labeled demo)
  lib/queries/        TanStack Query options/hooks per resource
  lib/stores/         wizard persistence (localStorage: jobId + step), theme, mode
  components/
    layout/           AppSidebar, Topbar, MobileNav, ModeBadge, PageHeader
    wizard/           Wizard, Stepper, StepCard, WizardFooter
    progress/         StageTracker, StageRow, ProgressRing, LiveDot, ElapsedTimer
    status/           StatusBadge, IntegrationPill, EmptyState, ErrorState, Skeletons
    domains/          DomainCard, DomainTable, DomainFilters, DomainTimeline
    rotation/         SchedulePicker, NextRunsPreview, UrlDiff
    ai/               ChatPanel, MessageBubble, ToolCallCard, DiagnosisCard, RecoveryCard,
                      ActionRequiredCard, AiStatusOrb, PromptSuggestions
    activity/         ActivityItem, ActivityFilters
  routes/             one file per page above
API_CONTRACT.md       endpoint list + payload shapes for Codex
```

The API contract is written down in `API_CONTRACT.md`, using REST + JSON, with SSE at `/jobs/:id/stream` and `/ai/chat`. It falls back to polling every 2s. The frontend builds as a static/SSR bundle you can deploy on Vultr.

## 4. Implementation phases

1. **Foundation:** Design tokens, fonts, theme, app shell (sidebar, topbar, mobile nav), API types/client/adapter, the demo store and Settings → Connection.
2. **Dashboard + Inventory + Domain detail.**
3. **Buy & Prepare wizard:** The full 4 steps, the live tracker, recovery actions and resume after a refresh.
4. **Rotation wizard:** Schedules, live tracker, waiting-for-domains state and history.
5. **AI Operations Assistant:** Chat, streaming, tool and recovery cards, and the inspector.
6. **Activity + the remaining Settings tabs.**
7. **Polish:** Responsive checks, empty/error/loading states everywhere, motion, `API_CONTRACT.md`, and small tests for the business rules (the $2 cap, .shop only, sequential naming, USED is permanent, the `/adultp/` URL, next-run calculation).

## Open points (defaults if you don't say otherwise)
- Naming prefix "simi" with a configurable start number.
- Default timezone Africa/Lagos.
- Streaming via SSE, with polling as the fallback.
