import type {
  CreateIssueRequest,
  CreateIssueResponse,
  JiraIssue,
  JiraSearchResult,
  JiraTransition,
} from "./types.js";

/**
 * Convert plain text to Atlassian Document Format (ADF).
 * Jira Cloud REST API v3 requires ADF for description fields.
 */
export function textToAdf(text: string): unknown {
  return {
    type: "doc",
    version: 1,
    content: text.split("\n\n").map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export class JiraClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: { baseUrl: string; email: string; apiToken: string }) {
    // Normalize base URL: remove trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    // Jira Cloud uses Basic Auth: base64(email:apiToken)
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${path}`;
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errors: unknown;
      try {
        errors = await response.json();
      } catch {
        // response body may not be JSON
      }
      throw new JiraApiError(
        `Jira API ${response.status}: ${response.statusText}`,
        response.status,
        errors,
      );
    }

    // Some endpoints (PUT, DELETE) return 204 with no body
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async createIssue(
    request: CreateIssueRequest,
    signal?: AbortSignal,
  ): Promise<CreateIssueResponse> {
    return this.request<CreateIssueResponse>(
      "/issue",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      signal,
    );
  }

  async searchIssues(
    jql: string,
    maxResults = 20,
    signal?: AbortSignal,
  ): Promise<JiraSearchResult> {
    const params = new URLSearchParams({
      jql,
      maxResults: String(maxResults),
      fields:
        "summary,status,priority,issuetype,assignee,reporter,created,updated,labels,project,description",
    });
    // Use /search/jql endpoint (the old /search was removed in 2025)
    const result = await this.request<{
      issues: JiraIssue[];
      total: number;
      startAt: number;
      isLast?: boolean;
    }>(`/search/jql?${params.toString()}`, {}, signal);
    return {
      issues: result.issues,
      total: result.total,
      maxResults,
      startAt: result.startAt,
    };
  }

  async getIssue(issueKey: string, signal?: AbortSignal): Promise<JiraIssue> {
    return this.request<JiraIssue>(`/issue/${encodeURIComponent(issueKey)}`, {}, signal);
  }

  async updateIssue(
    issueKey: string,
    fields: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.request<void>(
      `/issue/${encodeURIComponent(issueKey)}`,
      {
        method: "PUT",
        body: JSON.stringify({ fields }),
      },
      signal,
    );
  }

  async getTransitions(issueKey: string, signal?: AbortSignal): Promise<JiraTransition[]> {
    const result = await this.request<{ transitions: JiraTransition[] }>(
      `/issue/${encodeURIComponent(issueKey)}/transitions`,
      {},
      signal,
    );
    return result.transitions;
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.request<void>(
      `/issue/${encodeURIComponent(issueKey)}/transitions`,
      {
        method: "POST",
        body: JSON.stringify({ transition: { id: transitionId } }),
      },
      signal,
    );
  }

  async addComment(issueKey: string, body: string, signal?: AbortSignal): Promise<void> {
    await this.request<unknown>(
      `/issue/${encodeURIComponent(issueKey)}/comment`,
      {
        method: "POST",
        body: JSON.stringify({ body: textToAdf(body) }),
      },
      signal,
    );
  }

  /** Build the browser URL for an issue (for linking in Slack responses). */
  issueUrl(issueKey: string): string {
    return `${this.baseUrl}/browse/${issueKey}`;
  }
}
