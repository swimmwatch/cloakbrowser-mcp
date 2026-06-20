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
  getLatestDockerVersion,
  getLatestNpmVersion,
  getReleaseNotes,
  readCurrentPlaywrightMcpVersions,
  upstreamConfig,
} from '#scripts/lib/playwright-mcp-upstream';
import { latestVersion, toVersionTag } from '#scripts/lib/semver';
import { renderTemplateFile } from '#scripts/lib/template';

const defaultIssueAssignee = 'swimmwatch';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const issueTemplatePath = join(scriptDir, 'templates', 'playwright-mcp-update-issue.md');
const issueBodyPath = join(tmpdir(), 'cloakbrowser-mcp-playwright-mcp-upstream-update.md');

const githubToken = process.env.GITHUB_TOKEN;
const issueAssignee = process.env.UPSTREAM_MONITOR_ASSIGNEE ?? defaultIssueAssignee;
const fetchJson = (url) => fetchJsonWithAuth(url, { githubToken });

const current = await readCurrentPlaywrightMcpVersions();
const latest = {
  npmVersion: await getLatestNpmVersion(fetchJson),
  dockerVersion: await getLatestDockerVersion(fetchJson),
};
const updateAvailable =
  current.npmVersion !== latest.npmVersion || current.dockerVersion !== latest.dockerVersion;
const latestKnownVersion = latestVersion(latest.npmVersion, latest.dockerVersion);
const latestVersionTag = toVersionTag(latestKnownVersion);
const issueTitle = `Update Playwright MCP upstream to ${latestVersionTag}`;

let releaseCount = 0;

if (updateAvailable) {
  const releases = await getReleaseNotes(fetchJson, current.npmVersion, latestKnownVersion);
  releaseCount = releases.length;

  await writeIssueBody({
    current,
    latest,
    latestVersionTag,
    releaseNotesSummary: createReleaseNotesSummary(releases),
  });
}

const result = {
  updateAvailable,
  currentNpmVersion: current.npmVersion,
  latestNpmVersion: latest.npmVersion,
  currentDockerVersion: current.dockerVersion,
  latestDockerVersion: latest.dockerVersion,
  latestKnownVersion,
  issueTitle,
  issueBodyPath,
  issueAssignee,
  releaseCount,
};

await appendGithubOutput({
  update_available: String(result.updateAvailable),
  current_npm_version: result.currentNpmVersion,
  latest_npm_version: result.latestNpmVersion,
  current_docker_version: result.currentDockerVersion,
  latest_docker_version: result.latestDockerVersion,
  latest_known_version: result.latestKnownVersion,
  issue_title: result.issueTitle,
  issue_body_path: result.issueBodyPath,
  issue_assignee: result.issueAssignee,
  release_count: String(result.releaseCount),
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

async function writeIssueBody({ current, latest, latestVersionTag, releaseNotesSummary }) {
  const issueBody = await renderTemplateFile(issueTemplatePath, {
    currentDockerVersion: current.dockerVersion,
    currentNpmVersion: current.npmVersion,
    dockerRepository: upstreamConfig.dockerRepository,
    dockerUpdateNeeded: current.dockerVersion !== latest.dockerVersion ? 'yes' : 'no',
    encodedNpmPackageName: encodeURIComponent(upstreamConfig.npmPackageName),
    latestDockerVersion: latest.dockerVersion,
    latestNpmVersion: latest.npmVersion,
    latestVersionTag,
    npmPackageName: upstreamConfig.npmPackageName,
    npmUpdateNeeded: current.npmVersion !== latest.npmVersion ? 'yes' : 'no',
    releaseNotesSummary,
    upstreamRepository: upstreamConfig.upstreamRepository,
  });

  await writeFile(issueBodyPath, issueBody);
}
