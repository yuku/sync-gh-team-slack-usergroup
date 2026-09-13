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

async function getGitHubUserEmails(
  octokit: ReturnType<typeof github.getOctokit>,
  org: string,
  login: string,
): Promise<string[]> {
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

  const candidates = [
    ...(result.user?.organizationVerifiedDomainEmails ?? []),
    result.user?.email,
  ].filter((email): email is string => Boolean(email));

  return [...new Set(candidates)];
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
    const emails = await getGitHubUserEmails(octokit, githubOrg, member.login);

    if (emails.length === 0) {
      core.warning(`Skipping ${member.login}: no verified organization or public email found.`);
      continue;
    }

    let slackUserId: string | null = null;

    for (const email of emails) {
      try {
        const lookupResponse = await slackClient.users.lookupByEmail({ email });
        slackUserId = lookupResponse.user?.id ?? null;

        if (slackUserId) {
          break;
        }
      } catch (error) {
        if (!isSlackUserNotFoundError(error)) {
          throw error;
        }
      }
    }

    if (!slackUserId) {
      core.warning(`Skipping ${member.login}: no Slack user found.`);
      continue;
    }

    slackUserIds.add(slackUserId);
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
