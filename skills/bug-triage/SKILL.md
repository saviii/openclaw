---
name: bug-triage
description: "Triage bugs from Slack messages into Jira tickets with severity classification and structured details"
metadata: { "openclaw": { "emoji": "\U0001F41B", "requires": { "config": ["channels.slack"] } } }
---

# Bug Triage

Triage bug reports from Slack conversations into structured Jira tickets. Extract details, classify severity, create the ticket, and reply in the Slack thread with the Jira link.

## Prerequisites

The Jira extension must be configured with valid credentials. Set these environment variables or configure via the plugin config:

- `JIRA_BASE_URL` — Your Jira Cloud URL (e.g. `https://your-domain.atlassian.net`)
- `JIRA_EMAIL` — Email for your Jira account
- `JIRA_API_TOKEN` — API token from https://id.atlassian.com/manage/api-tokens
- `JIRA_PROJECT_KEY` — Default project key (e.g. `PROJ`)

## Triage Process

When a user reports a bug (via message, emoji reaction, or explicit request):

1. **Extract details** from the message and thread context:
   - Title (concise summary)
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (browser, OS, device if mentioned)
   - Screenshots or error messages if provided

2. **Check for duplicates** before creating:

```json
{
  "action": "search",
  "jql": "project = PROJ AND type = Bug AND summary ~ \"keyword\" AND status != Done ORDER BY created DESC",
  "maxResults": 5
}
```

3. **Classify severity** using the priority guide below.

4. **Create the Jira ticket**:

```json
{
  "action": "create",
  "summary": "Login timeout on mobile Safari after password entry",
  "description": "**Reported by:** @username in #bugs\n**Environment:** iOS 18, Safari\n\n**Steps to reproduce:**\n1. Open login page on iPhone\n2. Enter valid credentials\n3. Tap Sign In\n\n**Expected:** Redirect to dashboard\n**Actual:** Page hangs with spinner for 30+ seconds, then times out\n\n**Error:** Console shows `net::ERR_CONNECTION_TIMED_OUT`",
  "issueType": "Bug",
  "priority": "High",
  "labels": ["mobile", "auth", "slack-triage"]
}
```

5. **Reply in the Slack thread** with the result:

> Bug filed: **PROJ-123** — Login timeout on mobile Safari after password entry
> Priority: High | Type: Bug | [View in Jira](https://your-domain.atlassian.net/browse/PROJ-123)

## Priority Guide

| Priority         | Criteria                                                            | Examples                                             |
| ---------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| **Highest** (P1) | Service down, data loss, security vulnerability, all users affected | Production outage, payment failures, auth bypass     |
| **High** (P2)    | Major feature broken, no workaround, many users affected            | Cannot create accounts, search returns wrong results |
| **Medium** (P3)  | Feature partially broken, workaround exists, some users affected    | Slow page load, formatting issues, minor UI glitch   |
| **Low** (P4)     | Cosmetic issue, edge case, minimal user impact                      | Typo in UI, alignment off by 1px, rare edge case     |

## Tool Actions Reference

**Search for existing issues:**

```json
{
  "action": "search",
  "jql": "project = PROJ AND type = Bug AND status = Open ORDER BY priority DESC",
  "maxResults": 10
}
```

**Update an issue (add details, change priority):**

```json
{ "action": "update", "issueKey": "PROJ-123", "priority": "Highest", "labels": ["escalated", "p1"] }
```

**Transition an issue (change status):**

```json
{ "action": "transition", "issueKey": "PROJ-123", "transitionName": "In Progress" }
```

## Tips

- Always add the `slack-triage` label so triaged bugs are trackable.
- Include the Slack reporter's name and channel in the description for traceability.
- If the bug report is vague, ask clarifying questions in the thread before creating the ticket.
- When a duplicate is found, link to the existing ticket instead of creating a new one.
- Use `search` before `create` to avoid duplicate tickets.
