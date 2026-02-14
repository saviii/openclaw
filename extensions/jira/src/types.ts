/** Basic Auth config (API token + email) */
export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
  defaultIssueType?: string;
};

/** OAuth 2.0 (3LO) config */
export type JiraOAuthConfig = {
  cloudId: string;
  accessToken: string;
  siteUrl: string;
  projectKey?: string;
  defaultIssueType?: string;
};

export type JiraAnyConfig = JiraConfig | JiraOAuthConfig;

export function isOAuthConfig(config: JiraAnyConfig): config is JiraOAuthConfig {
  return "cloudId" in config && "accessToken" in config;
}

export type JiraIssueFields = {
  summary: string;
  description?: unknown;
  status: { name: string };
  priority?: { name: string };
  issuetype: { name: string };
  assignee?: { accountId: string; displayName: string };
  reporter?: { accountId: string; displayName: string };
  created: string;
  updated: string;
  labels?: string[];
  project: { key: string; name: string };
};

export type JiraIssue = {
  key: string;
  id: string;
  self: string;
  fields: JiraIssueFields;
};

export type JiraSearchResult = {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
};

export type JiraTransition = {
  id: string;
  name: string;
  to: { name: string; id: string };
};

export type CreateIssueFields = {
  project: { key: string };
  summary: string;
  description?: unknown;
  issuetype: { name: string };
  priority?: { name: string };
  labels?: string[];
  assignee?: { accountId: string };
};

export type CreateIssueRequest = {
  fields: CreateIssueFields;
};

export type CreateIssueResponse = {
  id: string;
  key: string;
  self: string;
};
