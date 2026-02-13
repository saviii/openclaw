import type { AnyAgentTool, OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { JiraConfig } from "./src/types.js";
import { JiraClient } from "./src/api.js";
import { JiraToolSchema, createJiraExecutor } from "./src/tool.js";

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

const ALLOWED_KEYS = ["baseUrl", "email", "apiToken", "projectKey", "defaultIssueType"];

export const jiraConfigSchema = {
  parse(value: unknown): JiraConfig {
    const cfg = (
      value && typeof value === "object" && !Array.isArray(value) ? value : {}
    ) as Record<string, unknown>;

    const unknown = Object.keys(cfg).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length > 0) {
      throw new Error(`Jira config has unknown keys: ${unknown.join(", ")}`);
    }

    const baseUrl = resolveString(cfg.baseUrl, "JIRA_BASE_URL");
    const email = resolveString(cfg.email, "JIRA_EMAIL");
    const apiToken = resolveString(cfg.apiToken, "JIRA_API_TOKEN");

    if (!baseUrl) {
      throw new Error("Jira baseUrl is required (set in plugin config or JIRA_BASE_URL env var)");
    }
    if (!email) {
      throw new Error("Jira email is required (set in plugin config or JIRA_EMAIL env var)");
    }
    if (!apiToken) {
      throw new Error("Jira apiToken is required (set in plugin config or JIRA_API_TOKEN env var)");
    }

    return {
      baseUrl,
      email,
      apiToken,
      projectKey: resolveString(cfg.projectKey, "JIRA_PROJECT_KEY"),
      defaultIssueType: resolveString(cfg.defaultIssueType, "JIRA_DEFAULT_ISSUE_TYPE"),
    };
  },

  uiHints: {
    baseUrl: {
      label: "Jira Base URL",
      placeholder: "https://your-domain.atlassian.net",
      help: "Your Jira Cloud instance URL",
    },
    email: {
      label: "Email",
      placeholder: "your-email@company.com",
      help: "Email associated with your Jira account",
    },
    apiToken: {
      label: "API Token",
      sensitive: true,
      placeholder: "ATATT...",
      help: "Generate at https://id.atlassian.com/manage/api-tokens",
    },
    projectKey: {
      label: "Default Project Key",
      placeholder: "PROJ",
      help: "Default Jira project key for new issues",
    },
    defaultIssueType: {
      label: "Default Issue Type",
      placeholder: "Bug",
      help: "Default issue type when creating issues",
    },
  },
};

const plugin = {
  id: "jira",
  name: "Jira",
  description: "Jira Cloud integration for issue management",
  configSchema: jiraConfigSchema,

  register(api: OpenClawPluginApi) {
    const cfg = jiraConfigSchema.parse(api.pluginConfig);
    const client = new JiraClient(cfg);
    const execute = createJiraExecutor(client, {
      projectKey: cfg.projectKey,
      defaultIssueType: cfg.defaultIssueType,
    });

    const projectHint = cfg.projectKey ? ` Default project: ${cfg.projectKey}.` : "";
    const issueTypeHint = cfg.defaultIssueType
      ? ` Default issue type: ${cfg.defaultIssueType}.`
      : "";

    api.registerTool({
      name: "jira",
      label: "Jira",
      description:
        "Manage Jira issues. Actions: create (new issue), search (JQL query), update (modify fields), transition (change status). " +
        "Use create to file bugs/tasks, search to find existing issues, update to modify fields, transition to change workflow status." +
        projectHint +
        issueTypeHint +
        " Do NOT guess the projectKey — omit it to use the default.",
      parameters: JiraToolSchema,
      execute,
    } as AnyAgentTool);
  },
};

export default plugin;
