import { afterEach, describe, expect, it, vi } from "vitest";
import { JiraClient, JiraApiError, textToAdf } from "./api.js";

const client = new JiraClient({
  baseUrl: "https://test.atlassian.net",
  email: "user@test.com",
  apiToken: "test-token",
});

function mockFetch(status: number, body: unknown, statusText = "OK") {
  const response = new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function mockFetchNoBody(status: number) {
  const response = new Response(null, { status, statusText: "No Content" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("textToAdf", () => {
  it("converts single paragraph", () => {
    const result = textToAdf("Hello world") as { type: string; content: unknown[] };
    expect(result.type).toBe("doc");
    expect(result.content).toHaveLength(1);
  });

  it("splits on double newlines", () => {
    const result = textToAdf("First\n\nSecond\n\nThird") as { content: unknown[] };
    expect(result.content).toHaveLength(3);
  });
});

describe("JiraClient", () => {
  it("sends Basic Auth header", async () => {
    mockFetch(200, { issues: [], total: 0, startAt: 0, isLast: true });
    await client.searchIssues("project = TEST");

    const fetchMock = vi.mocked(globalThis.fetch);
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Basic /);
    // base64("user@test.com:test-token")
    const decoded = Buffer.from(headers.Authorization.replace("Basic ", ""), "base64").toString();
    expect(decoded).toBe("user@test.com:test-token");
  });

  describe("createIssue", () => {
    it("returns created issue key and id", async () => {
      mockFetch(201, {
        id: "10001",
        key: "TEST-1",
        self: "https://test.atlassian.net/rest/api/3/issue/10001",
      });
      const result = await client.createIssue({
        fields: {
          project: { key: "TEST" },
          summary: "Test issue",
          issuetype: { name: "Bug" },
        },
      });
      expect(result.key).toBe("TEST-1");
      expect(result.id).toBe("10001");
    });

    it("sends POST to /rest/api/3/issue", async () => {
      mockFetch(201, { id: "10001", key: "TEST-1", self: "" });
      await client.createIssue({
        fields: { project: { key: "TEST" }, summary: "x", issuetype: { name: "Bug" } },
      });
      const fetchMock = vi.mocked(globalThis.fetch);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://test.atlassian.net/rest/api/3/issue");
      expect(options?.method).toBe("POST");
    });
  });

  describe("searchIssues", () => {
    it("uses /search/jql endpoint", async () => {
      mockFetch(200, { issues: [], total: 0, startAt: 0, isLast: true });
      await client.searchIssues("project = TEST");
      const fetchMock = vi.mocked(globalThis.fetch);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/rest/api/3/search/jql?");
      expect(url).toContain("jql=project");
    });

    it("returns issues with total count", async () => {
      mockFetch(200, {
        issues: [
          { key: "TEST-1", id: "1", self: "", fields: { summary: "Bug" } },
          { key: "TEST-2", id: "2", self: "", fields: { summary: "Feature" } },
        ],
        total: 2,
        startAt: 0,
        isLast: true,
      });
      const result = await client.searchIssues("project = TEST");
      expect(result.issues).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.startAt).toBe(0);
    });

    it("preserves server total when it exceeds page size", async () => {
      mockFetch(200, {
        issues: [{ key: "TEST-1", id: "1", self: "", fields: { summary: "Bug" } }],
        total: 42,
        startAt: 0,
        isLast: false,
      });
      const result = await client.searchIssues("project = TEST", 1);
      expect(result.issues).toHaveLength(1);
      expect(result.total).toBe(42);
      expect(result.maxResults).toBe(1);
    });
  });

  describe("updateIssue", () => {
    it("sends PUT with fields", async () => {
      mockFetchNoBody(204);
      await client.updateIssue("TEST-1", { summary: "Updated" });
      const fetchMock = vi.mocked(globalThis.fetch);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/rest/api/3/issue/TEST-1");
      expect(options?.method).toBe("PUT");
      expect(JSON.parse(options?.body as string)).toEqual({ fields: { summary: "Updated" } });
    });
  });

  describe("getTransitions", () => {
    it("returns transitions array", async () => {
      mockFetch(200, {
        transitions: [
          { id: "11", name: "To Do", to: { name: "To Do", id: "1" } },
          { id: "21", name: "In Progress", to: { name: "In Progress", id: "2" } },
        ],
      });
      const transitions = await client.getTransitions("TEST-1");
      expect(transitions).toHaveLength(2);
      expect(transitions[0].name).toBe("To Do");
      expect(transitions[1].id).toBe("21");
    });
  });

  describe("transitionIssue", () => {
    it("sends POST with transition id", async () => {
      mockFetchNoBody(204);
      await client.transitionIssue("TEST-1", "21");
      const fetchMock = vi.mocked(globalThis.fetch);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/issue/TEST-1/transitions");
      expect(options?.method).toBe("POST");
      expect(JSON.parse(options?.body as string)).toEqual({ transition: { id: "21" } });
    });
  });

  describe("addComment", () => {
    it("sends POST with ADF body", async () => {
      mockFetch(201, { id: "100" });
      await client.addComment("TEST-1", "This is a comment");
      const fetchMock = vi.mocked(globalThis.fetch);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/issue/TEST-1/comment");
      expect(options?.method).toBe("POST");
      const body = JSON.parse(options?.body as string);
      expect(body.body.type).toBe("doc");
    });
  });

  describe("error handling", () => {
    it("throws JiraApiError on non-OK response", async () => {
      mockFetch(401, { errorMessages: ["Unauthorized"] }, "Unauthorized");
      await expect(client.searchIssues("project = TEST")).rejects.toThrow(JiraApiError);
    });

    it("includes status code in error", async () => {
      mockFetch(403, { errorMessages: ["Forbidden"] }, "Forbidden");
      try {
        await client.searchIssues("project = TEST");
      } catch (err) {
        expect(err).toBeInstanceOf(JiraApiError);
        expect((err as JiraApiError).status).toBe(403);
      }
    });
  });

  describe("issueUrl", () => {
    it("builds browse URL", () => {
      expect(client.issueUrl("TEST-1")).toBe("https://test.atlassian.net/browse/TEST-1");
    });
  });
});
