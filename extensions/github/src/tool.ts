import { Type } from "@sinclair/typebox";
import { stringEnum } from "openclaw/plugin-sdk";
import { GitHubClient } from "./api.js";

const ACTIONS = [
  "list_prs",
  "get_pr",
  "list_issues",
  "get_issue",
  "search",
  "list_branches",
] as const;

type AgentToolResult = {
  content: Array<{ type: string; text: string }>;
  details?: unknown;
};

export const GitHubToolSchema = Type.Object(
  {
    action: stringEnum(ACTIONS, { description: `Action to perform: ${ACTIONS.join(", ")}` }),
    owner: Type.Optional(Type.String({ description: "GitHub repo owner/org. Overrides default." })),
    repo: Type.Optional(Type.String({ description: "GitHub repo name. Overrides default." })),
    prNumber: Type.Optional(Type.Number({ description: "PR number (required for get_pr)" })),
    issueNumber: Type.Optional(
      Type.Number({ description: "Issue number (required for get_issue)" }),
    ),
    state: Type.Optional(
      Type.String({ description: "Filter by state: open, closed, all (default: open)" }),
    ),
    labels: Type.Optional(Type.String({ description: "Comma-separated labels to filter issues" })),
    query: Type.Optional(Type.String({ description: "Search query (required for search)" })),
    searchType: Type.Optional(
      Type.String({ description: "Search type: issues, code, commits (default: issues)" }),
    ),
    maxResults: Type.Optional(Type.Number({ description: "Max results (default: 20)" })),
  },
  { additionalProperties: false },
);

type ToolParams = {
  action: (typeof ACTIONS)[number];
  owner?: string;
  repo?: string;
  prNumber?: number;
  issueNumber?: number;
  state?: string;
  labels?: string;
  query?: string;
  searchType?: string;
  maxResults?: number;
};

type DefaultConfig = {
  owner: string;
  repo: string;
};

function json(payload: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

export function createGitHubExecutor(client: GitHubClient, defaults: DefaultConfig) {
  return async function executeGitHubTool(
    _toolCallId: string,
    params: ToolParams,
    signal?: AbortSignal,
    _onUpdate?: unknown,
  ): Promise<AgentToolResult> {
    try {
      const owner = params.owner ?? defaults.owner;
      const repo = params.repo ?? defaults.repo;

      switch (params.action) {
        case "list_prs": {
          const prs = await client.listPullRequests(
            {
              state: params.state ?? "open",
              sort: "updated",
              direction: "desc",
              perPage: params.maxResults ?? 20,
            },
            owner,
            repo,
            signal,
          );

          const items = prs.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            draft: pr.draft,
            author: pr.user.login,
            branch: pr.head.ref,
            baseBranch: pr.base.ref,
            labels: pr.labels.map((l) => l.name),
            reviewers: pr.requested_reviewers.map((r) => r.login),
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
          }));

          return json({
            total: items.length,
            repository: `${owner}/${repo}`,
            pullRequests: items,
          });
        }

        case "get_pr": {
          if (!params.prNumber) {
            throw new Error("prNumber is required for get_pr action");
          }

          const pr = await client.getPullRequest(params.prNumber, owner, repo, signal);

          return json({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            draft: pr.draft,
            author: pr.user.login,
            body: pr.body,
            branch: pr.head.ref,
            baseBranch: pr.base.ref,
            labels: pr.labels.map((l) => l.name),
            reviewers: pr.requested_reviewers.map((r) => r.login),
            mergedAt: pr.merged_at,
            mergeableState: pr.mergeable_state,
            additions: pr.additions,
            deletions: pr.deletions,
            changedFiles: pr.changed_files,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
          });
        }

        case "list_issues": {
          const issues = await client.listIssues(
            {
              state: params.state ?? "open",
              labels: params.labels,
              sort: "updated",
              perPage: params.maxResults ?? 20,
            },
            owner,
            repo,
            signal,
          );

          // Filter out pull requests (GitHub API returns PRs in the issues endpoint)
          const filtered = issues.filter((i) => !i.pull_request);

          const items = filtered.map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: issue.user.login,
            labels: issue.labels.map((l) => l.name),
            assignees: issue.assignees.map((a) => a.login),
            comments: issue.comments,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: issue.html_url,
          }));

          return json({
            total: items.length,
            repository: `${owner}/${repo}`,
            issues: items,
          });
        }

        case "get_issue": {
          if (!params.issueNumber) {
            throw new Error("issueNumber is required for get_issue action");
          }

          const issue = await client.getIssue(params.issueNumber, owner, repo, signal);

          return json({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: issue.user.login,
            body: issue.body,
            labels: issue.labels.map((l) => l.name),
            assignees: issue.assignees.map((a) => a.login),
            comments: issue.comments,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: issue.html_url,
          });
        }

        case "search": {
          if (!params.query) {
            throw new Error("query is required for search action");
          }

          const searchType = (params.searchType ?? "issues") as "issues" | "code" | "commits";

          // Scope the query to the configured repo
          const scopedQuery = `repo:${owner}/${repo} ${params.query}`;

          const result = await client.search(
            scopedQuery,
            searchType,
            params.maxResults ?? 20,
            signal,
          );

          return json({
            totalCount: result.total_count,
            incompleteResults: result.incomplete_results,
            searchType,
            query: scopedQuery,
            items: result.items,
          });
        }

        case "list_branches": {
          const branches = await client.listBranches(owner, repo, signal);

          const items = branches.map((b) => ({
            name: b.name,
            protected: b.protected,
            sha: b.commit.sha,
          }));

          return json({
            total: items.length,
            repository: `${owner}/${repo}`,
            branches: items,
          });
        }

        default: {
          params.action satisfies never;
          throw new Error(
            `Unknown action: ${String(params.action)}. Valid actions: ${ACTIONS.join(", ")}`,
          );
        }
      }
    } catch (err) {
      return json({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
