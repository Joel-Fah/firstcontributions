import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPullRequest, formatReport, COMMENT_MARKER } from '../lib/check.mjs';

// Stands in for downloading files from the pull request through the GitHub API.
function files(contents) {
  return async (filename) => (filename in contents ? { text: contents[filename] } : { error: 'The file could not be found.' });
}

const added = (filename) => ({ status: 'added', filename });

test('a valid file from its owner can be merged automatically', async () => {
  const fetchFile = files({ 'contributors/octocat.yml': 'github: octocat\nname: Mona\n' });
  const result = await checkPullRequest({ fetchFile, changed: [added('contributors/octocat.yml')], author: 'OctoCat', association: 'NONE' });
  assert.equal(result.ok, true);
  assert.equal(result.autoMergeable, true);
  const report = formatReport(result, { author: 'OctoCat', siteUrl: 'https://example.org/', autoMerge: true });
  assert.ok(report.startsWith(COMMENT_MARKER));
  assert.match(report, /merged automatically/);
});

test("contributors can't edit someone else's file", async () => {
  const fetchFile = files({ 'contributors/someone.yml': 'github: someone\nname: Someone\n' });
  const result = await checkPullRequest({ fetchFile, changed: [added('contributors/someone.yml')], author: 'octocat', association: 'NONE' });
  assert.equal(result.ok, false);
  assert.match(result.problems.get('contributors/someone.yml')[0], /only add or edit your own file/);
});

test('maintainers can edit any file, but their PRs are not auto-merged when touching code', async () => {
  const fetchFile = files({ 'contributors/someone.yml': 'github: someone\nname: Someone\n' });
  const changed = [{ status: 'modified', filename: 'contributors/someone.yml' }, { status: 'modified', filename: 'lib/render.mjs' }];
  const result = await checkPullRequest({ fetchFile, changed, author: 'admin', association: 'MEMBER' });
  assert.equal(result.ok, true);
  assert.equal(result.autoMergeable, false);
  assert.equal(result.notes.length, 1);
});

test('a file created outside contributors/ gets a hint', async () => {
  const fetchFile = files({ 'octocat.yml': 'github: octocat\nname: Mona\n' });
  const result = await checkPullRequest({ fetchFile, changed: [added('octocat.yml')], author: 'octocat', association: 'NONE' });
  assert.equal(result.ok, false);
  assert.match(result.problems.get('octocat.yml')[0], /inside the `contributors` folder/);
});

test('validation errors are listed in the report', async () => {
  const fetchFile = files({ 'contributors/octocat.yml': 'github: octocat\n' });
  const result = await checkPullRequest({ fetchFile, changed: [added('contributors/octocat.yml')], author: 'octocat', association: 'NONE' });
  const report = formatReport(result, { author: 'octocat', siteUrl: 'https://example.org/', autoMerge: false });
  assert.match(report, /`name` is missing/);
  assert.match(report, /Edit file/);
});

test('removing your own file is allowed', async () => {
  const fetchFile = files({});
  const changed = [{ status: 'removed', filename: 'contributors/octocat.yml' }];
  const result = await checkPullRequest({ fetchFile, changed, author: 'octocat', association: 'NONE' });
  assert.equal(result.ok, true);
});

test('download problems and wrong extensions are reported', async () => {
  const fetchFile = async () => ({ error: 'This must be a regular file.' });
  const changed = [added('contributors/octocat.yml'), added('contributors/octocat.yaml')];
  const result = await checkPullRequest({ fetchFile, changed, author: 'octocat', association: 'NONE' });
  assert.deepEqual(result.problems.get('contributors/octocat.yml'), ['This must be a regular file.']);
  assert.match(result.problems.get('contributors/octocat.yaml')[0], /ending in `.yml`/);
});
