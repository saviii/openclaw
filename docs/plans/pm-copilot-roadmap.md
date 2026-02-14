# PM Co-Pilot: Solo Founder Roadmap

## Quick Reference

**Approach**: Fork OpenClaw and customize for PM use case
**Primary Feature**: Slack-based bug triage and tracking
**Initial Integration**: Jira
**Target User**: Product Managers at startups and growth companies

---

# PRIORITIZED MILESTONE ROADMAP

This roadmap is designed for a **one-person company**. Each milestone is:

- Self-contained and delivers value
- Ordered by priority (do M1 before M2)
- Estimated for solo execution
- Has clear "done" criteria

---

## M1: Fork & Minimal Viable Product (MVP)

**Priority**: 🔴 Critical - Do First
**Effort**: 2-3 weeks
**Goal**: Working bug triage from Slack to Jira
**Status**: ✅ Complete — Jira extension, bug-triage skill, extension cleanup, rename to Kairo, README, and Slack→Jira e2e tests all done.

### Tasks

- [x] Fork OpenClaw repository
- [x] Rename project to Kairo (package.json, CLI name, banner, legacy compat)
- [x] Remove unused extensions (33 removed, keeping: slack, memory-lancedb, jira)
- [x] Create `/extensions/jira/` with basic API client
- [x] Implement 4 Jira tools: create, search, update, transition issue
- [x] Implement comment support on update and transition actions
- [x] Create `/skills/bug-triage/` skill
- [x] Test end-to-end: Jira API verified (create, search, update, transition, comment)
- [x] Add unit tests (28 tests: api.test.ts + tool.test.ts)
- [x] Write basic README for self-hosting
- [x] Test end-to-end: Slack message → Jira ticket (channel-config skill routing, triage-flow, e2e integration tests)

### Done When

✅ User posts bug in Slack → AI creates Jira ticket with correct details
✅ Bot responds in Slack thread with Jira link
✅ Can self-host via `docker compose up`

### What Was Built (completed)

```
extensions/jira/
  ├── package.json             # @openclaw/jira workspace package
  ├── openclaw.plugin.json     # Plugin manifest (env-only config supported)
  ├── index.ts                 # Plugin entry: config parsing, env var fallback, tool registration
  └── src/
      ├── types.ts             # JiraConfig, JiraIssue, JiraSearchResult, JiraTransition, etc.
      ├── api.ts               # JiraClient: REST API v3, Basic Auth, ADF conversion, /search/jql
      ├── api.test.ts          # 14 unit tests (auth, CRUD, error handling)
      ├── tool.ts              # Single tool with action enum (create/search/update/transition)
      └── tool.test.ts         # 14 unit tests (validation, defaults, comment wiring, transitions)

skills/bug-triage/
  └── SKILL.md                 # Triage process, priority guide (P1-P4), tool examples, Slack template
```

**Key implementation notes for the next engineer:**

- Uses Jira Cloud REST API v3 with the new `/search/jql` endpoint (old `/search` was removed by Atlassian in 2025)
- Description fields use Atlassian Document Format (ADF) — `textToAdf()` helper in api.ts
- Config resolves from `pluginConfig` first, then falls back to env vars: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`, `JIRA_DEFAULT_ISSUE_TYPE`
- The `openclaw.plugin.json` has no `required` array — validation is handled in `jiraConfigSchema.parse()` to allow env-only config
- Transition matching is case-insensitive; returns available transitions if no match found
- Tested against a live Jira Cloud instance (savipablas.atlassian.net, project SCRUM)

### What Remains (for next engineer)

1. **Fork & rename** — Fork the repo, update package.json name/branding, CLI help text
2. **Extension cleanup** — Remove unused extensions (keep: slack, memory-lancedb, jira)
3. **Skill cleanup** — Audit 54 skills, keep ~10 relevant ones + bug-triage
4. **Slack integration test** — Configure Slack channel and test full Slack→Jira flow
5. **Self-hosting README** — Docker compose setup, env var documentation

---

## M2: Cloud SaaS Control Plane (was: Web Dashboard Polish)

**Priority**: 🔴 Critical
**Effort**: 1-2 weeks
**Goal**: Non-technical users can sign up and get a working Kairo instance in < 5 minutes
**Status**: ✅ Complete — Cloud control plane built, locally verified, and optimized

### Post-Build Verification & Optimization

After M2 code completion, we ran the full stack locally and verified end-to-end:

- [x] Gateway starts locally with Slack + Jira extensions loaded (`node kairo.mjs gateway`)
- [x] Jira credentials verified against live API (`/rest/api/3/myself`)
- [x] All 33 Jira unit tests pass (api, tool, triage-flow)
- [x] Slack Socket Mode connects and receives messages
- [x] Full Slack→Jira triage flow verified: bug posted in Slack → Jira ticket created (SCRUM-7) with correct priority, labels (`slack-triage`), and description
- [x] **Fix: thread replies** — set `replyToMode: "all"` so bot replies as a thread on the original message instead of a new channel message
- [x] **Optimization: faster triage** — rewrote SKILL.md to use parallel tool calls (search + create in single LLM turn), reducing from 3 LLM round-trips to 1-2

### Architecture Decision

Instead of polishing the existing Lit/Vite UI (which still requires self-hosting), we built a **separate cloud control plane** (`kairo-cloud/`) that provisions per-user Kairo containers on Railway. This directly achieves the PM-friendly onboarding goal without requiring users to run anything locally.

### Tasks

- [x] Build Next.js 15 control plane app (`kairo-cloud/`)
- [x] Set up Clerk auth (sign-up, sign-in, Google OAuth)
- [x] Set up Turso database + Drizzle ORM (users, integrations, instances tables)
- [x] Build Slack OAuth flow (Connect Slack → bot token stored encrypted)
- [x] Build Jira OAuth flow (one-click connect, replaces manual credential form)
- [x] Build Railway provisioning API (creates per-user container with env vars)
- [x] Build 3-step onboarding wizard (Slack → Jira → Deploy)
- [x] Build dashboard (instance status, integration cards, quick start guide)
- [x] Build settings page (reconnect integrations, delete instance)
- [x] Build landing page with feature highlights
- [x] Add `/health` endpoint to Kairo gateway for container health checks
- [x] Create `scripts/start-cloud.sh` cloud startup script

### Done When

✅ User can set up Slack + Jira via browser in < 5 minutes
✅ No JSON editing or CLI commands required for setup
✅ Per-user Kairo container provisioned automatically on Railway

### What Was Built

```
kairo-cloud/                      # Next.js 15 control plane (33 files)
  ├── src/lib/
  │   ├── db.ts                   # Turso/Drizzle database client
  │   ├── schema.ts               # 3 tables: users, integrations, instances
  │   ├── encryption.ts           # AES-256-GCM for token storage
  │   ├── railway.ts              # Railway GraphQL API client
  │   ├── slack-oauth.ts          # Slack OAuth URL + code exchange
  │   └── jira-oauth.ts           # Jira OAuth 2.0 (3LO) + token refresh
  ├── src/app/
  │   ├── page.tsx                # Landing page
  │   ├── onboarding/             # 3-step wizard (slack, jira, deploy)
  │   ├── dashboard/page.tsx      # Instance + integration status
  │   ├── settings/               # Reconnect + delete instance
  │   └── api/                    # OAuth callbacks, provisioning, webhooks
  └── src/middleware.ts           # Clerk auth middleware

scripts/start-cloud.sh            # Cloud startup: enables Slack + Jira plugins
src/gateway/server-http.ts        # Added /health endpoint
```

---

## M3: Mac App (Native Experience)

**Priority**: 🟡 High
**Effort**: 2-3 weeks
**Goal**: Beautiful Mac app PMs actually want to use

### Tasks

- [ ] Extend existing `/apps/macos/` Swift app
- [ ] Add SwiftUI main window with dashboard
- [ ] Add first-run onboarding flow (visual, not CLI)
- [ ] Add menu bar quick actions (log bug, status)
- [ ] Add native notifications for new bugs
- [ ] Add Spotlight integration ("pm bug...")
- [ ] Add auto-start on login option
- [ ] Package as DMG for distribution
- [ ] Set up Sparkle auto-updates (already scaffolded)

### Done When

✅ Download DMG → Install → Sign in → Connect Slack in < 5 min
✅ Menu bar shows quick actions
✅ Native notifications when bugs are created

### Key Files to Create/Modify

```
apps/macos/Sources/OpenClaw/
  ├── Views/
  │   ├── OnboardingView.swift     # NEW
  │   ├── DashboardView.swift      # NEW
  │   └── MenuBarView.swift        # Modify
  ├── Services/
  │   └── NotificationService.swift # NEW
  └── App.swift                     # Modify
```

---

## M4: Calendar Integration

**Priority**: 🟡 High
**Effort**: 1-2 weeks
**Goal**: Know PM's schedule, provide meeting context

### Tasks

- [ ] Create `/extensions/google-calendar/`
- [ ] Implement OAuth flow for Google Calendar
- [ ] Read upcoming events (today, this week)
- [ ] Get event details (title, attendees, description)
- [ ] Add `/meetings today` skill
- [ ] Add meeting prep brief before meetings
- [ ] Add calendar view to dashboard

### Done When

✅ PM asks "what meetings do I have today" → gets list
✅ Before each meeting: auto-generated context brief
✅ Calendar events visible in dashboard

### Key Files to Create

```
extensions/google-calendar/
  ├── index.ts           # Plugin entry
  ├── api.ts             # Google Calendar API client
  ├── oauth.ts           # OAuth handler
  └── EXTENSION.yaml     # Metadata
