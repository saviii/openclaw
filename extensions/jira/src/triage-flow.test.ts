import { afterEach, describe, expect, it, vi } from "vitest";
import { JiraClient } from "./api.js";
import { createJiraExecutor } from "./tool.js";

const client = new JiraClient({
  baseUrl: "https://savipablas.atlassian.net",
  email: "user@test.com",
  apiToken: "test-token",
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeExecutor(defaults = { projectKey: "SCRUM", defaultIssueType: "Bug" }) {
  return createJiraExecutor(client, defaults);
}

function mockFetch(status: number, body: unknown) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function makeResponse(status: number, body: unknown): Response {
  if (status === 204) {
    return new Response(null, { status, statusText: "No Content" });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  const fetchMock = vi.fn();
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce(makeResponse(r.status, r.body));
  }
  vi.stubGlobal("fetch", fetchMock);
}

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("bug-triage Jira tool integration", () => {
  it("creates issue with all triage fields", async () => {
    mockFetch(201, { id: "10001", key: "SCRUM-42", self: "" });
    const execute = makeExecutor();
    const result = await execute("id", {
      action: "create",
      summary: "Login timeout on mobile Safari after password entry",
      description:
        "**Reported by:** @alice in #bugs\n**Environment:** iOS 18, Safari\n\n**Steps to reproduce:**\n1. Open login page on iPhone\n2. Enter valid credentials\n3. Tap Sign In\n\n**Expected:** Redirect to dashboard\n**Actual:** Page hangs with spinner for 30+ seconds",
      issueType: "Bug",
      priority: "High",
      labels: ["mobile", "auth", "slack-triage"],
    } as never);
    const parsed = parseResult(result);
    expect(parsed.success).toBe(true);
    expect(parsed.key).toBe("SCRUM-42");
    expect(parsed.url).toBe("https://savipablas.atlassian.net/browse/SCRUM-42");
    expect(parsed.issueType).toBe("Bug");
    expect(parsed.projectKey).toBe("SCRUM");
  });

  it("sends labels including slack-triage in fetch payload", async () => {
    mockFetch(201, { id: "10001", key: "SCRUM-42", self: "" });
    const execute = makeExecutor();
    await execute("id", {
      action: "create",
      summary: "Checkout 500 error with large cart",
      issueType: "Bug",
      priority: "High",
      labels: ["checkout", "slack-triage"],
    } as never);

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.fields.labels).toContain("slack-triage");
    expect(body.fields.issuetype.name).toBe("Bug");
    expect(body.fields.priority.name).toBe("High");
  });

  it("search-before-create flow: no duplicates then creates", async () => {
    mockFetchSequence([
      // First call: search returns no results
      { status: 200, body: { issues: [], total: 0, isLast: true } },
      // Second call: create succeeds
      { status: 201, body: { id: "10002", key: "SCRUM-43", self: "" } },
    ]);
    const execute = makeExecutor();

    // Step 1: search for duplicates
    const searchResult = await execute("id-1", {
      action: "search",
      jql: 'project = SCRUM AND type = Bug AND summary ~ "login timeout" AND status != Done',
      maxResults: 5,
    } as never);
    const searchParsed = parseResult(searchResult);
    expect(searchParsed.total).toBe(0);
    expect(searchParsed.issues).toHaveLength(0);

    // Step 2: create since no duplicates
    const createResult = await execute("id-2", {
      action: "create",
      summary: "Login timeout on mobile Safari",
      issueType: "Bug",
      priority: "High",
      labels: ["mobile", "slack-triage"],
    } as never);
    const createParsed = parseResult(createResult);
    expect(createParsed.success).toBe(true);
    expect(createParsed.key).toBe("SCRUM-43");
  });

  it("search finds duplicate: returns existing issue", async () => {
    mockFetch(200, {
      issues: [
        {
          key: "SCRUM-10",
          id: "10010",
          self: "",
          fields: {
            summary: "Login page timeout on mobile browsers",
            status: { name: "Open" },
            priority: { name: "High" },
            issuetype: { name: "Bug" },
            assignee: { displayName: "Savi" },
          },
        },
      ],
      total: 1,
      isLast: true,
    });
    const execute = makeExecutor();

    const result = await execute("id", {
      action: "search",
      jql: 'project = SCRUM AND type = Bug AND summary ~ "login timeout" AND status != Done',
      maxResults: 5,
    } as never);
    const parsed = parseResult(result);
    expect(parsed.total).toBe(1);
    expect(parsed.issues[0].key).toBe("SCRUM-10");
    expect(parsed.issues[0].url).toBe("https://savipablas.atlassian.net/browse/SCRUM-10");
    expect(parsed.issues[0].assignee).toBe("Savi");
  });
});
