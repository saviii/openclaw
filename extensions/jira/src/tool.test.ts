import { afterEach, describe, expect, it, vi } from "vitest";
import { JiraClient } from "./api.js";
import { createJiraExecutor } from "./tool.js";

// Create a real client so issueUrl works, but mock all API methods
const client = new JiraClient({
  baseUrl: "https://test.atlassian.net",
  email: "user@test.com",
  apiToken: "test-token",
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeExecutor(defaults = { projectKey: "TEST", defaultIssueType: "Bug" }) {
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

describe("create action", () => {
  it("requires summary", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "create" } as never);
    expect(parseResult(result).error).toContain("summary is required");
  });

  it("requires projectKey when no default", async () => {
    const execute = createJiraExecutor(client, {});
    const result = await execute("id", { action: "create", summary: "Test" } as never);
    expect(parseResult(result).error).toContain("projectKey is required");
  });

  it("returns issue key and url on success", async () => {
    mockFetch(201, { id: "10001", key: "TEST-1", self: "" });
    const execute = makeExecutor();
    const result = await execute("id", { action: "create", summary: "Bug report" } as never);
    const parsed = parseResult(result);
    expect(parsed.success).toBe(true);
    expect(parsed.key).toBe("TEST-1");
    expect(parsed.url).toBe("https://test.atlassian.net/browse/TEST-1");
  });

  it("uses default issue type from config", async () => {
    mockFetch(201, { id: "10001", key: "TEST-1", self: "" });
    const execute = createJiraExecutor(client, { projectKey: "TEST", defaultIssueType: "Task" });
    const result = await execute("id", { action: "create", summary: "A task" } as never);
    expect(parseResult(result).issueType).toBe("Task");
  });
});

describe("search action", () => {
  it("requires jql", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "search" } as never);
    expect(parseResult(result).error).toContain("jql is required");
  });

  it("returns formatted issues", async () => {
    mockFetch(200, {
      issues: [
        {
          key: "TEST-1",
          id: "1",
          self: "",
          fields: {
            summary: "Bug",
            status: { name: "Open" },
            priority: { name: "High" },
            issuetype: { name: "Bug" },
            assignee: { displayName: "Alice" },
          },
        },
      ],
      isLast: true,
    });
    const execute = makeExecutor();
    const result = await execute("id", { action: "search", jql: "project = TEST" } as never);
    const parsed = parseResult(result);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0].key).toBe("TEST-1");
    expect(parsed.issues[0].assignee).toBe("Alice");
  });
});

describe("update action", () => {
  it("requires issueKey", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "update", summary: "New title" } as never);
    expect(parseResult(result).error).toContain("issueKey is required");
  });

  it("requires at least one field", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "update", issueKey: "TEST-1" } as never);
    expect(parseResult(result).error).toContain("At least one field");
  });

  it("returns updated fields on success", async () => {
    // update returns 204, comment returns 201
    mockFetchSequence([{ status: 204, body: null }]);
    const execute = makeExecutor();
    const result = await execute("id", {
      action: "update",
      issueKey: "TEST-1",
      summary: "Updated",
      priority: "High",
    } as never);
    const parsed = parseResult(result);
    expect(parsed.success).toBe(true);
    expect(parsed.updated).toContain("summary");
    expect(parsed.updated).toContain("priority");
  });

  it("adds comment when provided", async () => {
    mockFetchSequence([
      { status: 204, body: null },
      { status: 201, body: { id: "100" } },
    ]);
    const execute = makeExecutor();
    const result = await execute("id", {
      action: "update",
      issueKey: "TEST-1",
      summary: "Updated",
      comment: "Added context",
    } as never);
    const parsed = parseResult(result);
    expect(parsed.commented).toBe(true);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });
});

describe("transition action", () => {
  it("requires issueKey", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "transition", transitionName: "Done" } as never);
    expect(parseResult(result).error).toContain("issueKey is required");
  });

  it("requires transitionName", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "transition", issueKey: "TEST-1" } as never);
    expect(parseResult(result).error).toContain("transitionName is required");
  });

  it("matches transition name case-insensitively", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          transitions: [
            { id: "21", name: "In Progress", to: { name: "In Progress", id: "2" } },
            { id: "41", name: "Done", to: { name: "Done", id: "4" } },
          ],
        },
      },
      { status: 204, body: null },
    ]);
    const execute = makeExecutor();
    const result = await execute("id", {
      action: "transition",
      issueKey: "TEST-1",
      transitionName: "in progress",
    } as never);
    const parsed = parseResult(result);
    expect(parsed.success).toBe(true);
    expect(parsed.transitioned.toStatus).toBe("In Progress");
  });

  it("returns available transitions when name not found", async () => {
    mockFetch(200, {
      transitions: [
        { id: "21", name: "In Progress", to: { name: "In Progress", id: "2" } },
        { id: "41", name: "Done", to: { name: "Done", id: "4" } },
      ],
    });
    const execute = makeExecutor();
    const result = await execute("id", {
      action: "transition",
      issueKey: "TEST-1",
      transitionName: "Nonexistent",
    } as never);
    const parsed = parseResult(result);
    expect(parsed.success).toBe(false);
    expect(parsed.availableTransitions).toContain("In Progress");
    expect(parsed.availableTransitions).toContain("Done");
  });
});
