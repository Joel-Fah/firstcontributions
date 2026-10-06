import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

export const CONTRIBUTORS_DIR = 'contributors';
export const USERNAME_PLACEHOLDER = 'YOUR-GITHUB-USERNAME';

export const MAX_FILE_BYTES = 10_000;
const MAX_CONTRIBUTIONS = 200;
const LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const CONTRIBUTION_RE =
  /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(pull|issues)\/(\d+)(?:[/?#].*)?$/;

const FIELDS = {
  github: 'your GitHub username',
  name: 'your name',
  bio: 'a short sentence about you',
  location: 'where you are',
  website: 'a link to your website or social profile',
  contributions: 'links to issues or pull requests you worked on',
};

// Example values from the template. Optional fields that still have them are treated as empty.
const PLACEHOLDERS = new Set([
  USERNAME_PLACEHOLDER.toLowerCase(),
  'your name',
  'a short sentence about you.',
  'your city, country',
  'https://example.com',
]);

// Ways people say "I don't have one" for an optional field.
const EMPTY_VALUES = new Set(['', '-', 'none', 'n/a', 'na', 'nil', 'null', 'no', 'nothing']);

// The file people start from when they click "Add yourself".
export function contributorTemplate(login = USERNAME_PLACEHOLDER) {
  return `github: ${login}
name: Your Name
# The lines below are optional. Replace the example values or delete the lines.
bio: A short sentence about you.
location: Your city, Country
website: https://example.com
contributions:
  # Later, list issues or pull requests you worked on, one per line, like this:
  # - https://github.com/osscameroon/js-generator/pull/1
`;
}

export function newFileUrl({ repo, branch }) {
  const params = new URLSearchParams({
    filename: `${USERNAME_PLACEHOLDER}.yml`,
    value: contributorTemplate(),
  });
  return `https://github.com/${repo}/new/${branch}/${CONTRIBUTORS_DIR}?${params}`;
}

export function editFileUrl({ repo, branch }, login) {
  return `https://github.com/${repo}/edit/${branch}/${CONTRIBUTORS_DIR}/${login}.yml`;
}

export function parseContributionUrl(url) {
  const match = typeof url === 'string' && url.trim().match(CONTRIBUTION_RE);
  if (!match) return null;
  const [, owner, repo, kind, number] = match;
  return {
    owner,
    repo,
    type: kind === 'pull' ? 'pull' : 'issue',
    number: Number(number),
    url: `https://github.com/${owner}/${repo}/${kind}/${number}`,
  };
}

export function isValidLogin(login) {
  return typeof login === 'string' && LOGIN_RE.test(login);
}

// Makes user-provided text safe to quote inside a Markdown comment.
export function quote(value) {
  const text = String(value).replace(/[`\r\n]/g, ' ');
  return '`' + (text.length > 60 ? `${text.slice(0, 57)}...` : text) + '`';
}

function isPlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDERS.has(value.trim().toLowerCase());
}

function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && EMPTY_VALUES.has(value.trim().toLowerCase()));
}

// Optional fields left empty, set to "None" or still holding the example value count as not provided.
function isProvided(value) {
  return !isEmpty(value) && !isPlaceholder(value);
}

function checkText(errors, data, field, { required = false, max }) {
  const value = data[field];
  if (required ? isEmpty(value) : !isProvided(value)) {
    if (required) errors.push(`\`${field}\` is missing. Add a line like \`${field}: ${FIELDS[field]}\`.`);
    return;
  }
  if (typeof value !== 'string') {
    errors.push(`\`${field}\` must be plain text.`);
  } else if (value.length > max) {
    errors.push(`\`${field}\` is too long (${value.length} characters, the maximum is ${max}).`);
  } else if (isPlaceholder(value)) {
    errors.push(`\`${field}\` still has the example value. Replace it with ${FIELDS[field]}.`);
  }
}

/** Returns a list of human-readable problems; an empty list means the data is valid. */
export function validateContributor(data, fileLogin) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return ['The file must contain lines like `github: your-username` and `name: Your Name`.'];
  }
  const errors = [];

  for (const key of Object.keys(data)) {
    if (!(key in FIELDS)) {
      errors.push(`Unknown field ${quote(key)}. Allowed fields are: ${Object.keys(FIELDS).join(', ')}.`);
    }
  }

  const github = typeof data.github === 'number' ? String(data.github) : data.github;
  if (github === undefined || github === null || github === '') {
    errors.push(`\`github\` is missing. Add a line like \`github: ${fileLogin}\`.`);
  } else if (!isValidLogin(github) || github.toLowerCase() === USERNAME_PLACEHOLDER.toLowerCase()) {
    errors.push(`\`github\` must be your GitHub username, got ${quote(github)}.`);
  } else if (github.toLowerCase() !== fileLogin.toLowerCase()) {
    errors.push(`\`github\` is ${quote(github)} but the file is named \`${fileLogin}.yml\`. They must match.`);
  }

  checkText(errors, data, 'name', { required: true, max: 80 });
  checkText(errors, data, 'bio', { max: 280 });
  checkText(errors, data, 'location', { max: 80 });
  checkText(errors, data, 'website', { max: 200 });
  if (typeof data.website === 'string' && isProvided(data.website)) {
    let url;
    try {
      url = new URL(data.website);
    } catch {}
    if (!url || !['http:', 'https:'].includes(url.protocol)) {
      errors.push(`\`website\` must be a full link starting with https://, got ${quote(data.website)}.`);
    }
  }

  const { contributions } = data;
  if (contributions !== undefined && contributions !== null) {
    if (!Array.isArray(contributions)) {
      errors.push('`contributions` must be a list. Put each link on its own line starting with `  - `.');
    } else if (contributions.length > MAX_CONTRIBUTIONS) {
      errors.push(`\`contributions\` can have at most ${MAX_CONTRIBUTIONS} links.`);
    } else {
      const seen = new Set();
      contributions.forEach((entry, i) => {
        const parsed = parseContributionUrl(entry);
        if (!parsed) {
          errors.push(
            `Contribution #${i + 1} (${quote(entry)}) is not a link to a GitHub issue or pull request. ` +
              'It should look like `https://github.com/owner/repo/pull/123` or `https://github.com/owner/repo/issues/45`.',
          );
        } else if (seen.has(parsed.url.toLowerCase())) {
          errors.push(`Contribution #${i + 1} (${quote(entry)}) is listed twice.`);
        } else {
          seen.add(parsed.url.toLowerCase());
        }
      });
    }
  }

  return errors;
}