```

---

## M5: Meeting Notes (Google Docs)

**Priority**: 🟡 High
**Effort**: 1-2 weeks
**Goal**: Read/write meeting notes, extract action items

### Tasks

- [ ] Create `/extensions/google-docs/`
- [ ] Implement OAuth flow for Google Docs
- [ ] Read document content
- [ ] Write/append to documents
- [ ] Create meeting summary skill
- [ ] Auto-extract action items from notes
- [ ] Create Jira tickets from action items

### Done When

✅ PM says "summarize my meeting notes from [doc link]"
✅ AI extracts action items and creates Jira tickets
✅ Meeting summary posted to Slack channel

### Key Files to Create

```
extensions/google-docs/
  ├── index.ts           # Plugin entry
  ├── api.ts             # Google Docs API client
  └── EXTENSION.yaml     # Metadata

skills/meeting-notes/
  ├── index.ts           # Skill entry
  └── SKILL.md           # Documentation
```

---

## M6: Meeting Transcription (Recall.ai)

**Priority**: 🟢 Medium
**Effort**: 2-3 weeks
**Goal**: Automatic meeting transcription and processing

### Tasks

- [ ] Create `/extensions/recall-ai/`
- [ ] Implement Recall.ai API integration
- [ ] Set up webhook handler for transcripts
- [ ] Process transcripts: extract action items
- [ ] Auto-create Jira tickets from commitments
- [ ] Post meeting summary to Slack
- [ ] Link transcript to Google Calendar event

### Done When

✅ Recall.ai bot joins meetings automatically
✅ After meeting: summary + action items in Slack
✅ Jira tickets created for commitments

### Key Files to Create

```
extensions/recall-ai/
  ├── index.ts           # Plugin entry
  ├── api.ts             # Recall.ai API client
  ├── webhook.ts         # Webhook handler
  └── EXTENSION.yaml     # Metadata
```

---

## M7: Automated Workflows (Cron)

**Priority**: 🟢 Medium
**Effort**: 1-2 weeks
**Goal**: Set-and-forget PM automation

### Leverage Existing

- `/src/cron/` - Full cron system already built
- One-shot, recurring, cron expressions
- Timezone-aware scheduling
- Job delivery to channels

### Tasks

- [ ] Create PM-specific workflow templates
- [ ] Daily standup brief (9am)
- [ ] Weekly status report draft (Friday 5pm)
- [ ] Sprint reminder (before sprint ends)
- [ ] Add workflow management UI to dashboard
- [ ] Add `/automate` skill for creating workflows

### Done When

✅ PM receives automated daily brief at 9am
✅ Weekly status draft auto-generated Friday
✅ Can create/edit automations via dashboard

### Workflow Templates

```yaml
daily-brief:
  cron: "0 9 * * 1-5"
  action: "Generate today's priority list"
  deliver: slack-dm

weekly-status:
  cron: "0 17 * * 5"
  action: "Draft weekly status report"
  deliver: notion + slack

sprint-reminder:
  trigger: 2-days-before-sprint-end
  action: "Alert on at-risk stories"
  deliver: slack-channel
```

---

## M8: Multi-Agent PM Team

**Priority**: 🟢 Medium
**Effort**: 2-3 weeks
**Goal**: Specialized agents for different PM tasks

### Leverage Existing

- Multi-agent routing (already built)
- Agent-to-agent communication
- Sub-agent spawning
- Per-agent memory

### Tasks

- [ ] Define agent personas (Triager, Planner, Analyst, Writer)
- [ ] Create agent configuration for each
- [ ] Set up routing rules (bug reports → Triager)
- [ ] Implement coordinator agent for complex requests
- [ ] Add agent status to dashboard

### Done When

✅ Bug reports auto-routed to Triager agent
✅ "Generate PRD" routes to Writer agent
✅ Complex requests handled by Coordinator

### Agent Definitions

```yaml
agents:
  triager:
    focus: Bug intake, priority assignment
    triggers: [bug-emoji, bug-keyword]

  planner:
    focus: Sprint planning, capacity
    triggers: [sprint, planning, capacity]

  analyst:
    focus: Metrics, analytics
    triggers: [metrics, data, analytics]

  writer:
    focus: PRDs, specs, docs
    triggers: [prd, spec, document]
```

---

## M9: Voice Integration

**Priority**: 🔵 Lower
**Effort**: 2-3 weeks
**Goal**: Voice-first PM experience

### Leverage Existing

- `/extensions/voice-call/` - Twilio/Telnyx
- `/skills/sherpa-onnx-tts/` - Local TTS
- Transcription pipeline (Whisper, Deepgram)

### Tasks

- [ ] Create `/call-me` skill for morning briefing calls
- [ ] Create voice standup dictation
- [ ] Add voice bug reporting via phone
- [ ] Integrate with iOS/Android apps for voice

### Done When

✅ PM gets automated morning brief via phone call
✅ Can report bugs by calling a number and speaking
✅ Voice commands work on mobile

---

## M10: Hosted SaaS

**Priority**: 🔵 Lower → ✅ Merged into MVP (M2)
**Effort**: 3-4 weeks → Done as part of M2
**Goal**: Zero-install cloud version
**Status**: ✅ Core infrastructure complete (auth, provisioning, deployment). Remaining items (billing, team workspaces, analytics) deferred to M11.

### Tasks

- [x] Set up cloud infrastructure (Railway — per-user container instances)
- [x] Implement user authentication (Clerk — Google OAuth, email)
- [ ] Create team/org workspaces (deferred to M11)
- [ ] Add billing integration (Stripe) (deferred to M11)
- [x] Set up landing page + marketing site
- [ ] Add usage analytics (deferred to M11)
- [ ] Implement admin console (deferred to M11)

### Done When

✅ Sign up at kairo.app → working in 5 minutes (achieved via M2)
⬜ Team workspaces with member management (deferred)
⬜ Billing working with Stripe (deferred)

---

## M11: Enterprise Features

**Priority**: 🔵 Lower (after initial traction)
**Effort**: 4-6 weeks
**Goal**: Enterprise sales readiness

### Leverage Existing

- Security audit system (40+ checks)
- Workspace isolation
- Audit logging

### Tasks

- [ ] Add SSO integration (SAML, OIDC)
- [ ] Enhance audit logging
- [ ] Add admin console
- [ ] Create self-hosted deployment guide
- [ ] Add SOC 2 compliance documentation
- [ ] Windows app (Electron/Tauri)

### Done When

✅ Enterprise customer can self-host
✅ SSO working with Okta/Azure AD
✅ Audit logs exportable for compliance

---

## M12: Analytics & Insights

**Priority**: 🔵 Lower
**Effort**: 3-4 weeks
**Goal**: AI-powered PM insights

### Leverage Existing

- Canvas system for visualizations
- Memory for historical context
- Browser for analytics tools

### Tasks

- [ ] Build sprint velocity dashboard (Canvas)
- [ ] Implement predictive sprint completion
- [ ] Add customer feedback synthesis
- [ ] Create `/insights` skill
- [ ] Add trend analysis over time

### Done When

✅ Sprint dashboard with burndown chart
✅ "Will we hit the deadline?" prediction
✅ Customer feedback themes surfaced

---

# MILESTONE DEPENDENCY GRAPH

```
M1 (MVP) ✅ ─────────────────────────────────────────┐
    │                                                 │
    ▼                                                 │
M2 (Cloud SaaS) ✅ ──────────────────────────────────┤
    │                                                 │
    ├────────────────┐                               │
    ▼                ▼                               │
M3 (Mac App)    M4 (Calendar)                        │
                    │                                 │
                    ▼                                 │
                M5 (Google Docs)                      │
                    │                                 │
                    ▼                                 │
                M6 (Recall.ai) ◄──────────────────────┤
                                                      │
M7 (Cron) ◄───────────────────────────────────────────┤
M8 (Multi-Agent) ◄────────────────────────────────────┤
                                                      │
M9 (Voice) ◄──────────────────────────────────────────┤
                                                      │
M10 (SaaS) ✅ (merged into M2) ◄─────────────────────┤
    │                                                 │
    ▼                                                 │
