import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../site.config.mjs';
import { renderIndex } from '../lib/render.mjs';

const contributors = [];

test('index defaults to English', () => {
    const page = renderIndex({ config, contributors });
    assert.match(page, /<html lang="en">/);
    assert.ok(page.includes('Your first open source contribution starts here'));
});

test('index renders in French when locale is fr', () => {
    const page = renderIndex({ config, contributors, locale: 'fr' });
    assert.match(page, /<html lang="fr">/);
    assert.ok(page.includes('Votre première contribution open source commence ici'));
});

test('language switcher links to the other locale', () => {
    const en = renderIndex({ config, contributors });
    const fr = renderIndex({ config, contributors, locale: 'fr' });
    assert.ok(en.includes('href="fr/"'));
    assert.ok(fr.includes('href="../"'));
});
