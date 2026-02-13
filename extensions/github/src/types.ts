export type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
};

export type GitHubUser = {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
};

export type GitHubLabel = {
  name: string;
  color: string;
};

export type GitHubPullRequest = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft: boolean;
  body: string | null;
  head: { ref: string; sha: string };
  base: { ref: string };
  labels: GitHubLabel[];
  requested_reviewers: GitHubUser[];
  mergeable_state?: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
};

export type GitHubIssue = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  body: string | null;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  comments: number;
  pull_request?: { url: string };
};

export type GitHubBranch = {
  name: string;
  commit: { sha: string };
  protected: boolean;
};

export type GitHubSearchResult<T> = {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
};
