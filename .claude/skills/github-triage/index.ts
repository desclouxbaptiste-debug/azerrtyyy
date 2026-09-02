export type TriageState = "open" | "closed" | "all";

export interface TriageOptions {
  issues?: boolean;
  prs?: boolean;
  discussions?: boolean;
  state?: TriageState;
  limit?: number;
}

export interface TriageItem {
  number: number;
  title: string;
  url: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  comments: number;
  state: string;
}

export interface TriageResult {
  repo: string;
  issues: TriageItem[];
  prs: TriageItem[];
  discussions: TriageItem[];
  toMarkdown(): string;
}

const GITHUB_API = "https://api.github.com";

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-triage-skill",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubRequest(path: string): Promise<unknown> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API request failed (${res.status} ${res.statusText}): ${path}`);
  }
  return res.json();
}

function toTriageItem(item: any): TriageItem {
  return {
    number: item.number,
    title: item.title,
    url: item.html_url,
    author: item.user?.login ?? "unknown",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    labels: (item.labels ?? []).map((label: any) => (typeof label === "string" ? label : label.name)),
    comments: item.comments ?? 0,
    state: item.state,
  };
}

async function fetchIssues(repo: string, state: TriageState, limit: number): Promise<TriageItem[]> {
  const data = (await githubRequest(
    `/repos/${repo}/issues?state=${state}&per_page=${limit}&sort=updated&direction=desc`
  )) as any[];
  // The issues endpoint also returns pull requests; exclude them here so
  // `issues` and `prs` never overlap.
  return data.filter((item) => !item.pull_request).map(toTriageItem);
}

async function fetchPullRequests(repo: string, state: TriageState, limit: number): Promise<TriageItem[]> {
  const data = (await githubRequest(
    `/repos/${repo}/pulls?state=${state}&per_page=${limit}&sort=updated&direction=desc`
  )) as any[];
  return data.map(toTriageItem);
}

async function fetchDiscussions(repo: string, limit: number): Promise<TriageItem[]> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN (or GH_TOKEN) is required to fetch discussions via the GraphQL API.");
  }

  const [owner, name] = repo.split("/");
  const query = `
    query($owner: String!, $name: String!, $limit: Int!) {
      repository(owner: $owner, name: $name) {
        discussions(first: $limit, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            number
            title
            url
            createdAt
            updatedAt
            comments { totalCount }
            author { login }
            category { name }
            isAnswered
          }
        }
      }
    }
  `;

  const res = await fetch(`${GITHUB_API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-triage-skill",
    },
    body: JSON.stringify({ query, variables: { owner, name, limit } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL request failed (${res.status} ${res.statusText})`);
  }

  const json = (await res.json()) as any;
  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${json.errors.map((e: any) => e.message).join("; ")}`);
  }

  const nodes = json.data?.repository?.discussions?.nodes ?? [];
  return nodes.map((node: any) => ({
    number: node.number,
    title: node.title,
    url: node.url,
    author: node.author?.login ?? "unknown",
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    labels: node.category?.name ? [node.category.name] : [],
    comments: node.comments?.totalCount ?? 0,
    state: node.isAnswered ? "answered" : "unanswered",
  }));
}

function renderSection(title: string, items: TriageItem[]): string {
  if (items.length === 0) return `### ${title}\n\n_None found._\n`;
  const rows = items.map((item) => {
    const labels = item.labels.length ? ` (${item.labels.join(", ")})` : "";
    const comments = `${item.comments} comment${item.comments === 1 ? "" : "s"}`;
    return `- [#${item.number}](${item.url}) ${item.title} — @${item.author}, ${comments}${labels}`;
  });
  return `### ${title}\n\n${rows.join("\n")}\n`;
}

export async function triage(repo: string, options: TriageOptions = {}): Promise<TriageResult> {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    throw new Error(`repo must be in "owner/name" format, got "${repo}"`);
  }

  const { issues = false, prs = false, discussions = false, state = "open", limit = 25 } = options;

  const [issueItems, prItems, discussionItems] = await Promise.all([
    issues ? fetchIssues(repo, state, limit) : Promise.resolve([]),
    prs ? fetchPullRequests(repo, state, limit) : Promise.resolve([]),
    discussions ? fetchDiscussions(repo, limit) : Promise.resolve([]),
  ]);

  return {
    repo,
    issues: issueItems,
    prs: prItems,
    discussions: discussionItems,
    toMarkdown(): string {
      const parts = [`## Triage: ${repo}`];
      if (issues) parts.push(renderSection("Issues", issueItems));
      if (prs) parts.push(renderSection("Pull Requests", prItems));
      if (discussions) parts.push(renderSection("Discussions", discussionItems));
      return parts.join("\n");
    },
  };
}
