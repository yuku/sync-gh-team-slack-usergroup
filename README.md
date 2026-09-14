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

  Set the App's **App ID** in your repository variables (`vars.GH_APP_ID`) and **Private Key** in your repository secrets (`secrets.GH_APP_PRIVATE_KEY`).

- **Personal Access Token (PAT):**
  Create a PAT (Classic) with the `read:org` scope, or a Fine-grained PAT with Organization `Members: Read-only` permission.

### 2. Slack Token Setup
Create a Slack App in your workspace and configure the following:

- **Bot Token Scopes:**
  - `usergroups:write`
  - `usergroups:read`
  - `users:read.email`
  - `users:read`

- **User Group ID:**
  Copy the ID from your Slack user group settings (starts with `S`, e.g., `S01234567`).

## Usage

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
      - name: Generate GitHub App Token
        id: generate-token
        uses: actions/create-github-app-token@v3
        with:
          app-id: ${{ vars.GH_APP_ID }}
          private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
          permission-members: read

      - uses: yuku/sync-gh-team-slack-usergroup@v1
        with:
          github_token: ${{ steps.generate-token.outputs.token }}
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
