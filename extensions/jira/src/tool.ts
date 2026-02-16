import { Type } from "@sinclair/typebox";
import { stringEnum } from "openclaw/plugin-sdk";
import type { JiraConfig } from "./types.js";
import { JiraClient, textToAdf } from "./api.js";

const ACTIONS = ["create", "search", "update", "transition"] as const;

type AgentToolResult = {
  content: Array<{ type: string; text: string }>;
  details?: unknown;
};

export const JiraToolSchema = Type.Object(
  {
    action: stringEnum(ACTIONS, { description: `Action to perform: ${ACTIONS.join(", ")}` }),
    projectKey: Type.Optional(
      Type.String({ description: "Jira project key (e.g. PROJ). Overrides default." }),
    ),
    summary: Type.Optional(Type.String({ description: "Issue title (required for create)" })),
    description: Type.Optional(Type.String({ description: "Issue description body" })),
    issueType: Type.Optional(
      Type.String({ description: "Issue type: Bug, Task, Story, Epic (default from config)" }),
    ),
    priority: Type.Optional(
      Type.String({ description: "Priority: Highest, High, Medium, Low, Lowest" }),
    ),
    labels: Type.Optional(
      Type.Array(Type.String(), { description: "Labels to apply to the issue" }),
    ),
    issueKey: Type.Optional(
      Type.String({ description: "Issue key for update/transition (e.g. PROJ-123)" }),
    ),
    jql: Type.Optional(Type.String({ description: "JQL query for search" })),
    maxResults: Type.Optional(Type.Number({ description: "Max results for search (default: 20)" })),
    transitionName: Type.Optional(
      Type.String({ description: "Target status name for transition (e.g. In Progress, Done)" }),
    ),
    comment: Type.Optional(
      Type.String({ description: "Comment to add when updating or transitioning" }),
    ),
  },
  { additionalProperties: false },
);

type ToolParams = {
  action: (typeof ACTIONS)[number];
  projectKey?: string;
  summary?: string;
  description?: string;
  issueType?: string;
  priority?: string;
  labels?: string[];
  issueKey?: string;
  jql?: string;
  maxResults?: number;
  transitionName?: string;
  comment?: string;
};

type DefaultConfig = {
  projectKey?: string;
  defaultIssueType?: string;
};

function json(payload: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

export function createJiraExecutor(client: JiraClient, defaults: DefaultConfig) {
  return async function executeJiraTool(
    _toolCallId: string,
    params: ToolParams,
    signal?: AbortSignal,
    _onUpdate?: unknown,
  ): Promise<AgentToolResult> {
    try {
      switch (params.action) {
        case "create": {
          if (!params.summary) {
            throw new Error("summary is required for create action");
          }
          const projectKey = params.projectKey ?? defaults.projectKey;
          if (!projectKey) {
            throw new Error("projectKey is required (provide it or set JIRA_PROJECT_KEY)");
          }
          const issueType = params.issueType ?? defaults.defaultIssueType ?? "Bug";

          const result = await client.createIssue(
            {
              fields: {
                project: { key: projectKey },
                summary: params.summary,
                ...(params.description && { description: textToAdf(params.description) }),
                issuetype: { name: issueType },
                ...(params.priority && { priority: { name: params.priority } }),
                ...(params.labels && { labels: params.labels }),
              },
            },
            signal,
          );

          return json({
            success: true,
            key: result.key,
            id: result.id,
            url: client.issueUrl(result.key),
            summary: params.summary,
            issueType,
            projectKey,
          });
        }

        case "search": {
          if (!params.jql) {
            throw new Error("jql is required for search action");
          }
          const result = await client.searchIssues(params.jql, params.maxResults ?? 20, signal);

          const issues = result.issues.map((issue) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            priority: issue.fields.priority?.name ?? "None",
            issueType: issue.fields.issuetype.name,
            assignee: issue.fields.assignee?.displayName ?? "Unassigned",
            url: client.issueUrl(issue.key),
          }));

          return json({
            total: result.total,
            showing: issues.length,
            issues,
          });
        }

        case "update": {
          if (!params.issueKey) {
            throw new Error("issueKey is required for update action");
          }
          const fields: Record<string, unknown> = {};
          if (params.summary) {
            fields.summary = params.summary;
          }
          if (params.description) {
            fields.description = textToAdf(params.description);
          }
          if (params.priority) {
            fields.priority = { name: params.priority };
          }
          if (params.labels) {
            fields.labels = params.labels;
          }
          if (params.issueType) {
            fields.issuetype = { name: params.issueType };
          }

          if (Object.keys(fields).length === 0) {
            throw new Error(
              "At least one field to update is required (summary, description, priority, labels, issueType)",
            );
          }

          await client.updateIssue(params.issueKey, fields, signal);

          if (params.comment) {
            await client.addComment(params.issueKey, params.comment, signal);
          }

          return json({
            success: true,
            key: params.issueKey,
            url: client.issueUrl(params.issueKey),
            updated: Object.keys(fields),
            ...(params.comment && { commented: true }),
          });
        }

        case "transition": {
          if (!params.issueKey) {
            throw new Error("issueKey is required for transition action");
          }
          if (!params.transitionName) {
            throw new Error("transitionName is required for transition action");
          }

          const transitions = await client.getTransitions(params.issueKey, signal);
          const target = transitions.find(
            (t) => t.name.toLowerCase() === params.transitionName!.toLowerCase(),
          );

          if (!target) {
            const available = transitions.map((t) => t.name).join(", ");
            return json({
              success: false,
              error: `Transition "${params.transitionName}" not found for ${params.issueKey}`,
              availableTransitions: available,
              hint: `Use one of: ${available}`,
            });
          }

          await client.transitionIssue(params.issueKey, target.id, signal);

          if (params.comment) {
            await client.addComment(params.issueKey, params.comment, signal);
          }

          return json({
            success: true,
            key: params.issueKey,
            url: client.issueUrl(params.issueKey),
            transitioned: { from: params.transitionName, toStatus: target.to.name },
            ...(params.comment && { commented: true }),
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
      const message = err instanceof Error ? err.message : String(err);
      const details =
        err instanceof Error && "errors" in err ? (err as { errors?: unknown }).errors : undefined;
      return json({
        error: message,
        ...(details && { details }),
      });
    }
  };
}