M11 (Enterprise + Billing + Teams)                    │
M12 (Analytics) ◄─────────────────────────────────────┘
```

---

# SOLO FOUNDER TIMELINE

Assuming full-time work:

| Quarter    | Milestones  | Outcome                            | Status             |
| ---------- | ----------- | ---------------------------------- | ------------------ |
| **Q1**     | M1, M2, M10 | MVP: Slack → Jira + Cloud SaaS     | ✅ Complete (code) |
| **Q2**     | M3, M4, M5  | Mac app + Calendar + Docs          | Next up            |
| **Q3**     | M6, M7, M8  | Meeting transcription + automation |                    |
| **Q4**     | M9          | Voice integration                  |                    |
| **Year 2** | M11, M12    | Enterprise + Analytics             |                    |

---

# WHAT TO BUILD IN EACH WEEK (First 12 Weeks)

## Weeks 1-3: M1 (MVP) ✅ COMPLETE

- Week 1: Fork, cleanup, Jira extension skeleton
- Week 2: Jira API integration, bug-triage skill
- Week 3: End-to-end testing, Docker packaging

## Weeks 4-5: M2 (Cloud SaaS Control Plane) ✅ COMPLETE

- Week 4: Control plane scaffolding, Slack OAuth, Jira validation, Railway provisioning API
- Week 5: Dashboard, settings, landing page, deploy status page

## Weeks 6-8: M3 (Mac App)

- Week 6: SwiftUI main window, onboarding
- Week 7: Menu bar actions, notifications
- Week 8: DMG packaging, auto-updates

## Weeks 9-10: M4 (Calendar)

- Week 9: Google Calendar OAuth, API
- Week 10: Meeting prep briefs, calendar UI

## Weeks 11-12: M5 (Google Docs)

- Week 11: Google Docs OAuth, read/write
- Week 12: Action item extraction, meeting summary

---

# ADDITIONAL CAPABILITIES (Already in Codebase)

These features exist in OpenClaw and can be leveraged without building from scratch:

## Email Intelligence (Already Built)

**Location**: `/src/hooks/gmail.ts`, `/skills/himalaya/`

**What exists:**

- Gmail monitoring via Google Pub/Sub webhooks
- Label-based filtering (INBOX, custom labels)
- Full IMAP/SMTP via Himalaya CLI
- Multi-account support
- Attachment handling

**PM use cases:**

- Monitor customer emails for feedback
- Track stakeholder responses
- Auto-file feature requests from email
- Send automated status updates

**Skills to create:**

- `/email-digest` - Daily summary of important emails
- `/customer-emails` - Surface product feedback from inbox
- `/email-stakeholder <message>` - Draft and send updates

---

## GitHub Integration (Already Built)

**Location**: `/skills/github/`

**What exists:**

- PR status checking, CI run history
- Issue and PR management via `gh api`
- Workflow run inspection

**PM use cases (Technical PMs):**

- Track feature PR status
- Monitor CI failures affecting releases
- Link Jira tickets to PRs
- Release readiness checks

**Skills to create:**

- `/release-status` - Are we ready to ship?
- `/pr-blockers` - What PRs are blocking release?
- `/ci-health` - CI failure trends

---

## Trello Integration (Already Built)

**Location**: `/skills/trello/`

**What exists:**

- Board/list/card management
- Move cards between lists
- Add comments
- Archive functionality

**PM use cases:**

- Alternative to Jira for smaller teams
- Visual sprint boards
- Quick task tracking

---

## Web Search & Research (Already Built)

**Location**: `/src/agents/tools/web-search.ts`, `/skills/summarize/`

**What exists:**

- Multiple providers: Brave, Perplexity, Grok
- URL/article summarization
- YouTube transcript extraction
- PDF content extraction
- RSS/blog monitoring (`/skills/blogwatcher/`)

**PM use cases:**

- Competitive research
- Industry trend monitoring
- Research synthesis for PRDs
- Monitor competitor announcements

**Skills to create:**

- `/competitor-watch <company>` - Monitor competitor
- `/research <topic>` - Synthesize research
- `/industry-news` - Relevant announcements

---

## Usage Analytics (Already Built)

**Location**: `/skills/session-logs/`, `/skills/model-usage/`

**What exists:**

- Query conversation history
- Per-model cost tracking
- Token usage breakdown
- Daily/weekly summaries

**PM use cases:**

- Track PM Co-Pilot usage
- Understand ROI
- Identify most-used features

---

## PDF & Report Generation (Already Built)

**Location**: `/skills/nano-pdf/`, Canvas system

**What exists:**

- Edit PDFs with natural language
- HTML canvas dashboards
- Screenshot capture

**PM use cases:**

- Generate formatted reports
- Create visual dashboards
- Export sprint summaries as PDF

---

## macOS Automation (Already Built)

**Location**: `/skills/peekaboo/`

**What exists:**

- Screen capture and analysis
- UI element targeting
- Automated clicking/typing

**PM use cases:**

- Automated product screenshots
- UI testing documentation
- Demo recording assistance

---

# ADDITIONAL MILESTONES (Optional)

## M13: Email Intelligence

**Priority**: 🟢 Medium
**Effort**: 1-2 weeks
**Leverage**: Existing Gmail hooks + Himalaya

### Tasks

- [ ] Enable Gmail Pub/Sub webhook for real-time monitoring
- [ ] Create email digest skill (daily summary)
- [ ] Add email-to-Jira flow (email → ticket)
- [ ] Create stakeholder email drafting
- [ ] Add email view to dashboard

### Done When

✅ Daily email digest delivered at 8am
✅ Customer emails auto-flagged for review
✅ Can draft and send stakeholder updates from chat

---

## M14: GitHub for Technical PMs

**Priority**: 🔵 Lower
**Effort**: 1 week
**Leverage**: Existing GitHub CLI skill

### Tasks

- [ ] Create release readiness skill
- [ ] Add PR blocker monitoring
- [ ] Link Jira tickets to GitHub PRs
- [ ] Add CI health dashboard

### Done When

✅ "/release-status" shows what's blocking ship
✅ PRs linked to Jira tickets automatically
✅ CI failures surfaced proactively

---

## M15: Competitive Intelligence

**Priority**: 🔵 Lower
**Effort**: 1-2 weeks
**Leverage**: Web search + blogwatcher + summarize

### Tasks

- [ ] Create competitor monitoring workflow
- [ ] Set up RSS feeds for competitor blogs
- [ ] Auto-summarize competitor announcements
- [ ] Create competitive dashboard

### Done When

✅ Weekly competitor digest delivered
✅ Competitor blog posts auto-summarized
✅ Can ask "what did [competitor] announce this week?"

---

## M16: Customer Feedback Hub

**Priority**: 🟢 Medium
**Effort**: 2-3 weeks
**Build New**: Intercom + Zendesk integrations

### Tasks

- [ ] Create `/extensions/intercom/` for chat history
- [ ] Create `/extensions/zendesk/` for support tickets
- [ ] Build feedback synthesis skill
- [ ] Categorize feedback into themes
- [ ] Link feedback to Jira features

### Done When

✅ Customer feedback aggregated from Intercom + Zendesk
✅ Themes auto-identified (bugs, feature requests, praise)
✅ Feature requests linked to Jira

---

## M17: Linear Integration (Jira Alternative)

**Priority**: 🟢 Medium
**Effort**: 1-2 weeks
**Build New**: Linear API integration

### Tasks

- [ ] Create `/extensions/linear/`
- [ ] Implement issue CRUD
- [ ] Add cycle/project support
- [ ] Port bug-triage skill to work with Linear

### Done When

✅ Bug triage works with Linear (not just Jira)
✅ Can search, create, update Linear issues
✅ Sprint/cycle status visible

---

## M18: Figma Integration

**Priority**: 🔵 Lower
**Effort**: 2 weeks
**Build New**: Figma API integration

### Tasks

- [ ] Create `/extensions/figma/`
- [ ] Read design file metadata
- [ ] Get design comments
- [ ] Extract design specs
- [ ] Link Figma frames to Jira tickets

### Done When

✅ Can ask "show me the designs for [feature]"
✅ Design comments surfaced in context
✅ Figma frames linked to Jira

---

# COMPLETE MILESTONE LIST

| #   | Milestone                | Priority    | Effort    | Status                                   |
| --- | ------------------------ | ----------- | --------- | ---------------------------------------- |
| M1  | Fork & MVP               | 🔴 Critical | 2-3 weeks | ✅ Complete                              |
| M2  | Cloud SaaS Control Plane | 🔴 Critical | 1-2 weeks | ✅ Complete (code written, needs deploy) |
| M3  | Mac App                  | 🟡 High     | 2-3 weeks | Extend existing                          |
| M4  | Calendar (Google)        | 🟡 High     | 1-2 weeks | New build                                |
| M5  | Meeting Notes (Docs)     | 🟡 High     | 1-2 weeks | New build                                |
| M6  | Meeting Transcription    | 🟢 Medium   | 2-3 weeks | New build                                |
| M7  | Automated Workflows      | 🟢 Medium   | 1-2 weeks | Leverage existing                        |
| M8  | Multi-Agent Team         | 🟢 Medium   | 2-3 weeks | Leverage existing                        |
| M9  | Voice Integration        | 🔵 Lower    | 2-3 weeks | Leverage existing                        |
| M10 | Hosted SaaS              | 🔵 Lower    | 3-4 weeks | ✅ Merged into M2 (core done)            |
| M11 | Enterprise Features      | 🔵 Lower    | 4-6 weeks | Extend existing                          |
| M12 | Analytics & Insights     | 🔵 Lower    | 3-4 weeks | Leverage existing                        |
| M13 | Email Intelligence       | 🟢 Medium   | 1-2 weeks | Leverage existing                        |
| M14 | GitHub (Tech PMs)        | 🔵 Lower    | 1 week    | Leverage existing                        |
| M15 | Competitive Intel        | 🔵 Lower    | 1-2 weeks | Leverage existing                        |
| M16 | Customer Feedback        | 🟢 Medium   | 2-3 weeks | New build                                |
| M17 | Linear Integration       | 🟢 Medium   | 1-2 weeks | New build                                |
| M18 | Figma Integration        | 🔵 Lower    | 2 weeks   | New build                                |

---

# OpenClaw as Foundation for PM Tool - Assessment

## What is OpenClaw?

OpenClaw is a **personal AI assistant platform** - a multi-channel messaging gateway with extensible integrations. Version 2026.2.9.

### Core Architecture

- **Language**: TypeScript (strict mode, Node.js 22.12+)
- **Package Manager**: pnpm monorepo with workspaces
- **AI Framework**: π-agents (@mariozechner/pi-\*) for autonomous agent orchestration
- **Server**: Express-based WebSocket gateway for real-time communication

### Directory Structure

```
openclaw/
├── src/                    # Main source (71 modules)
├── extensions/             # 37 extension packages (channels, auth, features)
├── skills/                 # 54 skill packages (tools/commands)
├── ui/                     # Control UI (Lit + Vite)
├── apps/                   # Platform apps (iOS, Android, macOS)
├── packages/               # Internal packages
└── docs/                   # Documentation
```

---

## Capabilities Already Built (Relevant to PM Tool)

### 1. Slack Integration ✅

**Location**: `/extensions/slack/`

Already supports:

- Socket Mode and HTTP Mode connections
- Send, edit, delete messages
- Thread management (configurable threading modes)
- React with emojis, list reactions
- Pin/unpin messages
- File/media uploads
- Member info lookup
- Slash command support
- Multi-account support
- DM pairing with security gating
- Message history context

### 2. Browser Automation ✅

**Location**: `/src/agents/tools/browser-tool.ts`, `/src/browser/`

Full Playwright-based automation:

- Navigate to URLs, manage tabs
- Click, type, fill forms, hover, drag, select
- Press keyboard keys
- Wait for conditions (text, selector, URL, load state)
- Execute JavaScript in browser context
- Take screenshots (full page or element)
- Generate PDFs
- Handle file uploads and dialogs
- AI-optimized DOM snapshots for understanding page state
- Sandboxed browser execution via Docker

### 3. Document Creation ✅

- PDF generation from web pages
- Screenshot capture with auto-compression
- File handling and uploads across channels

### 4. Web Scraping/Search ✅

**Location**: `/src/agents/tools/web-fetch.ts`, `/src/agents/tools/web-search.ts`

- Firecrawl integration for content extraction
- Brave Search, Perplexity, Grok search providers
- SSRF protection built-in
- Readability extraction (markdown/text modes)

### 5. Memory System ✅

**Location**: `/extensions/memory-lancedb/`

- LanceDB vector database for semantic search
- Memory recall, store, forget operations
- Auto-recall before agent runs
- Auto-capture after conversations

### 6. Plugin Architecture ✅

**Location**: `/src/plugins/`

Extensible via plugins:

- `registerTool()` - Add new agent capabilities
- `registerChannel()` - Add new messaging platforms
- `registerProvider()` - Add auth providers
- `registerCli()` - Add CLI commands
- `registerHttpHandler()` - Add HTTP endpoints

### 7. Other Messaging Channels ✅

37 channel integrations including: Discord, Telegram, WhatsApp, Microsoft Teams, Google Chat, Matrix, Signal, iMessage, Feishu/Lark, IRC, etc.

---

## Assessment: Suitability for PM Tool

### Strengths as Foundation

| Requirement                | OpenClaw Capability                     | Status   |
| -------------------------- | --------------------------------------- | -------- |
| Connect to Slack           | Full Slack integration with Socket Mode | ✅ Ready |
| Browse product website/app | Playwright browser automation           | ✅ Ready |
| Create documents           | PDF generation, file handling           | ✅ Ready |
| AI-powered actions         | π-agents framework for autonomous tasks | ✅ Ready |
| Extensibility              | Plugin SDK for adding PM-specific tools | ✅ Ready |
| Multi-channel              | 37 messaging integrations               | ✅ Ready |
| Memory/context             | LanceDB vector memory                   | ✅ Ready |

### What Would Need to Be Built

1. **PM-Specific Skills/Tools**
   - Jira/Linear/Asana integration
   - Confluence/Notion document creation
   - Product analytics dashboard reading
   - Feature spec generation
   - Roadmap visualization
   - Stakeholder update generation

2. **PM-Specific Workflows**
   - Bug triage automation
   - Feature request categorization
   - Sprint planning assistance
   - Release notes generation
   - Customer feedback synthesis

3. **UI Customization** (optional)
   - PM-focused control interface
   - Dashboard for PM tasks

---

## Recommended Approach

### Option A: Fork and Customize

- Fork OpenClaw as your PM tool base
- Remove unused channels/features
- Add PM-specific extensions
- Rebrand and customize UI

### Option B: Build as Extension

- Keep OpenClaw as upstream
- Build PM tool as extension packages
- Benefit from upstream updates
- More modular but depends on OpenClaw releases

### Option C: Extract Core Libraries

- Extract key components (browser automation, plugin system, agent framework)
- Build fresh PM-focused application
- Most flexibility, most work

---

## Key Files to Study

1. **Plugin System**: `/src/plugins/types.ts`, `/src/plugins/registry.ts`
2. **Slack Channel**: `/extensions/slack/index.ts`
3. **Browser Tool**: `/src/agents/tools/browser-tool.ts`
4. **Agent Framework**: `/src/agents/pi-agents.ts`
5. **Gateway Server**: `/src/gateway/server.impl.ts`
6. **Tool Registration**: `/src/agents/openclaw-tools.ts`

---

---

# Implementation Plan

## Phase 1: Fork and Clean Up

### 1.1 Create Fork

- Fork OpenClaw repository
- Rename project (e.g., "PMClaw", "BugBot", or your preferred name)
- Update `package.json` name, description, bin entries

### 1.2 Remove Unused Extensions

Keep only essential channels:

- ✅ Keep: `/extensions/slack/` (primary)
- ❌ Remove: telegram, discord, whatsapp, signal, matrix, line, etc. (32+ extensions)
- ✅ Keep: `/extensions/memory-lancedb/` (context memory)

### 1.3 Remove Unused Skills

Audit `/skills/` directory (54 packages) - keep only relevant ones

### 1.4 Update Branding

- Update UI in `/ui/`
- Update CLI name and help text
- Update documentation

---

## Phase 2: Add Jira Integration

### 2.1 Create Jira Extension

**Location**: `/extensions/jira/`

```
extensions/jira/
├── index.ts          # Plugin entry point
├── api.ts            # Jira REST API client
├── types.ts          # TypeScript types for Jira entities
└── EXTENSION.yaml    # Extension metadata
```

### 2.2 Jira API Features to Implement

- Authentication (OAuth 2.0 or API token)
- Create/update/transition issues
- Search issues (JQL queries)
- Get issue details and comments
- Add comments to issues
- Assign issues
- Get project metadata

### 2.3 Register Jira Tools

Use OpenClaw plugin API in `/extensions/jira/index.ts`:

```typescript
plugin.registerTool({
  name: "jira_create_issue",
  description: "Create a new Jira issue",
  // ... schema and handler
});

