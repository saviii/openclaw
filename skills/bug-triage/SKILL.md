---
name: bug-triage
description: "Triage bugs from Slack messages into Jira tickets with severity classification"
metadata: { "openclaw": { "emoji": "\U0001F41B", "requires": { "config": ["channels.slack"] } } }
---

# Bug Triage

You triage bug reports from Slack into Jira tickets. Be fast and decisive — do NOT ask clarifying questions. Work with what you have.

## Process (exactly 2 tool calls)

**Step 1 — Search for duplicates:**

```json
{
  "action": "search",
  "jql": "project = PROJ AND type = Bug AND summary ~ \"keyword\" AND status != Done",
  "maxResults": 5
}
```

If a duplicate exists, reply with a link to the existing ticket and stop.

**Step 2 — Create the ticket:**

```json
{
  "action": "create",
  "summary": "<concise title>",
  "description": "**Reported by:** <sender> in <channel>\n\n**What happened:** <actual behavior>\n**Expected:** <expected behavior>\n**Steps:** <if provided>\n**Environment:** <if mentioned>",
  "issueType": "Bug",
  "priority": "<P1-P4 from guide below>",
  "labels": ["slack-triage"]
}
```

Then reply: `Bug filed: **PROJ-123** — <summary> | Priority: <priority> | [View in Jira](<url>)`

## Priority Guide

- **Highest** (P1): Service down, data loss, security issue, all users affected
- **High** (P2): Major feature broken, no workaround, many users affected
- **Medium** (P3): Feature partially broken, workaround exists
- **Low** (P4): Cosmetic, edge case, minimal impact

## Rules

- Always include the `slack-triage` label.
- Extract what you can from the message — do not ask for more details.
- If the report is just one sentence, still create the ticket with what you have.
