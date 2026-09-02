---
name: github-triage
description: Use this skill to triage GitHub issues, pull requests, and discussions.
metadata:
  module: ./index.ts
---

Use this skill when a user asks for repository triage.

Import the module using the interpreter and call `triage(repo, options)`.

Usage:

```ts
const { triage } = await import("@/skills/github-triage");

const result = await triage("langchain-ai/deepagents", {
  issues: true,
  prs: true,
});

result.toMarkdown();
```

## Options

- `issues` (boolean): include open issues (pull requests are excluded).
- `prs` (boolean): include open pull requests.
- `discussions` (boolean): include discussions. Requires a `GITHUB_TOKEN` (or
  `GH_TOKEN`) environment variable, since discussions are only available
  through the GitHub GraphQL API.
- `state` (`"open" | "closed" | "all"`, default `"open"`): item state to fetch
  for issues and pull requests.
- `limit` (number, default `25`): max items to fetch per category.

A `GITHUB_TOKEN`/`GH_TOKEN` environment variable is recommended for all
requests to avoid GitHub's low unauthenticated rate limit, and required for
`discussions`.

## Output

`triage()` resolves to `{ repo, issues, prs, discussions, toMarkdown() }`.
Each of `issues`, `prs`, and `discussions` is an array of items with
`number`, `title`, `url`, `author`, `createdAt`, `updatedAt`, `labels`,
`comments`, and `state`. Call `result.toMarkdown()` for a ready-to-post
Markdown summary grouped by category.
