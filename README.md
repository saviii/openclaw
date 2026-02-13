# Kairo — AI-powered PM Co-Pilot

Kairo is an AI-powered product management co-pilot built on the OpenClaw platform. It connects your Slack workspace to Jira, automating bug triage, ticket creation, and team communication.

## What It Does

- **Bug Triage**: Report bugs in Slack, and Kairo creates well-formatted Jira tickets with priority, labels, and descriptions
- **Jira Integration**: Create, search, update, and transition Jira issues via natural language
- **Memory**: Remembers project context, stakeholder preferences, and past decisions
- **Extensible**: Built on a plugin architecture — add new integrations as needed

## Cloud Hosted (Recommended)

The fastest way to get started is via the cloud-hosted control plane (`kairo-cloud/`). PMs sign up, connect Slack and Jira through a guided wizard, and get a dedicated Kairo instance running on Railway — zero CLI, zero config files.

See [`kairo-cloud/`](./kairo-cloud/) for setup instructions.

## Self-Hosting

### Prerequisites

- Node.js 22.12+
- pnpm 10+
- A Jira Cloud instance with API access
- A Slack workspace (for Slack integration)

## Quick Start (Self-Hosted)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (or set these in your environment):

```bash
# Jira Configuration (required)
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=PROJ
JIRA_DEFAULT_ISSUE_TYPE=Bug

# Slack Configuration (for Slack integration)
# See: https://api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

### 3. Build and Run

```bash
pnpm build
node kairo.mjs gateway
```

### Docker

```bash
docker build -t kairo:local .
docker compose up
```

Set the required environment variables in your `.env` file or pass them to `docker compose`.

## Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Set `JIRA_API_TOKEN` to the generated token
4. Set `JIRA_EMAIL` to your Atlassian account email

## Project Structure

```
kairo/
├── extensions/
│   ├── jira/              # Jira Cloud integration (create, search, update, transition)
│   ├── slack/             # Slack channel integration
│   └── memory-lancedb/   # Long-term vector memory
├── skills/
│   └── bug-triage/        # Bug triage workflow (Slack → Jira)
├── kairo-cloud/           # Cloud control plane (Next.js — signup, OAuth, provisioning)
├── scripts/
│   └── start-cloud.sh     # Cloud container startup script
├── src/                   # Core platform
├── ui/                    # Web dashboard
└── kairo.mjs             # CLI entry point
```

## Running Tests

```bash
# Run Jira extension tests
npx vitest run extensions/jira

# Run all tests
pnpm test
```

## License

MIT