plugin.registerTool({
  name: "jira_search",
  description: "Search Jira issues with JQL",
  // ...
});

plugin.registerTool({
  name: "jira_update_issue",
  description: "Update a Jira issue",
  // ...
});
```

---

## Phase 3: Build Bug Triage Workflow

### 3.1 Slack → Jira Flow

When a bug is reported in Slack:

1. AI agent extracts bug details (title, description, steps to reproduce)
2. Agent uses browser tool to check product app/website if needed
3. Agent creates Jira issue with extracted details
4. Agent responds in Slack thread with Jira link
5. Agent can browse product to gather screenshots/context

### 3.2 Create Bug Triage Skill

**Location**: `/skills/bug-triage/`

```
skills/bug-triage/
├── index.ts          # Skill entry point
├── SKILL.md          # Skill documentation
└── prompts/          # Agent prompt templates
    ├── extract-bug.md
    └── triage.md
```

### 3.3 Slack Command Integration

- `/bug <description>` - Quick bug report
- React with 🐛 emoji to flag messages as bugs
- Mention @PMBot to triage a thread

### 3.4 Key Workflow Components

1. **Message Parser**: Extract bug details from Slack messages
2. **Context Gatherer**: Use browser to capture screenshots/state
3. **Issue Creator**: Create well-formatted Jira tickets
4. **Thread Tracker**: Track Slack thread ↔ Jira issue relationship

---

## Phase 4: Browser Integration for Product Monitoring

### 4.1 Leverage Existing Browser Tool

The browser tool at `/src/agents/tools/browser-tool.ts` already supports:

- Navigate to product URLs
- Take screenshots
- Execute JavaScript to check app state
- Fill forms to reproduce bugs

### 4.2 Product-Specific Automation

Add skills for:

- Screenshot product pages for bug reports
- Check if a bug is reproducible
- Monitor product health/status pages

---

## Files to Modify

### Core Changes

| File           | Action | Purpose                             |
| -------------- | ------ | ----------------------------------- |
| `package.json` | Edit   | Rename project, update dependencies |
| `src/entry.ts` | Edit   | Update branding                     |
| `src/cli/`     | Edit   | Update CLI help text                |
| `ui/`          | Edit   | Rebrand control UI                  |

### New Files to Create

| File                         | Purpose             |
| ---------------------------- | ------------------- |
| `extensions/jira/index.ts`   | Jira plugin entry   |
| `extensions/jira/api.ts`     | Jira REST client    |
| `extensions/jira/types.ts`   | TypeScript types    |
| `skills/bug-triage/index.ts` | Bug triage skill    |
| `skills/bug-triage/SKILL.md` | Skill documentation |

### Files to Remove

- 30+ unused channel extensions
- Unused skills
- Platform apps (`apps/android/`, `apps/ios/`) if not needed

---

## Verification Plan

### Testing the Fork

1. `pnpm install` - Ensure dependencies install
2. `pnpm build` - Verify build succeeds
3. `pnpm test` - Run existing tests

### Testing Slack Integration

1. Create Slack app with required scopes
2. Configure in `~/.config/pmtool/config.yaml`
3. Run gateway: `pmtool gateway`
4. Send test message in Slack, verify bot responds

### Testing Jira Integration

1. Generate Jira API token
2. Configure Jira credentials
3. Test `jira_create_issue` tool manually
4. Test full Slack → Jira flow

### Testing Bug Triage

1. Post bug description in Slack
2. Verify AI extracts details correctly
3. Verify Jira issue created with proper formatting
4. Verify Slack thread gets Jira link response

---

## Estimated Effort

| Phase   | Description         | Complexity            |
| ------- | ------------------- | --------------------- |
| Phase 1 | Fork and cleanup    | Low                   |
| Phase 2 | Jira integration    | Medium                |
| Phase 3 | Bug triage workflow | Medium                |
| Phase 4 | Browser integration | Low (mostly existing) |

---

---

# Full Vision: PM Co-Pilot

The bug triage workflow (Phases 1-4) is just the starting point. The full vision is an AI that acts as a **PM's autonomous co-pilot** - understanding context from all their tools and taking action on their behalf.

---

## Capability Map

### Layer 1: Communication Hub (Foundation)

| Capability     | Integration                | Purpose                                         |
| -------------- | -------------------------- | ----------------------------------------------- |
| Team messaging | Slack                      | Real-time communication, bug reports, decisions |
| Email          | Gmail / Outlook            | Stakeholder updates, external communication     |
| Video meetings | Zoom / Google Meet / Teams | Meeting notes, action items                     |

### Layer 2: Work Management

| Capability      | Integration               | Purpose                                 |
| --------------- | ------------------------- | --------------------------------------- |
| Issue tracking  | Jira / Linear             | Bug tracking, feature requests, sprints |
| Task management | Todoist / Things / Notion | Personal to-do list, daily priorities   |
| Calendar        | Google Calendar / Outlook | Meetings, deadlines, time blocking      |

### Layer 3: Knowledge & Documentation

| Capability   | Integration            | Purpose                               |
| ------------ | ---------------------- | ------------------------------------- |
| Docs & wikis | Notion / Confluence    | PRDs, specs, meeting notes, decisions |
| File storage | Google Drive / Dropbox | Design assets, research documents     |
| Notes        | Apple Notes / Obsidian | Quick capture, personal notes         |

### Layer 4: Product Intelligence

| Capability        | Integration                    | Purpose                          |
| ----------------- | ------------------------------ | -------------------------------- |
| Analytics         | Amplitude / Mixpanel / PostHog | Feature usage, funnel analysis   |
| Customer feedback | Intercom / Zendesk / Canny     | Bug reports, feature requests    |
| Error tracking    | Sentry / Datadog               | Production issues, crash reports |

### Layer 5: Design & Research

| Capability        | Integration             | Purpose                       |
| ----------------- | ----------------------- | ----------------------------- |
| Design files      | Figma                   | Review designs, extract specs |
| User research     | Dovetail / spreadsheets | Synthesize research findings  |
| Competitive intel | Browser automation      | Monitor competitor products   |

---

## Phased Roadmap

### Phase 1: Foundation (Current Plan)

**Goal**: Basic infrastructure + first workflow

- [ ] Fork and clean up OpenClaw
- [ ] Jira integration
- [ ] Bug triage workflow (Slack → Jira)
- [ ] Browser automation for product screenshots

**Outcome**: PM can report bugs in Slack, AI creates Jira tickets

---

### Phase 2: Calendar & Meeting Intelligence

**Goal**: Understand PM's schedule and meeting context

#### What Already Exists

| Capability                              | Status       | Location                                           |
| --------------------------------------- | ------------ | -------------------------------------------------- |
| Transcription (Whisper, Deepgram, Groq) | ✅ Built     | `/src/media-understanding/providers/`              |
| Real-time STT (OpenAI Realtime)         | ✅ Built     | `/extensions/voice-call/src/providers/`            |
| Notion integration                      | ✅ Built     | `/skills/notion/`                                  |
| Apple Notes/Reminders                   | ✅ Built     | `/skills/apple-notes/`, `/skills/apple-reminders/` |
| Phone calls                             | ✅ Built     | `/extensions/voice-call/`                          |
| Google Calendar                         | ❌ Not built | -                                                  |
| Zoom/Meet joining                       | ❌ Not built | -                                                  |
| Google Docs                             | ❌ Not built | -                                                  |

#### Meeting Intelligence Options

**Option A: Meeting Bot Integration (Recommended for MVP)**
Integrate with existing meeting bot platforms instead of building from scratch:

```
extensions/recall-ai/          # Recall.ai meeting bot API
  - Join Zoom/Meet/Teams automatically
  - Get transcripts via webhook
  - No need to handle audio/video ourselves
