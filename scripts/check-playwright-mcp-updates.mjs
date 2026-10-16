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
const fileURLToPathResult = fileURLToPath(import.meta.url);
const scriptDir = dirname(fileURLToPathResult);
const issueTemplatePath = join(scriptDir, 'templates', 'playwright-mcp-update-issue.md');
const tmpdirResult = tmpdir();
const issueBodyPath = join(tmpdirResult, 'cloakbrowser-mcp-playwright-mcp-upstream-update.md');
const githubToken = process.env.GITHUB_TOKEN;
const issueAssignee = process.env.UPSTREAM_MONITOR_ASSIGNEE ?? defaultIssueAssignee;
const fetchJson = (url) => {
  const fetchJsonWithAuthOptions = { githubToken };
  return fetchJsonWithAuth(url, fetchJsonWithAuthOptions);
};
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
  const writeIssueBodyOptions = {
    current,
    latest,
    latestVersionTag,
    releaseNotesSummary: createReleaseNotesSummary(releases),
  };
  await writeIssueBody(writeIssueBodyOptions);
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
const appendGithubOutputOptions = {
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
};
await appendGithubOutput(appendGithubOutputOptions);
const message = `${JSON.stringify(result, null, 2)}\n`;
process.stdout.write(message);
async function writeIssueBody({ current, latest, latestVersionTag, releaseNotesSummary }) {
  const renderTemplateFileOptions = {
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
  };
  const issueBody = await renderTemplateFile(issueTemplatePath, renderTemplateFileOptions);
  await writeFile(issueBodyPath, issueBody);
}
