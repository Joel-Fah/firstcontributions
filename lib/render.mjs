import { contributorTemplate, editFileUrl, USERNAME_PLACEHOLDER } from './contributors.mjs';
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, localeHref } from './i18n.mjs';
import { tLayout } from './i18n/layout.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

class Html {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

function interpolate(value) {
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(interpolate).join('');
  if (value === undefined || value === null || value === false) return '';
  return escapeHtml(value);
}

/** Tagged template that escapes interpolated values unless they are already `html`. */
export function html(strings, ...values) {
  return new Html(strings.reduce((out, s, i) => out + interpolate(values[i - 1]) + s));
}

const avatar = (login, size) =>
  html`<img class="avatar" src="https://github.com/${login}.png?size=${size * 2}" alt="" width="${size}" height="${size}" loading="lazy">`;

const STATUS_LABELS = {
  merged: 'Merged',
  open: 'Open',
  draft: 'Draft',
  closed: 'Closed',
  completed: 'Closed',
  'not-planned': 'Not planned',
};

function layout({ config, root, localeRoot = '', locale = DEFAULT_LOCALE, title, description, body }) {
  const otherLocales = LOCALES.filter((l) => l !== locale);
  return html`<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌍</text></svg>">
<link rel="stylesheet" href="${root}style.css">
</head>
<body>
<div class="flag" aria-hidden="true"><span></span><span></span><span></span></div>
<nav class="nav">
  <a class="brand" href="${root}">${config.community} <span>contributors</span></a>
  <a href="https://github.com/${config.repo}">${tLayout(locale, 'nav.github')}</a>
  ${otherLocales.map((l) => html` · <a href="${localeHref(l, locale, localeRoot)}" hreflang="${l}">${LOCALE_NAMES[l]}</a>`)}
</nav>
<main>
${body}
</main>
<footer class="footer">
  <p>${tLayout(locale, 'footer.builtByPrefix')} <a href="${config.communityUrl}">${config.community}</a> ${tLayout(locale, 'footer.builtBySuffix')}
  ${tLayout(locale, 'footer.contribute')} <a href="https://github.com/${config.repo}">${tLayout(locale, 'footer.contributeLink')}</a>.</p>
</footer>
</body>
</html>
`.value;
}


import { tHome } from './i18n/home.mjs';

function card(c, locale = DEFAULT_LOCALE) {
  const count = c.contributions.length;
  const countLabel = count
    ? tHome(locale, count === 1 ? 'card.contribution.one' : 'card.contribution.other', { count })
    : null;
  const meta = [c.location, countLabel].filter(Boolean);
  const search = [c.name, c.github, c.location].filter(Boolean).join(' ').toLowerCase();
  return html`<li class="card" data-search="${search}">
  <a href="u/${c.github}/">
    ${avatar(c.github, 56)}
    <span class="card-text">
      <span class="card-name">${c.name}</span>
      <span class="card-login">@${c.github}</span>
      ${meta.length ? html`<span class="card-meta">${meta.join(' · ')}</span>` : ''}
    </span>
  </a>
</li>`;
}


export function renderIndex({ config, contributors, locale = DEFAULT_LOCALE }) {
  const contributions = contributors.reduce((n, c) => n + c.contributions.length, 0);
  const merged = contributors.reduce((n, c) => n + c.contributions.filter((x) => x.status === 'merged').length, 0);
  const newFileBase = `https://github.com/${config.repo}/new/${config.branch}/contributors`;

  const body = html`<header class="hero">
  <p class="eyebrow">${config.community}</p>
  <h1>${tHome(locale, 'hero.title')}</h1>
  <p class="lede">${tHome(locale, 'hero.lede')}</p>
  <form class="join" id="join" data-url="${newFileBase}" data-template="${contributorTemplate()}" data-placeholder="${USERNAME_PLACEHOLDER}">
    <label for="login">${tHome(locale, 'hero.formLabel')}</label>
    <div class="join-row">
      <input id="login" name="login" autocomplete="username" spellcheck="false" placeholder="${tHome(locale, 'hero.formPlaceholder')}" required pattern="[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}">
      <button type="submit">${tHome(locale, 'hero.formButton')}</button>
    </div>
    <p class="hint">${tHome(locale, 'hero.formHint')} <a href="#how">${tHome(locale, 'hero.howLink')}</a></p>
  </form>
  <dl class="stats">
    <div><dt>${tHome(locale, 'stats.contributors')}</dt><dd>${contributors.length}</dd></div>
    <div><dt>${tHome(locale, 'stats.issuesAndPrs')}</dt><dd>${contributions}</dd></div>
    ${merged ? html`<div><dt>${tHome(locale, 'stats.mergedPrs')}</dt><dd>${merged}</dd></div>` : ''}
  </dl>
</header>

<section class="section">
  <div class="toolbar">
    <h2>${tHome(locale, 'toolbar.heading')}</h2>
    <input type="search" id="filter" placeholder="${tHome(locale, 'toolbar.searchPlaceholder')}" aria-label="${tHome(locale, 'toolbar.searchAriaLabel')}">
  </div>
  <ul class="grid" id="grid">
    ${contributors.map((c) => card(c, locale))}
  </ul>
  <p class="empty" id="no-results" hidden>${tHome(locale, 'grid.empty')}</p>
</section>

<section class="section how" id="how">
  <h2>${tHome(locale, 'how.heading')}</h2>
  <ol class="steps">
    <li>${trusted(tHome(locale, 'how.step1'))}</li>
    <li>${trusted(tHome(locale, 'how.step2'))}</li>
    <li>${trusted(tHome(locale, 'how.step3'))}</li>
    <li>${trusted(tHome(locale, 'how.step4'))}</li>
  </ol>
  <p>${tHome(locale, 'how.closing')}</p>
</section>

<script>
(() => {
  const form = document.getElementById('join');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const login = form.login.value.trim().replace(/^@/, '');
    const params = new URLSearchParams({
      filename: login + '.yml',
      value: form.dataset.template.replace(form.dataset.placeholder, login),
    });
    window.open(form.dataset.url + '?' + params, '_blank', 'noopener');
  });
  const filter = document.getElementById('filter');
  const cards = [...document.querySelectorAll('#grid .card')];
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const c of cards) {
      const match = c.dataset.search.includes(q);
      c.hidden = !match;
      shown += match;
    }
    document.getElementById('no-results').hidden = shown > 0;
  });
})();
</script>`;

  return layout({
    config,
    root: '',
    localeRoot: locale === DEFAULT_LOCALE ? '' : '../',
    locale,
    title: config.title,
    description: tHome(locale, 'meta.description', { count: contributors.length, community: config.community }),
    body,
  });
}


function contribution(c) {
  const kind = c.type === 'pull' ? 'Pull request' : 'Issue';
  const label = c.status ? STATUS_LABELS[c.status] : kind;
  const date = c.date ? new Date(c.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  return html`<li class="contrib">
  <span class="pill pill-${c.status ?? 'unknown'} pill-${c.type}">${label}</span>
  <div class="contrib-body">
    <a class="contrib-title" href="${c.url}">${c.title ?? `${c.owner}/${c.repo}#${c.number}`}</a>
    <span class="contrib-meta">${c.owner}/${c.repo} #${c.number} · ${kind}${date ? ` · ${date}` : ''}</span>
  </div>
</li>`;
}

export function renderProfile({ config, contributor: c }) {
  const edit = editFileUrl(config, c.github);
  const sorted = [...c.contributions].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const body = html`<a class="back" href="../../">← All contributors</a>
<header class="profile">
  ${avatar(c.github, 112)}
  <div>
    <h1>${c.name}</h1>
    <p class="profile-links">
      <a href="https://github.com/${c.github}">@${c.github}</a>
      ${c.location ? html`<span>${c.location}</span>` : ''}
      ${c.website ? html`<a href="${c.website}" rel="nofollow ugc">${c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>` : ''}
    </p>
    ${c.bio ? html`<p class="bio">${c.bio}</p>` : ''}
  </div>
</header>
<section class="section">
  <div class="toolbar">
    <h2>Contributions</h2>
    <a class="button-secondary" href="${edit}">Is this you? Add a contribution</a>
  </div>
  ${sorted.length
      ? html`<ul class="contribs">${sorted.map(contribution)}</ul>`
      : html`<p class="empty">No contributions listed yet. Worked on an issue or a pull request? <a href="${edit}">Add it to your file</a>.</p>`
    }
</section>`;

  return layout({
    config,
    root: '../../',
    title: `${c.name} · ${config.title}`,
    description: c.bio ?? `${c.name}'s open source contributions.`,
    body,
  });
}

export function renderNotFound({ config }) {
  const body = html`<header class="hero"><h1>Page not found</h1><p class="lede"><a href="${config.siteUrl}">Back to all contributors</a></p></header>`;
  return layout({ config, root: config.siteUrl, title: `Not found · ${config.title}`, description: config.title, body });
}