```

**Pros:** Fast to build, handles all platforms, high quality
**Cons:** Third-party dependency, per-meeting cost (~$0.02-0.05/min)

**Flow:**

```
1. PM has meeting on calendar
2. Recall.ai bot joins meeting automatically
3. Transcript webhook fires when meeting ends
4. PM Co-Pilot processes transcript:
   - Extracts action items
   - Creates Jira tickets for commitments
   - Updates Notion with meeting notes
   - Sends summary to Slack
```

**Option B: Calendar + Notes Sync (Simpler)**
Don't join meetings, but integrate with where notes are taken:

```
extensions/google-calendar/    # Read calendar events
extensions/google-docs/        # Read/write meeting notes
extensions/google-drive/       # Access recordings
```

**Flow:**

```
1. Read calendar to know what meetings are scheduled
2. Before meeting: Generate prep brief from context
3. During meeting: PM takes notes in Google Doc
4. After meeting: PM Co-Pilot reads notes, extracts action items
```

**Pros:** No meeting bot cost, simpler, PM stays in control
**Cons:** Manual note-taking, less automated

**Option C: Audio Upload + Transcription (Budget)**
Leverage existing transcription pipeline:

**Flow:**

```
1. PM records meeting locally (Zoom cloud recording, QuickTime, etc.)
2. PM uploads audio file to PM Co-Pilot
3. Whisper/Deepgram transcribes
4. AI processes transcript
```

**Pros:** Uses existing transcription infra, no API costs
**Cons:** Manual upload step, delay in processing

**Option D: Full Meeting Bot (Build from Scratch)**
Build native integrations with meeting platforms:

```
extensions/zoom-bot/           # Zoom Meeting SDK
extensions/google-meet-bot/    # Google Meet API (limited)
extensions/teams-bot/          # MS Teams Meeting SDK
```

**Pros:** Full control, no third-party dependency
**Cons:** Complex to build, months of work, certification required

---

#### Recommended Phased Approach

**Phase 2a: Calendar Integration**

```
extensions/google-calendar/
  - OAuth authentication
  - Read upcoming events
  - Get event details (title, attendees, description)
  - Meeting prep briefs before each meeting
```

**Phase 2b: Google Docs Integration**

```
extensions/google-docs/
  - Read meeting notes from shared docs
  - Write meeting summaries
  - Extract action items
```

**Phase 2c: Meeting Bot (Recall.ai)**

```
extensions/recall-ai/
  - API integration for bot deployment
  - Webhook handler for transcripts
  - Automatic post-meeting processing
```

**Phase 2d: Direct Platform Bots (Future)**

```
extensions/zoom-bot/
extensions/teams-bot/
  - Native integrations for enterprise
  - No third-party dependency
```

---

#### Extensions to Build (Prioritized)

```
# High Priority
extensions/google-calendar/    # Read calendar events
extensions/google-docs/        # Meeting notes read/write
extensions/recall-ai/          # Meeting bot integration

# Medium Priority
extensions/google-drive/       # Access recordings, files
extensions/notion/             # Already exists - enhance
extensions/obsidian/           # Local-first notes

