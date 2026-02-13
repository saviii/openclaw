import type { AnyAgentTool, OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { GitHubConfig } from "./src/types.js";
import { GitHubClient } from "./src/api.js";
import { GitHubToolSchema, createGitHubExecutor } from "./src/tool.js";

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

function resolveString(pluginValue: unknown, envKey: string): string | undefined {
  if (typeof pluginValue === "string" && pluginValue.length > 0) {
    return resolveEnvVars(pluginValue);
  }
  return process.env[envKey]?.trim() || undefined;
}

const ALLOWED_KEYS = ["token", "owner", "repo"];

export const githubConfigSchema = {
  parse(value: unknown): GitHubConfig {
    const cfg = (
      value && typeof value === "object" && !Array.isArray(value) ? value : {}
    ) as Record<string, unknown>;

    const unknown = Object.keys(cfg).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length > 0) {
      throw new Error(`GitHub config has unknown keys: ${unknown.join(", ")}`);
    }

    const token = resolveString(cfg.token, "GITHUB_TOKEN");
    const owner = resolveString(cfg.owner, "GITHUB_OWNER");
    const repo = resolveString(cfg.repo, "GITHUB_REPO");

    if (!token) {
      throw new Error("GitHub token is required (set in plugin config or GITHUB_TOKEN env var)");
    }
    if (!owner) {
      throw new Error("GitHub owner is required (set in plugin config or GITHUB_OWNER env var)");
    }
    if (!repo) {
      throw new Error("GitHub repo is required (set in plugin config or GITHUB_REPO env var)");
    }

    return { token, owner, repo };
  },

  uiHints: {
    token: {
      label: "Personal Access Token",
      sensitive: true,
      placeholder: "ghp_...",
      help: "Generate at https://github.com/settings/tokens",
    },
    owner: {
      label: "Repository Owner",
      placeholder: "your-org",
      help: "GitHub organization or user name",
    },
    repo: {
      label: "Repository Name",
      placeholder: "your-repo",
      help: "Default repository for GitHub operations",
    },
  },
};

const plugin = {
  id: "github",
  name: "GitHub",
  description: "GitHub integration for PR and issue tracking",
  configSchema: githubConfigSchema,

  register(api: OpenClawPluginApi) {
    const cfg = githubConfigSchema.parse(api.pluginConfig);
    const client = new GitHubClient(cfg);
    const execute = createGitHubExecutor(client, {
      owner: cfg.owner,
      repo: cfg.repo,
    });

    api.registerTool({
      name: "github",
      label: "GitHub",
      description:
        "Access GitHub repository data. Actions: list_prs (open PRs), get_pr (PR details), " +
        "list_issues (open issues), get_issue (issue details), search (find code/issues/PRs), " +
        "list_branches (active branches). Use to check PR status, find issues, understand code context.",
      parameters: GitHubToolSchema,
      execute,
    } as AnyAgentTool);
  },
};

export default plugin;
