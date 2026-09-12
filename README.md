# sync-gh-team-slack-usergroup

GitHub Action that synchronizes members of a GitHub team to a Slack user group.

## Inputs

| Name | Required | Description |
| --- | --- | --- |
| `github_token` | Yes | GitHub token with org read permissions. |
| `slack_token` | Yes | Slack Bot User OAuth Token. |
| `github_org` | Yes | GitHub Organization name. |
| `github_team_slug` | Yes | The slug of the GitHub team. |
| `slack_user_group_id` | Yes | The ID of the Slack User Group. |

## Prerequisites

### 1. GitHub Token Setup
The default `GITHUB_TOKEN` provided by GitHub Actions does **not** have sufficient permissions to read Organization teams or verified domain emails. You need to provide a token with `read:org` permissions using one of the following methods:

- **GitHub App (Recommended for Organizations):**
  Create a GitHub App with Organization permissions:
  - `Members`: **Read-only**
  
  Use `actions/create-github-app-token` in your workflow to generate a temporary token.

- **Personal Access Token (PAT):**
  Create a PAT (Classic) with the `read:org` scope, or a Fine-grained PAT with Organization `Members: Read-only` permission.

### 2. Slack Token Setup
Create a Slack App in your workspace and configure the following:

- **Bot Token Scopes:**
  - `usergroups:write` (To update user group members)
  - `usergroups:read` (To check user group status)
  - `users:read.email` (To look up users by verified email)
  - `users:read` (To read user profiles)

- **User Group ID:**
  Copy the ID from your Slack user group settings (starts with `S`, e.g., `S01234567`). *Note: Slack User Groups require a paid Slack plan.*

## Usage

```yaml
name: Sync GitHub Team to Slack User Group

on:
  workflow_dispatch:
  schedule:
    - cron: '0 * * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: yuku/sync-gh-team-slack-usergroup@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          slack_token: ${{ secrets.SLACK_BOT_TOKEN }}
          github_org: your-org
          github_team_slug: platform-team
          slack_user_group_id: S01234567
```

### Sync multiple teams with a matrix

```yaml
name: Sync GitHub Teams to Slack User Groups

on:
  workflow_dispatch:
  schedule:
    - cron: '0 * * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - github_team_slug: platform-team
            slack_user_group_id: S01234567
          - github_team_slug: security-team
            slack_user_group_id: S07654321
    steps:
      - uses: actions/checkout@v4
      - uses: yuku/sync-gh-team-slack-usergroup@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          slack_token: ${{ secrets.SLACK_BOT_TOKEN }}
          github_org: your-org
          github_team_slug: ${{ matrix.github_team_slug }}
          slack_user_group_id: ${{ matrix.slack_user_group_id }}
```

## Development

```bash
npm install
npm run build
```