# Future
extensions/zoom-bot/           # Native Zoom integration
extensions/teams-bot/          # Native Teams integration
```

**Capabilities:**

- Sync calendar events and know meeting context
- Pre-meeting prep briefs with relevant Jira tickets, docs, stakeholder info
- Join meetings via Recall.ai bot and capture transcripts
- Auto-generate meeting summaries with action items
- Create Jira tickets from meeting commitments
- Update Notion/Google Docs with structured notes
- Suggest time blocks for deep work
- Track action item completion across meetings

**Skills:**

- `/meeting-prep <meeting-name>` - Generate context brief
- `/meeting-summary` - Summarize last meeting
- `/meetings today` - What's on the calendar
- `/action-items` - Outstanding items from all meetings
- `/block-time <hours> <purpose>` - Find and book focus time
- `/transcribe <audio-file>` - Manual transcription upload

---

### Phase 3: Task & Priority Management

**Goal**: Unified view of PM's responsibilities

**Extensions to build:**

```
extensions/todoist/            # Personal task management
extensions/linear/             # Alternative to Jira
extensions/asana/              # Team task management
```

**Capabilities:**

- Aggregate tasks from Jira, Todoist, Slack mentions
- Daily priority suggestions ("Based on deadlines, focus on X today")
- Proactive reminders ("Sprint ends Friday, 3 stories still in progress")
- Cross-tool task creation ("Add to my to-do list and create Jira ticket")

**Skills:**

- `/today` - What should I focus on today?
- `/blockers` - What's blocking my team?
- `/sprint-status` - Sprint health check

---

### Phase 4: Documentation Automation

**Goal**: AI writes and maintains PM documents

**Extensions to build:**

```
extensions/notion/             # Docs, wikis, databases
extensions/confluence/         # Enterprise wikis
extensions/google-docs/        # Collaborative docs
```

**Capabilities:**

- Auto-generate PRD drafts from Slack discussions
- Keep docs in sync with Jira status
- Create weekly status reports automatically
- Generate release notes from completed tickets
- Decision log maintenance

**Skills:**

- `/prd <feature-name>` - Draft a PRD
- `/status-update` - Generate weekly status
- `/release-notes` - Generate release notes from Jira
- `/decision <topic>` - Document a decision

---

### Phase 5: Customer & Product Intelligence

**Goal**: Surface insights from customer data

**Extensions to build:**

```
extensions/amplitude/          # Product analytics
extensions/intercom/           # Customer support
extensions/zendesk/            # Support tickets
extensions/canny/              # Feature voting
extensions/sentry/             # Error tracking
```

**Capabilities:**

- Monitor key metrics, alert on anomalies
- Synthesize customer feedback themes
- Link support tickets to feature requests
- Track feature adoption post-launch
- Surface high-priority bugs from Sentry

**Skills:**

- `/feature-health <feature>` - How is this feature performing?
- `/customer-pulse` - What are customers saying?
- `/top-issues` - Highest priority bugs from Sentry

---

### Phase 6: Proactive Co-Pilot Mode

**Goal**: AI acts autonomously on PM's behalf

**Autonomous behaviors:**

- **Morning briefing**: "3 blockers, sprint is on track, 2 meetings today"
- **Stakeholder updates**: Auto-draft weekly updates for leadership
- **Meeting follow-up**: Send action items to attendees after meetings
- **Risk detection**: "Sprint velocity dropped, might miss deadline"
- **Context switching**: "You have eng sync in 5 min, here's what to discuss"

**Skills:**

- `/autopilot on` - Enable proactive mode
- `/brief` - Get current state briefing
- `/delegate <task>` - Have AI handle a task autonomously

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PM Co-Pilot                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Slack   │  │  Email   │  │ Calendar │  │ Meetings │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│  ┌────▼─────────────▼─────────────▼─────────────▼────┐         │
│  │              Context Engine                        │         │
│  │   - Unified timeline of PM's work                 │         │
│  │   - Entity resolution (people, projects, issues)  │         │
│  │   - Priority inference                            │         │
│  └────┬──────────────────────────────────────────────┘         │
│       │                                                         │
│  ┌────▼─────────────────────────────────────────────┐          │
│  │              Memory (LanceDB)                     │          │
│  │   - Decisions made                               │          │
│  │   - Context for ongoing projects                 │          │
│  │   - Stakeholder preferences                      │          │
│  └────┬─────────────────────────────────────────────┘          │
│       │                                                         │
│  ┌────▼─────────────────────────────────────────────┐          │
│  │              Action Engine                        │          │
│  │   - Jira ticket creation                         │          │
│  │   - Doc generation                               │          │
│  │   - Message drafting                             │          │
│  │   - Calendar management                          │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: Bug Report → Resolution

```
1. Customer reports issue in Intercom
2. Co-Pilot detects, creates Jira ticket
3. Links to Sentry error if matching
4. Notifies eng in Slack
5. Tracks through resolution
6. Updates customer when fixed
7. Logs in release notes
```

### Example 2: Meeting → Action Items

```
1. PM joins Zoom meeting
2. Co-Pilot captures transcript
3. Identifies action items and owners
4. Creates Jira tickets for committed work
5. Adds to PM's to-do list
6. Sends summary to attendees
7. Schedules follow-up if needed
```

### Example 3: Weekly Rhythm

```
Monday AM:
  - Generate week preview (meetings, deadlines, blockers)
  - Suggest priority focus areas

Friday PM:
  - Draft weekly status update
  - Summarize wins and blockers
  - Prepare next week's goals
```

---

## Success Metrics

| Metric                       | Target            |
| ---------------------------- | ----------------- |
| Time saved on status updates | 2+ hours/week     |
| Bug triage time              | < 5 minutes       |
| Meeting follow-up completion | 100% within 24h   |
| Context switching friction   | Reduced by 50%    |
| Stakeholder update frequency | Consistent weekly |

---

## Technical Considerations

### Authentication Strategy

- OAuth 2.0 for most integrations (Google, Zoom, etc.)
- API tokens for Jira, Linear, etc.
- Secure credential storage (keychain / encrypted config)

### Data Privacy

- All data stays local or in PM's own accounts
- No sending data to third parties
- Clear audit log of AI actions
- Undo capability for autonomous actions

### Rate Limits & Quotas

- Respect API rate limits across integrations
- Queue non-urgent operations
- Cache frequently accessed data

---

---

# BILLION-DOLLAR VISION: Enterprise PM Platform

Based on deep codebase analysis, OpenClaw has **enterprise-grade capabilities** that most competitors lack. Here's how to leverage them for a category-defining PM platform.

---

## Hidden Platform Strengths (Already Built)

### 1. Enterprise Security & Compliance ✅

**Already in codebase:**

- 40+ security audit checks with auto-fix (`openclaw security audit --deep --fix`)
- MITRE ATLAS-based threat model documentation
- Device pairing with zero-trust approval workflow
- Session isolation and workspace separation
- Secret detection in CI/CD (`.detect-secrets`)
- Audit trails in JSONL transcripts
- RBAC via tool allowlists/denylists per agent

**PM Tool leverage:** SOC 2 / HIPAA readiness for enterprise sales

### 2. Multi-Agent Orchestration ✅

**Already in codebase:**

- Multiple agents per workspace with routing rules
- Agent-to-agent communication via `sessions_send`
- Sub-agent spawning with `sessions_spawn`
- Per-agent models, memory, and tool policies
- Cross-agent task delegation with announce-back

**PM Tool leverage:** Specialized PM agents (Bug Triager, Sprint Planner, Stakeholder Comms)

### 3. Scheduling & Automation ✅

**Already in codebase:**

- Full cron system with one-shot, recurring, and cron expressions
- Timezone-aware scheduling (IANA timezones)
- Isolated job execution with model overrides
- Job delivery to any channel (Slack, Teams, Email)
- Heartbeat system for periodic wake
- Webhook triggers with payload transformation

**PM Tool leverage:** Automated daily standups, weekly reports, sprint reminders

### 4. Voice & Telephony ✅

**Already in codebase:**

- Twilio, Telnyx, Plivo integrations
- OpenAI Realtime API for media streaming
- Bi-directional call control (initiate, speak, end)
- Local TTS via sherpa-onnx (offline)
- iOS/Android/macOS voice interfaces

**PM Tool leverage:** Voice standup summaries, call transcription, voice commands

### 5. Native Mobile Apps ✅

**Already in codebase:**

- iOS app (Swift) - camera, calendar, reminders access
- Android app (Kotlin) - foreground service, persistent connection
- macOS menu bar app - Canvas rendering, voice overlay
- Device pairing across all platforms
- Shared session model

**PM Tool leverage:** Mobile-first PM experience, on-the-go updates

### 6. Live Canvas Visualization ✅

**Already in codebase:**

- HTML/CSS/JS rendering on connected devices
- Real-time updates and live reload
- JavaScript eval for dynamic content
- Snapshot capabilities
- Cross-device rendering

**PM Tool leverage:** Sprint dashboards, roadmap visualization, live metrics

### 7. Vector Memory System ✅

**Already in codebase:**

- LanceDB vector database
- Auto-recall (inject relevant memories before agent runs)
- Auto-capture (store important facts after conversations)
- Memory categories (preferences, decisions, entities, facts)
- GDPR-compliant deletion

**PM Tool leverage:** Remember stakeholder preferences, project context, decisions

---

## Expanded Phased Roadmap

### Phase 1: Foundation (Bug Triage MVP)

_Already planned - no changes_

### Phase 2: Calendar & Meeting Intelligence

_Already planned - no changes_

### Phase 3: Task & Priority Management

_Already planned - no changes_

### Phase 4: Documentation Automation

_Already planned - no changes_

### Phase 5: Customer & Product Intelligence

_Already planned - no changes_

### Phase 6: Proactive Co-Pilot Mode

_Already planned - no changes_

---

### Phase 7: Voice-First PM Experience

**Goal**: PMs can interact entirely via voice

**Leverage existing:**

- `/extensions/voice-call/` - Twilio/Telnyx/Plivo
- `/skills/sherpa-onnx-tts/` - Offline TTS
- iOS/Android/macOS talk mode

**New capabilities:**

- Morning briefing via phone call
- Voice-activated bug reports ("Hey PM Bot, log a bug...")
- Meeting transcription → automatic action items
- Voice commands while driving/commuting
- Async voice messages to stakeholders

**Skills:**

- `/call-me` - PM Bot calls you with daily brief
- `/voice-standup` - Dictate standup update
- `/transcribe-meeting <url>` - Transcribe and extract action items

---

### Phase 8: Mobile-Native PM Dashboard

**Goal**: Full PM experience on mobile

**Leverage existing:**

- iOS app with calendar/reminders access
- Android app with persistent connection
- Canvas system for visualizations

**New capabilities:**

- Sprint dashboard on phone
- Swipe to triage bugs
- Push notifications for blockers
- Quick actions (approve, assign, escalate)
- Offline mode with sync

**Canvas dashboards:**

- Sprint burndown (live updating)
- Bug heatmap by severity
- Stakeholder communication status
- Team velocity trends

---

### Phase 9: Multi-Agent PM Team

**Goal**: Specialized agents for different PM functions

**Leverage existing:**

- Multi-agent routing with bindings
- Agent-to-agent communication
- Sub-agent spawning
- Per-agent memory and context

**Agent roster:**
| Agent | Responsibility | Triggers |
|-------|---------------|----------|
| **Triager** | Bug intake, priority assignment | New bug reports |
| **Planner** | Sprint planning, capacity | Sprint boundaries |
| **Analyst** | Metrics, analytics, insights | Scheduled + on-demand |
| **Writer** | PRDs, specs, release notes | Feature discussions |
| **Communicator** | Stakeholder updates, follow-ups | Meeting ends, milestones |
| **Coordinator** | Orchestrates other agents | Complex requests |

**Skills:**

- `/delegate <task>` - Route to appropriate agent
- `/agents status` - See agent activity
- `/escalate` - Bump task priority across agents

---

### Phase 10: Automated Workflows (Cron Pipelines)

**Goal**: Set-and-forget PM automation

**Leverage existing:**

- Cron system with cron expressions
- Webhook triggers with transformation
- Job delivery to channels

**Workflow templates:**

```yaml
# Monday 9am - Week preview
- cron: "0 9 * * 1"
  action: Generate week preview
  deliver: Slack DM

