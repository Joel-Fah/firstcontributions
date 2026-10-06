import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import config from '../site.config.mjs';
import {
  contributorTemplate,
  loadContributors,
  newFileUrl,
  parseContributionUrl,
  readContributorFile,
  validateContributor,
} from '../lib/contributors.mjs';

const valid = {
  github: 'octocat',
  name: 'Mona Lisa',
  bio: 'I like open source.',
  contributions: ['https://github.com/osscameroon/js-generator/pull/12', 'https://github.com/nodejs/node/issues/3'],
};

test('parseContributionUrl accepts pull requests and issues', () => {
  assert.deepEqual(parseContributionUrl('https://github.com/osscameroon/js-generator/pull/12/files'), {
    owner: 'osscameroon',
    repo: 'js-generator',
    type: 'pull',
    number: 12,
    url: 'https://github.com/osscameroon/js-generator/pull/12',
  });
  assert.equal(parseContributionUrl('https://github.com/a/b/issues/7#issuecomment-1').type, 'issue');
  assert.equal(parseContributionUrl('https://github.com/a/b'), null);
  assert.equal(parseContributionUrl('https://gitlab.com/a/b/pull/1'), null);
  assert.equal(parseContributionUrl('javascript:alert(1)//https://github.com/a/b/pull/1'), null);
  assert.equal(parseContributionUrl(42), null);
});

test('a complete file is valid', () => {
  assert.deepEqual(validateContributor(valid, 'octocat'), []);
  assert.deepEqual(validateContributor({ ...valid, contributions: null }, 'OctoCat'), []);
});

test('the untouched template is rejected with helpful messages', () => {
  const errors = validateContributor(parse(contributorTemplate()), 'YOUR-GITHUB-USERNAME');
  assert.equal(errors.length, 2);
  assert.match(errors.join('\n'), /`github` must be your GitHub username/);
  assert.match(errors.join('\n'), /`name` still has the example value/);
});

test('a filled-in template with optional lines deleted is valid', () => {
  const text = contributorTemplate('octocat')
    .replace('Your Name', 'Mona')
    .split('\n')
    .filter((line) => !/^(bio|location|website):/.test(line))
    .join('\n');
  assert.deepEqual(validateContributor(parse(text), 'octocat'), []);
});

test('optional fields can be left as examples, empty or "None"', async () => {
  const text = contributorTemplate('octocat').replace('Your Name', 'Mona');
  assert.deepEqual(validateContributor(parse(text), 'octocat'), []);
  for (const website of ['None', 'n/a', '-', '', null]) {
    assert.deepEqual(validateContributor({ ...valid, website, bio: 'none', location: '' }, 'octocat'), [], String(website));
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'contrib-'));
  await writeFile(path.join(dir, 'octocat.yml'), text.replace('https://example.com', 'None'));
  const { contributor } = await readContributorFile(path.join(dir, 'octocat.yml'));
  assert.equal(contributor.website, undefined);
  assert.equal(contributor.bio, undefined);
  assert.equal(contributor.location, undefined);
});

test('validation catches common mistakes', () => {
  const errorsFor = (data, login = 'octocat') => validateContributor(data, login).join('\n');
  assert.match(errorsFor({ ...valid, github: 'someoneelse' }), /must match/);
  assert.match(errorsFor({ ...valid, name: undefined }), /`name` is missing/);
  assert.match(errorsFor({ ...valid, name: 'None' }), /`name` is missing/);
  assert.match(errorsFor({ ...valid, nmae: 'x' }), /Unknown field `nmae`/);
  assert.match(errorsFor({ ...valid, website: 'example.org' }), /starting with https/);
  assert.match(errorsFor({ ...valid, website: 'javascript:alert(1)' }), /starting with https/);
  assert.match(errorsFor({ ...valid, contributions: 'https://github.com/a/b/pull/1' }), /must be a list/);
  assert.match(errorsFor({ ...valid, contributions: ['https://github.com/a/b'] }), /not a link to a GitHub issue/);
  assert.match(
    errorsFor({ ...valid, contributions: ['https://github.com/a/b/pull/1', 'https://github.com/a/b/pull/1/files'] }),
    /listed twice/,
  );
  assert.match(errorsFor('just text'), /must contain lines/);
});

test('readContributorFile reports YAML errors, bad names and symlinks', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'contrib-'));
  await writeFile(path.join(dir, 'octocat.yml'), 'github: octocat\nname: Mona\ncontributions:\n- [oops\n');
  assert.match((await readContributorFile(path.join(dir, 'octocat.yml'))).errors[0], /not valid YAML \(around line \d\)/);

  await writeFile(path.join(dir, 'octocat.yaml'), 'github: octocat\nname: Mona\n');
  assert.match((await readContributorFile(path.join(dir, 'octocat.yaml'))).errors[0], /ending in `.yml`/);

  await symlink('/etc/hostname', path.join(dir, 'evil.yml'));
  assert.deepEqual((await readContributorFile(path.join(dir, 'evil.yml'))).errors, ['This must be a regular file.']);
});

test('every file in contributors/ is valid', async () => {
  for (const { file, errors } of await loadContributors()) assert.deepEqual(errors, [], file);
});

test('the README links to the current file template', async () => {
  const readme = await readFile('README.md', 'utf8');
  assert.ok(readme.includes(newFileUrl(config)), 'Update the "Add yourself" link in README.md with newFileUrl()');
});

test('loadContributors normalizes valid files', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'contrib-'));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'octocat.yml'), `github: octocat\nname: " Mona "\ncontributions:\n  - ${valid.contributions[0]}\n`);
  const [entry] = await loadContributors(dir);
  assert.equal(entry.contributor.name, 'Mona');
  assert.equal(entry.contributor.contributions[0].number, 12);
});