export function normalizeContributor(data) {
  const clean = (v) => (typeof v === 'string' && isProvided(v) ? v.trim() : undefined);
  return {
    github: String(data.github),
    name: data.name.trim(),
    bio: clean(data.bio),
    location: clean(data.location),
    website: clean(data.website),
    contributions: (data.contributions ?? []).map(parseContributionUrl),
  };
}

/** Returns the login a contributor file name stands for, or an error if the name is wrong. */
export function loginFromFileName(name) {
  if (!name.endsWith('.yml')) {
    return { error: `The file must be named \`<your-username>.yml\` (ending in \`.yml\`), not ${quote(name)}.` };
  }
  return { login: name.slice(0, -'.yml'.length) };
}

/** Parses and validates the text of a contributor file. Never executes anything from the file. */
export function parseContributorFile(login, text) {
  if (Buffer.byteLength(text) > MAX_FILE_BYTES) {
    return { login, errors: [`The file is too large (max ${MAX_FILE_BYTES} bytes).`] };
  }
  let data;
  try {
    data = parse(text, { maxAliasCount: 10 });
  } catch (err) {
    const line = err.linePos?.[0]?.line;
    return {
      login,
      errors: [
        `The file is not valid YAML${line ? ` (around line ${line})` : ''}. ` +
          'Check that every line looks like `field: value`, and that list items start with two spaces and a dash (`  - `).',
      ],
    };
  }

  const errors = validateContributor(data, login);
  return { login, errors, contributor: errors.length ? undefined : normalizeContributor(data) };
}

/** Reads and validates one contributor file from disk. */
export async function readContributorFile(filePath) {
  const { login, error } = loginFromFileName(path.basename(filePath));
  if (error) return { errors: [error] };

  let stat;
  try {
    stat = await lstat(filePath);
  } catch {
    return { login, errors: ['The file could not be found.'] };
  }
  if (!stat.isFile()) return { login, errors: ['This must be a regular file.'] };
  if (stat.size > MAX_FILE_BYTES) return { login, errors: [`The file is too large (max ${MAX_FILE_BYTES} bytes).`] };

  return parseContributorFile(login, await readFile(filePath, 'utf8'));
}

export async function loadContributors(dir = CONTRIBUTORS_DIR) {
  const names = (await readdir(dir)).filter((name) => !name.startsWith('.')).sort();
  return Promise.all(
    names.map(async (name) => ({ file: path.join(dir, name), ...(await readContributorFile(path.join(dir, name))) })),
  );
}