# Friday 5pm - Status report draft
- cron: "0 17 * * 5"
  action: Draft weekly status
  deliver: Notion + Slack

# Daily 9:30am - Standup prep
- cron: "30 9 * * 1-5"
  action: Prepare standup talking points
  deliver: Mobile push

# On Jira transition to "Done"
- trigger: jira.issue.done
  action: Update release notes
  deliver: Confluence
```

**Skills:**

- `/automate <description>` - Create new automation
- `/automations list` - See scheduled jobs
- `/pause <automation>` - Temporarily disable

---

### Phase 11: Enterprise Multi-Tenancy

**Goal**: Enterprise deployment with team management

**Leverage existing:**

- Workspace isolation
- Multi-agent architecture
- Session scope controls
- Docker/Kubernetes readiness

**New capabilities:**

- Team workspaces (isolated per team/org)
- Admin console for user management
- SSO integration (SAML, OIDC)
- Usage analytics per team
- Audit logs for compliance
- Role-based access (PM, Lead, Viewer)

**Deployment options:**

- Cloud-hosted (multi-tenant SaaS)
- Self-hosted (enterprise on-prem)
- Hybrid (data stays on-prem, AI in cloud)

---

### Phase 12: Analytics & Insights Engine

**Goal**: AI-powered PM insights

**Leverage existing:**

- Canvas system for visualizations
- Memory for historical context
- Browser automation for analytics tools

**Insight categories:**
| Category | Insights |
|----------|----------|
| **Velocity** | Sprint predictability, team capacity trends |
| **Quality** | Bug patterns, regression rates, escape rates |
| **Customer** | Feature request themes, NPS correlation |
| **Process** | Cycle time, lead time, bottlenecks |
| **Stakeholder** | Communication gaps, decision velocity |

**Skills:**

- `/insights weekly` - Key insights from the week
- `/predict <sprint>` - Sprint completion likelihood
- `/why-slow <feature>` - Root cause analysis
- `/compare <team-a> <team-b>` - Team comparison

---

## PM-FRIENDLY INTERFACE LAYER

### Current State (What Exists)

| Component         | Technology    | Status              | PM-Friendly?         |
| ----------------- | ------------- | ------------------- | -------------------- |
| Web Dashboard     | Lit + Vite    | ✅ Production       | ⚠️ Technical         |
| macOS Menu Bar    | Swift         | ⏳ Beta             | ⚠️ Basic             |
| CLI Setup         | Clack prompts | ✅ Production       | ❌ Too technical     |
| Config Management | JSON + Schema | ✅ Production       | ❌ Developer-focused |
| Windows App       | -             | ❌ None             | ❌ N/A               |
| Mobile Apps       | -             | ❌ Scaffolding only | ❌ N/A               |

**Key existing assets to leverage:**

- `/ui/` - Full Lit/Vite web dashboard (118 TypeScript files)
- `/apps/macos/` - Swift menu bar app with IPC, Sparkle updates
- Dynamic form system (`config-form.render.ts`) - Can render forms from JSON schema
- Onboarding mode flag - URL param `?onboarding=1` already exists

---

### New Phase: PM-Friendly Mac App

**Goal**: Native Mac app that any PM can install and use in minutes

**Leverage existing:**

- `/apps/macos/` - Swift app foundation
- Sparkle auto-updates
- IPC library for gateway communication
- Discovery service for finding instances

**New features to build:**

#### 1. First-Run Experience

```
┌─────────────────────────────────────────────────────────────┐
│                    Welcome to PM Co-Pilot                    │
│                                                              │
│     Your AI assistant for product management                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    [Get Started]                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│        Already have an account? [Sign In]                    │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Guided Integration Setup

```
Step 1: Connect Slack
┌─────────────────────────────────────────────────────────────┐
│  [Slack Logo]  Connect your Slack workspace                  │
│                                                              │
│  PM Co-Pilot will be able to:                               │
│  ✓ Read and respond to messages                             │
│  ✓ Create bug reports from conversations                    │
│  ✓ Send you proactive updates                               │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              [Connect to Slack]                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│                    [Skip for now]                            │
└─────────────────────────────────────────────────────────────┘

Step 2: Connect Jira
(Similar flow)

Step 3: Connect Calendar
(Similar flow)
```

#### 3. Main App Interface

```
┌─────────────────────────────────────────────────────────────┐
│ ☰  PM Co-Pilot                          [🔔] [⚙️] [👤]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Good morning, Sarah! Here's your daily brief:              │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📊 Sprint Status                                        ││
│  │ 12/15 stories complete • 3 blockers • On track          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🐛 New Bugs (3)                                         ││
│  │ • Login timeout on mobile - P1                          ││
│  │ • Dashboard chart not loading - P2                      ││
│  │ • Typo in settings page - P3                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📅 Today's Meetings (4)                                 ││
│  │ • 10:00 - Sprint Planning                               ││
│  │ • 14:00 - Stakeholder Sync                              ││
│  │ • 15:30 - 1:1 with Engineering Lead                     ││
│  │ • 17:00 - Product Review                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 💬 Ask PM Co-Pilot...                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 4. Menu Bar Quick Actions

```
┌───────────────────────────────────────┐
│ PM Co-Pilot                      [●]  │
├───────────────────────────────────────┤
│ 🐛 Log a bug...                       │
│ 📝 Quick note...                      │
│ 📊 Sprint status                      │
│ 📅 Today's meetings                   │
├───────────────────────────────────────┤
│ ⚡ Recent actions                      │
│   Created PROJ-123 (2 min ago)        │
│   Updated sprint (15 min ago)         │
├───────────────────────────────────────┤
│ ⚙️ Preferences...                      │
│ 🚪 Quit PM Co-Pilot                   │
└───────────────────────────────────────┘
```

**Tech approach:**

- SwiftUI for modern, native Mac UI
- Combine with existing Swift foundation
- WebView for complex views (reuse web dashboard components)
- Native notifications for proactive alerts
- Spotlight integration for quick actions

---

### New Phase: PM-Friendly Web App

**Goal**: Browser-based app accessible from any device

**Leverage existing:**

- `/ui/` - Lit/Vite foundation (118 files)
- Dynamic form system for config
- Chat interface with streaming
- Agent/session management

**New features to build:**

#### 1. Hosted SaaS Mode

- Cloud-hosted option (no local setup)
- User accounts with email/Google/SSO login
- Team workspaces with member management
- Billing integration (Stripe)

#### 2. Landing Page & Marketing Site

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  PM Co-Pilot     Features  Pricing  Blog   [Login] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│        The AI Co-Pilot for Product Managers                  │
│                                                              │
│   Triage bugs, manage sprints, and stay on top of          │
│   stakeholder communication - all from Slack.               │
│                                                              │
│        [Get Started Free]    [Watch Demo]                   │
│                                                              │
│   Trusted by PMs at:                                        │
│   [Stripe] [Notion] [Linear] [Figma] [Vercel]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Web Dashboard (Enhanced)

- Responsive design (mobile-friendly)
- Dark/light mode toggle
- Keyboard shortcuts
- Drag-and-drop task prioritization
- Real-time updates via WebSocket

#### 4. Integration Marketplace

```
┌─────────────────────────────────────────────────────────────┐
│  Integrations                                    [Search]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Connected (3)                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Slack   │  │   Jira   │  │ Calendar │                  │
│  │    ✓     │  │    ✓     │  │    ✓     │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  Available (12)                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Linear  │  │  Notion  │  │  Figma   │  │ Amplitude│   │
│  │ [Connect]│  │ [Connect]│  │ [Connect]│  │ [Connect]│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Frictionless Setup Design

**Current setup (CLI-based):**

```bash
brew install openclaw
openclaw onboard   # Interactive CLI wizard
# Answer 15+ prompts about auth, channels, etc.
```

**New setup (PM-friendly):**

#### Option A: Mac App (Download & Install)

```
1. Download PM Co-Pilot.dmg from pmcopilot.com
2. Drag to Applications
3. Open app → Click "Get Started"
4. Sign in with Google/email
5. Click "Connect Slack" → OAuth redirect → Done
6. Click "Connect Jira" → OAuth redirect → Done
7. Start using
```

**Time to value: < 5 minutes**

#### Option B: Web App (Zero Install)

```
1. Go to app.pmcopilot.com
2. Sign in with Google/email
3. Connect Slack via OAuth
4. Connect Jira via OAuth
5. Start using
```

**Time to value: < 3 minutes**

#### OAuth Flow (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│                   Connect to Slack                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │     PM Co-Pilot is requesting access to your             ││
│  │     Slack workspace                                      ││
│  │                                                          ││
│  │     This will allow PM Co-Pilot to:                      ││
│  │     • Read messages you're mentioned in                  ││
│  │     • Send messages on your behalf                       ││
│  │     • Create and manage reminders                        ││
│  │                                                          ││
│  │              [Allow]     [Cancel]                        ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ✓ Your data is encrypted and never shared                  │
│  ✓ You can disconnect at any time                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementation Phases for UI

#### UI Phase 1: Enhanced Web Dashboard

**Goal**: Make existing `/ui/` PM-friendly

