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

## Development

```bash
npm install
npm run build
```
