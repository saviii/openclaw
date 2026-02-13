---
name: bug-triage
description: "Triage bugs from Slack messages into Jira tickets with severity classification"
metadata: { "openclaw": { "emoji": "\U0001F41B", "requires": { "config": ["channels.slack"] } } }
---

# Bug Triage

Triage bug reports into Jira tickets. Be fast — no clarifying questions.

## Process

Call BOTH tools in a single response (parallel tool calls):

1. **Search** for duplicates: `{ "action": "search", "jql": "project = SCRUM AND type = Bug AND summary ~ \"keyword\" AND status != Done", "maxResults": 5 }`
2. **Create** the ticket: `{ "action": "create", "summary": "<title>", "description": "**Reported by:** <sender> in <channel>\n**What happened:** <behavior>\n**Expected:** <expected>", "issueType": "Bug", "priority": "<see guide>", "labels": ["slack-triage"] }`

If the search returns a duplicate, reply with a link to the existing ticket instead.

Reply format: `Bug filed: **PROJ-123** — <summary> | Priority: <priority> | [View in Jira](<url>)`

## Priority: Highest=service down/data loss, High=major feature broken, Medium=partial/workaround, Low=cosmetic

## Rules: Always use `slack-triage` label. Extract what you can. One sentence is enough to file.
