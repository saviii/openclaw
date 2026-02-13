import type {
  GitHubPullRequest,
  GitHubIssue,
  GitHubBranch,
  GitHubSearchResult,
  GitHubUser,
} from "./types.js";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubClient {
  private readonly token: string;
  private readonly defaultOwner: string;
  private readonly defaultRepo: string;

  constructor(config: { token: string; owner: string; repo: string }) {
    this.token = config.token;
    this.defaultOwner = config.owner;
    this.defaultRepo = config.repo;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `https://api.github.com${path}`;
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
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
      throw new GitHubApiError(
        `GitHub API ${response.status}: ${response.statusText}`,
        response.status,
        errors,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private repoPath(owner?: string, repo?: string): string {
    return `/repos/${owner ?? this.defaultOwner}/${repo ?? this.defaultRepo}`;
  }

  async listPullRequests(
    options?: { state?: string; sort?: string; direction?: string; perPage?: number },
    owner?: string,
    repo?: string,
    signal?: AbortSignal,
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams();
    if (options?.state) params.set("state", options.state);
    if (options?.sort) params.set("sort", options.sort);
    if (options?.direction) params.set("direction", options.direction);
    params.set("per_page", String(options?.perPage ?? 20));

    return this.request<GitHubPullRequest[]>(
      `${this.repoPath(owner, repo)}/pulls?${params.toString()}`,
      {},
      signal,
    );
  }

  async getPullRequest(
    prNumber: number,
    owner?: string,
    repo?: string,
    signal?: AbortSignal,
  ): Promise<GitHubPullRequest> {
    return this.request<GitHubPullRequest>(
      `${this.repoPath(owner, repo)}/pulls/${prNumber}`,
      {},
      signal,
    );
  }

  async listIssues(
    options?: { state?: string; labels?: string; sort?: string; perPage?: number },
    owner?: string,
    repo?: string,
    signal?: AbortSignal,
  ): Promise<GitHubIssue[]> {
    const params = new URLSearchParams();
    if (options?.state) params.set("state", options.state);
    if (options?.labels) params.set("labels", options.labels);
    if (options?.sort) params.set("sort", options.sort);
    params.set("per_page", String(options?.perPage ?? 20));

    return this.request<GitHubIssue[]>(
      `${this.repoPath(owner, repo)}/issues?${params.toString()}`,
      {},
      signal,
    );
  }

  async getIssue(
    issueNumber: number,
    owner?: string,
    repo?: string,
    signal?: AbortSignal,
  ): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(
      `${this.repoPath(owner, repo)}/issues/${issueNumber}`,
      {},
      signal,
    );
  }

  async search(
    query: string,
    type: "issues" | "code" | "commits" = "issues",
    perPage = 20,
    signal?: AbortSignal,
  ): Promise<GitHubSearchResult<unknown>> {
    const params = new URLSearchParams({
      q: query,
      per_page: String(perPage),
    });

    return this.request<GitHubSearchResult<unknown>>(
      `/search/${type}?${params.toString()}`,
      {},
      signal,
    );
  }

  async listBranches(owner?: string, repo?: string, signal?: AbortSignal): Promise<GitHubBranch[]> {
    return this.request<GitHubBranch[]>(
      `${this.repoPath(owner, repo)}/branches?per_page=100`,
      {},
      signal,
    );
  }

  async getAuthenticatedUser(signal?: AbortSignal): Promise<GitHubUser> {
    return this.request<GitHubUser>("/user", {}, signal);
  }

  prUrl(prNumber: number, owner?: string, repo?: string): string {
    return `https://github.com/${owner ?? this.defaultOwner}/${repo ?? this.defaultRepo}/pull/${prNumber}`;
  }

  issueUrl(issueNumber: number, owner?: string, repo?: string): string {
    return `https://github.com/${owner ?? this.defaultOwner}/${repo ?? this.defaultRepo}/issues/${issueNumber}`;
  }
}
