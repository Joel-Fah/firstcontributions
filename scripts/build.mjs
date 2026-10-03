// Builds the static website into dist/.
// Usage: node scripts/build.mjs [--offline]
// Set GITHUB_TOKEN to raise the GitHub API rate limit when loading contribution details.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../site.config.mjs';
import { CONTRIBUTORS_DIR, loadContributors } from '../lib/contributors.mjs';
import { enrichContributions } from '../lib/github.mjs';
import { renderIndex, renderNotFound, renderProfile } from '../lib/render.mjs';
import { DEFAULT_LOCALE, LOCALES } from '../lib/i18n.mjs';

const OUT = 'dist';
const offline = process.argv.includes('--offline');

// Date each contributor file was first committed, so the newest people show up first.
function joinDates() {
  const dates = {};
  try {
    const log = execFileSync('git', ['log', '--diff-filter=A', '--format=%x00%aI', '--name-only', '--', CONTRIBUTORS_DIR], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    // Newest commits come first, so later entries (older commits) win.
    for (const chunk of log.split('\0').slice(1)) {
      const [date, ...files] = chunk.trim().split('\n');
      for (const file of files) dates[path.basename(file, '.yml').toLowerCase()] = date;
    }
  } catch { }
  return dates;
}

const entries = await loadContributors();
for (const { file, errors } of entries) {
  if (errors.length) console.warn(`::warning file=${file}::Skipping invalid file: ${errors.join(' ')}`);
}

const joined = joinDates();
const contributors = entries
  .filter((e) => e.contributor)
  .map((e) => ({ ...e.contributor, joined: joined[e.contributor.github.toLowerCase()] }))
  .sort((a, b) => (b.joined ?? '').localeCompare(a.joined ?? '') || a.github.localeCompare(b.github));

await enrichContributions(contributors, { token: process.env.GITHUB_TOKEN, offline });

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await copyFile('site/style.css', path.join(OUT, 'style.css'));
for (const locale of LOCALES) {
  const localeDir = locale === DEFAULT_LOCALE ? OUT : path.join(OUT, locale);
  if (locale !== DEFAULT_LOCALE) {
    await mkdir(localeDir, { recursive: true });
    await copyFile('site/style.css', path.join(localeDir, 'style.css'));
  }
  await writeFile(path.join(localeDir, 'index.html'), renderIndex({ config, contributors, locale }));
}
await writeFile(path.join(OUT, '404.html'), renderNotFound({ config }));
await writeFile(path.join(OUT, 'contributors.json'), JSON.stringify(contributors, null, 2));
for (const contributor of contributors) {
  const dir = path.join(OUT, 'u', contributor.github);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), renderProfile({ config, contributor }));
}

console.log(`Built ${contributors.length} contributor pages into ${OUT}/.`);
