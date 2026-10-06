import { CONTRIBUTORS_DIR, loginFromFileName, parseContributorFile, quote } from './contributors.mjs';

const MAINTAINER_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
export const COMMENT_MARKER = '<!-- first-contribution-check -->';

/**
 * Checks the files changed by a pull request.
 * `changed` is the list returned by the GitHub "list pull request files" API.
 * `fetchFile(filename)` returns `{ text }` or `{ error }` for a file in the pull request head.
 * File contents are only parsed, never executed.
 */
export async function checkPullRequest({ fetchFile, changed, author, association }) {
  const isMaintainer = MAINTAINER_ASSOCIATIONS.has(association);
  const problems = new Map();
  const notes = [];
  let touchesOtherFiles = false;
  let touchesContributors = false;

  const addProblem = (file, message) => {
    if (!problems.has(file)) problems.set(file, []);
    problems.get(file).push(message);
  };

  for (const change of changed) {
    const paths = [change.filename];
    if (change.status === 'renamed' && change.previous_filename) paths.push(change.previous_filename);

    for (const file of paths) {
      if (!file.startsWith(`${CONTRIBUTORS_DIR}/`)) {
        touchesOtherFiles = true;
        if (file.endsWith('.yml') && !file.includes('/') && change.status === 'added') {
          addProblem(file, `This file should be inside the \`${CONTRIBUTORS_DIR}\` folder: \`${CONTRIBUTORS_DIR}/${file}\`.`);
        }
        continue;
      }
      touchesContributors = true;

      const name = file.slice(CONTRIBUTORS_DIR.length + 1);
      if (name.includes('/')) {
        addProblem(file, `Put your file directly in the \`${CONTRIBUTORS_DIR}\` folder, not in a sub-folder.`);
        continue;
      }
      const { login: parsedLogin, error: nameError } = loginFromFileName(name);
      const login = parsedLogin ?? name.replace(/\.[^.]*$/, '');
      if (!isMaintainer && login.toLowerCase() !== author.toLowerCase()) {
        addProblem(
          file,
          `You can only add or edit your own file. Yours is \`${CONTRIBUTORS_DIR}/${author}.yml\`` +
            (login.toLowerCase().startsWith('your-') ? ' (replace the example name with your username).' : '.'),
        );
        continue;
      }
      if (file !== change.filename || change.status === 'removed') continue;
      if (nameError) {
        addProblem(file, nameError);
        continue;
      }

      const { text, error } = await fetchFile(file);
      const { errors } = error ? { errors: [error] } : parseContributorFile(login, text);
      for (const message of errors) addProblem(file, message);
    }
  }

  if (!touchesContributors) {
    notes.push('This pull request does not add or change a contributor file, so a maintainer will review it.');
  } else if (touchesOtherFiles) {
    notes.push(`This pull request also changes files outside \`${CONTRIBUTORS_DIR}/\`, so a maintainer will review it.`);
  }

  const ok = problems.size === 0;
  return { ok, autoMergeable: ok && touchesContributors && !touchesOtherFiles, problems, notes };
}

export function formatReport(result, { author, siteUrl, autoMerge }) {
  const lines = [COMMENT_MARKER];
  if (result.ok) {
    lines.push(`🎉 Thanks @${author}, everything looks good!`, '');
    if (result.autoMergeable && autoMerge) {
      lines.push(`This pull request will be merged automatically. You will show up on ${siteUrl} a few minutes later.`);
    } else if (result.autoMergeable) {
      lines.push(`A maintainer will merge it soon. After that, you will show up on ${siteUrl}.`);
    }
  } else {
    lines.push(`👋 Hi @${author}, thank you for contributing! A few things need fixing before this can be merged:`, '');
    for (const [file, messages] of result.problems) {
      lines.push(`**${quote(file)}**`, ...messages.map((m) => `- ${m}`), '');
    }
    lines.push(
      '<details><summary>How do I fix this from the GitHub website?</summary>',
      '',
      '1. Open the **Files changed** tab at the top of this pull request.',
      '2. Find your file, click the **⋯** button next to its name, then **Edit file**.',
      '3. Make the changes, then click **Commit changes**.',
      '',
      'This check runs again automatically after each change.',
      '</details>',
    );
  }
  if (result.notes.length) lines.push('', ...result.notes.map((n) => `> ${n}`));
  return lines.join('\n');
}
