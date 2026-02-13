import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "./api.js";
import { createGitHubExecutor } from "./tool.js";

const client = new GitHubClient({
  token: "ghp_test-token",
  owner: "test-org",
  repo: "test-repo",
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeExecutor(defaults = { owner: "test-org", repo: "test-repo" }) {
  return createGitHubExecutor(client, defaults);
}

function mockFetch(status: number, body: unknown) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("list_prs action", () => {
  it("returns formatted pull requests", async () => {
    mockFetch(200, [
      {
        number: 42,
        title: "Add auth feature",
        state: "open",
        html_url: "https://github.com/test-org/test-repo/pull/42",
        user: { login: "alice" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        draft: false,
        head: { ref: "feature/auth", sha: "abc123" },
        base: { ref: "main" },
        labels: [{ name: "enhancement", color: "00ff00" }],
        requested_reviewers: [{ login: "bob" }],
      },
    ]);
    const execute = makeExecutor();
    const result = await execute("id", { action: "list_prs" } as never);
    const parsed = parseResult(result);
    expect(parsed.pullRequests).toHaveLength(1);
    expect(parsed.pullRequests[0].number).toBe(42);
    expect(parsed.pullRequests[0].author).toBe("alice");
    expect(parsed.pullRequests[0].branch).toBe("feature/auth");
    expect(parsed.pullRequests[0].reviewers).toContain("bob");
    expect(parsed.repository).toBe("test-org/test-repo");
  });

  it("passes state filter", async () => {
    mockFetch(200, []);
    const execute = makeExecutor();
    await execute("id", { action: "list_prs", state: "closed" } as never);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(fetchCall[0]).toContain("state=closed");
  });
});

describe("get_pr action", () => {
  it("requires prNumber", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "get_pr" } as never);
    expect(parseResult(result).error).toContain("prNumber is required");
  });

  it("returns full PR details", async () => {
    mockFetch(200, {
      number: 42,
      title: "Add auth feature",
      state: "open",
      html_url: "https://github.com/test-org/test-repo/pull/42",
      user: { login: "alice" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      merged_at: null,
      draft: false,
      body: "This PR adds authentication.",
      head: { ref: "feature/auth", sha: "abc123" },
      base: { ref: "main" },
      labels: [],
      requested_reviewers: [],
      mergeable_state: "clean",
      additions: 150,
      deletions: 20,
      changed_files: 5,
    });
    const execute = makeExecutor();
    const result = await execute("id", { action: "get_pr", prNumber: 42 } as never);
    const parsed = parseResult(result);
    expect(parsed.number).toBe(42);
    expect(parsed.mergeableState).toBe("clean");
    expect(parsed.additions).toBe(150);
    expect(parsed.changedFiles).toBe(5);
    expect(parsed.body).toBe("This PR adds authentication.");
  });
});

describe("list_issues action", () => {
  it("returns issues and filters out PRs", async () => {
    mockFetch(200, [
      {
        number: 10,
        title: "Login bug",
        state: "open",
        html_url: "https://github.com/test-org/test-repo/issues/10",
        user: { login: "alice" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        body: "Login is broken",
        labels: [{ name: "bug", color: "ff0000" }],
        assignees: [{ login: "bob" }],
        comments: 3,
      },
      {
        number: 42,
        title: "A pull request",
        state: "open",
        html_url: "https://github.com/test-org/test-repo/pull/42",
        user: { login: "alice" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        body: null,
        labels: [],
        assignees: [],
        comments: 0,
        pull_request: { url: "https://api.github.com/repos/test-org/test-repo/pulls/42" },
      },
    ]);
    const execute = makeExecutor();
    const result = await execute("id", { action: "list_issues" } as never);
    const parsed = parseResult(result);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0].number).toBe(10);
    expect(parsed.issues[0].assignees).toContain("bob");
  });
});

describe("get_issue action", () => {
  it("requires issueNumber", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "get_issue" } as never);
    expect(parseResult(result).error).toContain("issueNumber is required");
  });

  it("returns full issue details", async () => {
    mockFetch(200, {
      number: 10,
      title: "Login bug",
      state: "open",
      html_url: "https://github.com/test-org/test-repo/issues/10",
      user: { login: "alice" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      body: "Steps to reproduce...",
      labels: [{ name: "bug", color: "ff0000" }],
      assignees: [{ login: "bob" }],
      comments: 5,
    });
    const execute = makeExecutor();
    const result = await execute("id", { action: "get_issue", issueNumber: 10 } as never);
    const parsed = parseResult(result);
    expect(parsed.number).toBe(10);
    expect(parsed.body).toBe("Steps to reproduce...");
    expect(parsed.comments).toBe(5);
  });
});

describe("search action", () => {
  it("requires query", async () => {
    const execute = makeExecutor();
    const result = await execute("id", { action: "search" } as never);
    expect(parseResult(result).error).toContain("query is required");
  });

  it("scopes search to repo and returns results", async () => {
    mockFetch(200, {
      total_count: 1,
      incomplete_results: false,
      items: [{ number: 10, title: "Auth bug" }],
    });
    const execute = makeExecutor();
    const result = await execute("id", { action: "search", query: "auth bug" } as never);
    const parsed = parseResult(result);
    expect(parsed.totalCount).toBe(1);
    expect(parsed.query).toContain("repo:test-org/test-repo");
    expect(parsed.items).toHaveLength(1);
  });
});

describe("list_branches action", () => {
  it("returns branches", async () => {
    mockFetch(200, [
      { name: "main", commit: { sha: "abc123" }, protected: true },
      { name: "feature/auth", commit: { sha: "def456" }, protected: false },
    ]);
    const execute = makeExecutor();
    const result = await execute("id", { action: "list_branches" } as never);
    const parsed = parseResult(result);
    expect(parsed.branches).toHaveLength(2);
    expect(parsed.branches[0].name).toBe("main");
    expect(parsed.branches[0].protected).toBe(true);
    expect(parsed.branches[1].name).toBe("feature/auth");
  });
});

describe("error handling", () => {
  it("returns API errors as JSON", async () => {
    mockFetch(404, { message: "Not Found" });
    const execute = makeExecutor();
    const result = await execute("id", { action: "list_prs" } as never);
    const parsed = parseResult(result);
    expect(parsed.error).toContain("GitHub API 404");
  });

  it("handles owner/repo override", async () => {
    mockFetch(200, []);
    const execute = makeExecutor();
    await execute("id", {
      action: "list_prs",
      owner: "other-org",
      repo: "other-repo",
    } as never);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(fetchCall[0]).toContain("/repos/other-org/other-repo/pulls");
  });
});
