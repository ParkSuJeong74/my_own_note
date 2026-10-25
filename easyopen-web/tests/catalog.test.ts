import assert from 'node:assert/strict';
import test from 'node:test';

import { apps, filterApps } from '../src/lib/catalog';

test('catalog entries contain safe, complete metadata', () => {
  assert.equal(new Set(apps.map((app) => app.slug)).size, apps.length);

  for (const app of apps) {
    assert.match(app.slug, /^[a-z0-9-]+$/);
    assert.equal(new URL(app.official).protocol, 'https:');
    assert.equal(new URL(app.source).protocol, 'https:');
    assert.equal(new URL(app.evidence).protocol, 'https:');
    assert.equal(new URL(app.licenseUrl).protocol, 'https:');
    assert.ok(app.name.trim());
    assert.ok(app.category.trim());
    assert.ok(app.license.trim());
    assert.ok(app.version.trim());
    assert.match(app.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(app.verifiedAt)));
    assert.ok(app.os.length > 0);
    assert.ok(app.tags.length > 0);
    assert.ok(app.steps.length >= 2);
    assert.notEqual(app.type, '원클릭 설치');
  }
});

test('empty search returns every app without mutating input', () => {
  const snapshot = structuredClone(apps);
  assert.deepEqual(filterApps(apps, ''), apps);
  assert.deepEqual(apps, snapshot);
});

test('search is case-insensitive across English and Korean metadata', () => {
  assert.ok(filterApps(apps, 'OBS').some((app) => app.slug === 'obs-studio'));
  assert.ok(filterApps(apps, '자막').some((app) => app.slug === 'whisper'));
  assert.deepEqual(filterApps(apps, '존재하지-않는-검색어'), []);
});

test('category and OS filters combine with search', () => {
  const voiceOnMac = filterApps(apps, '', 'AI 음성', 'macOS');
  assert.ok(voiceOnMac.length > 0);
  assert.ok(voiceOnMac.every((app) => app.category === 'AI 음성' && app.os.includes('macOS')));
  assert.deepEqual(filterApps(apps, '', 'AI 음성', 'Android'), []);
  assert.deepEqual(filterApps(apps, 'OBS', 'AI 음성', '전체'), []);
});
