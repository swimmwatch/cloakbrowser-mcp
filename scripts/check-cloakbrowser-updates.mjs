#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { appendGithubOutput } from '#scripts/lib/github-output';
import { fetchJson as fetchJsonWithAuth } from '#scripts/lib/http';
import {
  createReleaseNotesSummary,
  getLatestNpmVersion,
  getReleaseNotes,
  readCurrentCloakBrowserVersion,
  upstreamConfig,
} from '#scripts/lib/cloakbrowser-upstream';
import { toVersionTag } from '#scripts/lib/semver';
import { renderTemplateFile } from '#scripts/lib/template';

const defaultIssueAssignee = 'swimmwatch';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const issueTemplatePath = join(scriptDir, 'templates', 'cloakbrowser-update-issue.md');
const issueBodyPath = join(tmpdir(), 'cloakbrowser-mcp-cloakbrowser-upstream-update.md');

const githubToken = process.env.GITHUB_TOKEN;
const issueAssignee = process.env.UPSTREAM_MONITOR_ASSIGNEE ?? defaultIssueAssignee;
const fetchJson = (url) => fetchJsonWithAuth(url, { githubToken });

const currentNpmVersion = await readCurrentCloakBrowserVersion();
const latestNpmVersion = await getLatestNpmVersion(fetchJson);
const updateAvailable = currentNpmVersion !== latestNpmVersion;
const latestVersionTag = toVersionTag(latestNpmVersion);
const issueTitle = `Update CloakBrowser to ${latestVersionTag}`;

let releaseCount = 0;

if (updateAvailable) {
  const releases = await getReleaseNotes(fetchJson, currentNpmVersion, latestNpmVersion);
  releaseCount = releases.length;

  await writeIssueBody({
    currentNpmVersion,
    latestNpmVersion,
    latestVersionTag,
    releaseNotesSummary: createReleaseNotesSummary(releases),
  });
}

const result = {
  updateAvailable,
  currentNpmVersion,
  latestNpmVersion,
  latestKnownVersion: latestNpmVersion,
  issueTitle,
  issueBodyPath,
  issueAssignee,
  releaseCount,
};

await appendGithubOutput({
  update_available: String(result.updateAvailable),
  current_npm_version: result.currentNpmVersion,
  latest_npm_version: result.latestNpmVersion,
  latest_known_version: result.latestKnownVersion,
  issue_title: result.issueTitle,
  issue_body_path: result.issueBodyPath,
  issue_assignee: result.issueAssignee,
  release_count: String(result.releaseCount),
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

async function writeIssueBody({
  currentNpmVersion,
  latestNpmVersion,
  latestVersionTag,
  releaseNotesSummary,
}) {
  const issueBody = await renderTemplateFile(issueTemplatePath, {
    currentNpmVersion,
    encodedNpmPackageName: encodeURIComponent(upstreamConfig.npmPackageName),
    latestNpmVersion,
    latestVersionTag,
    npmPackageName: upstreamConfig.npmPackageName,
    releaseNotesSummary,
    upstreamRepository: upstreamConfig.upstreamRepository,
  });

  await writeFile(issueBodyPath, issueBody);
}
