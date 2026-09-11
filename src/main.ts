import * as core from '@actions/core';
import * as github from '@actions/github';
import { WebClient } from '@slack/web-api';
import type { WebAPICallError } from '@slack/web-api';

type GitHubUserEmailQuery = {
  user: {
    email: string | null;
    organizationVerifiedDomainEmails: string[] | null;
  } | null;
};

function getRequiredInput(name: string): string {
  return core.getInput(name, { required: true }).trim();
}

async function getGitHubUserEmail(
  octokit: ReturnType<typeof github.getOctokit>,
  org: string,
  login: string,
): Promise<string | null> {
  const result = await octokit.graphql<GitHubUserEmailQuery>(
    `
      query GetGitHubUserEmail($login: String!, $org: String!) {
        user(login: $login) {
          email
          organizationVerifiedDomainEmails(login: $org)
        }
      }
    `,
    {
      login,
      org,
    },
  );

  const verifiedEmail = result.user?.organizationVerifiedDomainEmails?.find(Boolean);

  return verifiedEmail ?? result.user?.email ?? null;
}

function isSlackUserNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const slackError = error as WebAPICallError & { data?: { error?: unknown } };

  return slackError.data?.error === 'users_not_found';
}

async function run(): Promise<void> {
  const githubToken = getRequiredInput('github_token');
  const slackToken = getRequiredInput('slack_token');
  const githubOrg = getRequiredInput('github_org');
  const githubTeamSlug = getRequiredInput('github_team_slug');
  const slackUserGroupId = getRequiredInput('slack_user_group_id');

  const octokit = github.getOctokit(githubToken);
  const slackClient = new WebClient(slackToken);

  const members = await octokit.paginate(octokit.rest.teams.listMembersInOrg, {
    org: githubOrg,
    team_slug: githubTeamSlug,
    per_page: 100,
  });

  core.info(
    `Fetched ${members.length} GitHub team member(s) from ${githubOrg}/${githubTeamSlug}.`,
  );

  const slackUserIds = new Set<string>();

  for (const member of members) {
    const email = await getGitHubUserEmail(octokit, githubOrg, member.login);

    if (!email) {
      core.warning(`Skipping ${member.login}: no verified organization or public email found.`);
      continue;
    }

    try {
      const lookupResponse = await slackClient.users.lookupByEmail({ email });
      const slackUserId = lookupResponse.user?.id;

      if (!slackUserId) {
        core.warning(`Skipping ${member.login}: Slack lookup for ${email} returned no user ID.`);
        continue;
      }

      slackUserIds.add(slackUserId);
    } catch (error) {
      if (isSlackUserNotFoundError(error)) {
        core.warning(`Skipping ${member.login}: no Slack user found for ${email}.`);
        continue;
      }

      throw error;
    }
  }

  const users = [...slackUserIds].join(',');

  await slackClient.usergroups.users.update({
    usergroup: slackUserGroupId,
    users,
  });

  core.info(
    `Updated Slack user group ${slackUserGroupId} with ${slackUserIds.size} member(s).`,
  );
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  core.setFailed(message);
});