- Add onboarding flow (wizard-style, not form-heavy)
- Add visual integration cards (not JSON config)
- Add daily brief dashboard view
- Add dark/light mode
- Mobile-responsive layout
- Keyboard shortcuts

**Effort**: Medium (builds on existing Lit codebase)

#### UI Phase 2: Mac App Polish

**Goal**: Transform menu bar app into full PM experience

- SwiftUI main window with dashboard
- Native onboarding flow
- Menu bar quick actions
- Spotlight integration
- Native notifications
- Auto-start on login option

**Effort**: Medium-High (extend existing Swift foundation)

#### UI Phase 3: Hosted SaaS

**Goal**: Cloud-hosted version for zero-install experience

- User authentication (Clerk/Auth0)
- Team/org workspaces
- Billing (Stripe)
- Usage analytics
- Admin console

**Effort**: High (new infrastructure)

#### UI Phase 4: Windows App

**Goal**: Windows native app for enterprise

- Electron or Tauri wrapper
- Windows-native notifications
- System tray integration
- MSI installer for IT deployment

**Effort**: Medium (can reuse web UI)

---

### UI Design Principles for PMs

1. **No JSON editing** - All config via visual forms
2. **No CLI required** - Everything accessible via GUI
3. **OAuth for everything** - No copy-pasting API tokens
4. **Progressive disclosure** - Start simple, reveal power features
5. **Contextual help** - Tooltips and guides everywhere
6. **Instant feedback** - Loading states, success confirmations
7. **Mobile-first web** - Works on phone browser
8. **Keyboard shortcuts** - Power users can go fast
9. **Undo everywhere** - Reduce fear of mistakes
10. **Smart defaults** - Works out of box with minimal config

---

## Competitive Moats

### 1. Voice-Native AI PM (Unique)

No competitor offers voice-first PM with phone calls, transcription, and voice commands.
**Moat:** Twilio/telephony integration + local TTS + native apps

### 2. Multi-Agent Architecture (Defensible)

Specialized agents that collaborate, not a single monolithic bot.
**Moat:** Complex orchestration, per-agent memory, cross-agent routing

### 3. Mobile-First with Canvas (Rare)

Live dashboards rendering on mobile devices, not just notifications.
**Moat:** Native apps + Canvas system + real-time sync

### 4. 37+ Channel Integrations (Comprehensive)

Reach PMs wherever they work - Slack, Teams, WhatsApp, iMessage.
**Moat:** Years of integration work, protocol expertise

### 5. Offline-First Privacy (Enterprise Trust)

Data stays local, works offline, no cloud dependency.
**Moat:** Local-first architecture, self-hosted option

### 6. Memory That Learns (Sticky)

AI remembers decisions, preferences, stakeholder context across months.
**Moat:** LanceDB integration, auto-recall/capture, no context reset

---

## Enterprise Pricing Strategy

| Tier           | Target           | Price        | Features                                            |
| -------------- | ---------------- | ------------ | --------------------------------------------------- |
| **Starter**    | Individual PM    | $29/mo       | 1 workspace, Slack + Jira, basic automation         |
| **Team**       | PM Team (5-10)   | $99/mo/seat  | Multi-agent, mobile apps, Canvas dashboards         |
| **Business**   | Department (50+) | $199/mo/seat | SSO, audit logs, admin console, priority support    |
| **Enterprise** | Company-wide     | Custom       | Self-hosted, dedicated success, custom integrations |

**Growth levers:**

- Free tier with limited automations (PLG)
- Team invites with usage bonuses (viral)
- Integration marketplace (ecosystem)

---

## Go-to-Market Strategy

### Phase 1: Developer-Adjacent PMs

- Target: Technical PMs at startups
- Channel: Product Hunt, Hacker News, indie hackers
- Hook: "Bug triage in Slack, Jira tickets in seconds"

### Phase 2: Growth Stage Companies

- Target: PM teams at Series A-C companies
- Channel: PM communities (Lenny's, Product School)
- Hook: "Your PM team's AI co-pilot"

### Phase 3: Enterprise

- Target: Fortune 500 PM orgs
- Channel: Enterprise sales, Gartner recognition
- Hook: "Secure, compliant, self-hosted PM automation"

---

## Strategic Integrations Priority

### Must-Have (Phase 1-2)

| Integration     | Priority | Reason                |
| --------------- | -------- | --------------------- |
| Slack           | ✅ Built | Primary channel       |
| Jira            | High     | 75% of enterprise PMs |
| Google Calendar | High     | Meeting context       |
| Notion          | High     | Modern PM docs        |

### High Value (Phase 3-4)

| Integration | Priority | Reason            |
| ----------- | -------- | ----------------- |
| Linear      | Medium   | Startup market    |
| Figma       | Medium   | Design handoff    |
| Amplitude   | Medium   | Product analytics |
| Intercom    | Medium   | Customer feedback |

### Enterprise (Phase 5+)

| Integration | Priority | Reason          |
| ----------- | -------- | --------------- |
| ServiceNow  | Low      | Enterprise ITSM |
| Salesforce  | Low      | Enterprise CRM  |
| SAP         | Low      | Enterprise ERP  |
| Workday     | Low      | Enterprise HR   |

---

## Technical Architecture for Scale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PM CO-PILOT PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Slack     │  │   Jira      │  │  Calendar   │  │   Voice     │    │
│  │   Teams     │  │   Linear    │  │  Meetings   │  │   Calls     │    │
│  │   Email     │  │   Notion    │  │  Zoom API   │  │   Twilio    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│  ┌──────▼────────────────▼────────────────▼────────────────▼──────┐    │
│  │                    INTEGRATION LAYER                            │    │
│  │   - OAuth/API key management                                   │    │
│  │   - Rate limiting + retry                                      │    │
│  │   - Webhook ingestion                                          │    │
│  └──────────────────────────┬─────────────────────────────────────┘    │
│                             │                                           │
│  ┌──────────────────────────▼─────────────────────────────────────┐    │
│  │                    CONTEXT ENGINE                               │    │
│  │   - Entity resolution (people, projects, issues)               │    │
│  │   - Timeline reconstruction                                    │    │
│  │   - Priority inference                                         │    │
│  │   - Cross-tool correlation                                     │    │
│  └──────────────────────────┬─────────────────────────────────────┘    │
│                             │                                           │
│  ┌──────────────────────────▼─────────────────────────────────────┐    │
│  │                    AGENT ORCHESTRATOR                           │    │
│  │                                                                 │    │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │    │
│  │   │ Triager │  │ Planner │  │ Analyst │  │ Writer  │          │    │
│  │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │    │
│  │        │            │            │            │                │    │
│  │   ┌────▼────────────▼────────────▼────────────▼────┐          │    │
│  │   │              COORDINATOR AGENT                  │          │    │
│  │   └─────────────────────────────────────────────────┘          │    │
│  └──────────────────────────┬─────────────────────────────────────┘    │
│                             │                                           │
│  ┌──────────────────────────▼─────────────────────────────────────┐    │
│  │                    MEMORY LAYER (LanceDB)                       │    │
│  │   - Long-term context (projects, decisions, preferences)       │    │
│  │   - Stakeholder profiles                                       │    │
│  │   - Historical patterns                                        │    │
│  │   - Auto-recall + auto-capture                                 │    │
│  └──────────────────────────┬─────────────────────────────────────┘    │
│                             │                                           │
│  ┌──────────────────────────▼─────────────────────────────────────┐    │
│  │                    AUTOMATION ENGINE                            │    │
│  │   - Cron scheduler (daily briefs, weekly reports)              │    │
│  │   - Event triggers (Jira transitions, meeting ends)            │    │
│  │   - Workflow pipelines (multi-step automations)                │    │
│  └──────────────────────────┬─────────────────────────────────────┘    │
│                             │                                           │
│  ┌──────────────────────────▼─────────────────────────────────────┐    │
│  │                    DELIVERY LAYER                               │    │
│  │                                                                 │    │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │    │
│  │   │  Slack  │  │  Email  │  │  Mobile │  │  Voice  │          │    │
│  │   │   DM    │  │         │  │   Push  │  │  Call   │          │    │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘          │    │
│  │                                                                 │    │
│  │   ┌─────────────────────────────────────────────────┐          │    │
│  │   │              CANVAS DASHBOARDS                  │          │    │
│  │   │   (Sprint, Velocity, Roadmap, Stakeholders)    │          │    │
│  │   └─────────────────────────────────────────────────┘          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics (Billion-Dollar Milestones)

| Milestone    | Metric            | Target |
| ------------ | ----------------- | ------ |
| **PMF**      | NPS               | > 50   |
| **Traction** | Weekly active PMs | 1,000  |
| **Growth**   | MoM growth        | > 20%  |
| **Revenue**  | ARR               | $1M    |
| **Series A** | ARR               | $5M    |
| **Series B** | ARR               | $20M   |
| **Series C** | ARR               | $100M  |
| **Unicorn**  | Valuation         | $1B    |

---

## Next Steps (Planning Only)

1. **Finalize Phase 1 scope** - Confirm bug triage as MVP
2. **Choose integration priorities** - Which Phase 2-6 items matter most?
3. **Design context engine** - How to unify data across tools?
4. **Define PM persona** - What type of PM is the target user?
5. **Prototype autonomous actions** - What can AI do without asking?
6. **Plan voice integration** - Leverage existing Twilio/voice-call infrastructure
7. **Design multi-agent architecture** - Which specialized agents to build first?
8. **Canvas dashboard prototypes** - Sprint burndown, bug heatmap
9. **Enterprise security roadmap** - SSO, audit, compliance
10. **GTM strategy refinement** - Which PM segment to target first?
