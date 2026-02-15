const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

const SCOPES = ["repo", "read:user"].join(" ");

export function getGitHubOAuthUrl(state: string): string {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("GITHUB_OAUTH_CLIENT_ID not set");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    state,
  });

  return `${GITHUB_AUTH_URL}?${params}`;
}

export type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
};

export async function exchangeGitHubCode(code: string): Promise<GitHubTokenResponse> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_OAUTH_CLIENT_ID!,
      client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub token exchange failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as GitHubTokenResponse;

  if (data.error) {
    throw new Error(`GitHub token exchange error: ${data.error} — ${data.error_description}`);
  }

  return data;
}

export type GitHubRepo = {
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  description: string | null;
};

export async function fetchUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&type=all",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch repos: ${res.status}`);
  }

  const data = await res.json();
  return (data as GitHubRepo[]).map((r) => ({
    full_name: r.full_name,
    name: r.name,
    owner: { login: r.owner.login },
    private: r.private,
    description: r.description,
  }));
}
