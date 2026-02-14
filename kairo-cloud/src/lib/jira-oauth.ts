const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";

const SCOPES = ["read:jira-work", "write:jira-work", "read:jira-user", "offline_access"].join(" ");

export function getJiraOAuthUrl(state: string): string {
  const clientId = process.env.JIRA_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("JIRA_OAUTH_CLIENT_ID not set");
  }

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jira/callback`,
    state,
    response_type: "code",
    prompt: "consent",
  });

  return `${JIRA_AUTH_URL}?${params}`;
}

export type JiraTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeJiraCode(code: string): Promise<JiraTokenResponse> {
  const res = await fetch(JIRA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_OAUTH_CLIENT_ID!,
      client_secret: process.env.JIRA_OAUTH_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jira/callback`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira token exchange failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<JiraTokenResponse>;
}

export type JiraCloudResource = {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
};

export async function getAccessibleResources(accessToken: string): Promise<JiraCloudResource[]> {
  const res = await fetch(JIRA_RESOURCES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch accessible resources: ${res.status}`);
  }

  return res.json() as Promise<JiraCloudResource[]>;
}

export async function refreshJiraToken(refreshToken: string): Promise<JiraTokenResponse> {
  const res = await fetch(JIRA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.JIRA_OAUTH_CLIENT_ID!,
      client_secret: process.env.JIRA_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira token refresh failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<JiraTokenResponse>;
}

export async function fetchJiraProjects(
  accessToken: string,
  cloudId: string,
): Promise<Array<{ key: string; name: string }>> {
  const res = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.status}`);
  }

  const data = await res.json();
  return (data.values || []).map((p: { key: string; name: string }) => ({
    key: p.key,
    name: p.name,
  }));
}
