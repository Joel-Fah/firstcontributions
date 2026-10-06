// Checks a pull request's contributor files and writes a Markdown report for the bot comment.
// Run by .github/workflows/check-contribution.yml. Expects GITHUB_TOKEN, GITHUB_REPOSITORY,
// PR_NUMBER, PR_AUTHOR, PR_ASSOCIATION, HEAD_REPO and HEAD_SHA.
// The pull request's files are downloaded through the GitHub API and only parsed, never checked out or run.
import { appendFile, writeFile } from 'node:fs/promises';
import config from '../site.config.mjs';
import { checkPullRequest, formatReport } from '../lib/check.mjs';
import { MAX_FILE_BYTES } from '../lib/contributors.mjs';

const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_OUTPUT, PR_NUMBER, PR_AUTHOR, PR_ASSOCIATION, HEAD_REPO, HEAD_SHA, AUTO_MERGE } =
  process.env;
const reportPath = process.env.REPORT_PATH ?? 'report.md';

function github(apiPath) {
  return fetch(`https://api.github.com/${apiPath}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
}

async function listChangedFiles() {
  const files = [];
  for (let page = 1; page <= 30; page++) {
    const res = await github(`repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/files?per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`Listing pull request files failed: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    files.push(...batch);
    if (batch.length < 100) break;
  }
  return files;
}

async function fetchFile(filename) {
  const encoded = filename.split('/').map(encodeURIComponent).join('/');
  const res = await github(`repos/${HEAD_REPO}/contents/${encoded}?ref=${HEAD_SHA}`);
  if (res.status === 404) return { error: 'The file could not be found.' };
  if (!res.ok) throw new Error(`Downloading ${filename} failed: ${res.status} ${await res.text()}`);
  const item = await res.json();
  if (Array.isArray(item) || item.type !== 'file') return { error: 'This must be a regular file.' };
  if (item.size > MAX_FILE_BYTES) return { error: `The file is too large (max ${MAX_FILE_BYTES} bytes).` };
  return { text: Buffer.from(item.content, 'base64').toString('utf8') };
}

const changed = await listChangedFiles();
const result = await checkPullRequest({ fetchFile, changed, author: PR_AUTHOR, association: PR_ASSOCIATION });
const report = formatReport(result, { author: PR_AUTHOR, siteUrl: config.siteUrl, autoMerge: AUTO_MERGE === 'true' });

await writeFile(reportPath, report);
console.log(report);
if (GITHUB_OUTPUT) {
  await appendFile(GITHUB_OUTPUT, `ok=${result.ok}\nautomerge=${result.autoMergeable}\n`);
}
