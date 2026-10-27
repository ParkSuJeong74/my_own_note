import assert from 'node:assert/strict';
import test from 'node:test';

import { apps, categoryDetails, filterApps, getCategory, getCategoryByName } from '../src/lib/catalog';

const supportStatuses = new Set(['integration-testing', 'planned', 'information-only']);

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
    assert.ok(supportStatuses.has(app.supportStatus));
    assert.ok(app.supportLabel.trim());
    assert.ok(app.supportDescription.trim());
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

test('every category has a stable URL slug and matching catalog entries', () => {
  assert.equal(new Set(categoryDetails.map((category) => category.slug)).size, categoryDetails.length);

  for (const category of categoryDetails) {
    assert.match(category.slug, /^[a-z0-9-]+$/);
    assert.equal(getCategory(category.slug), category);
    assert.equal(getCategoryByName(category.name), category);
    assert.ok(apps.some((app) => app.category === category.name));
  }

  assert.ok(apps.every((app) => getCategoryByName(app.category)));
  assert.equal(getCategory('%ED%95%9C%EA%B8%80'), undefined);
});

test('CosyVoice uses the reviewed upstream and clearly remains pre-release', () => {
  const cosyVoice = apps.find((app) => app.slug === 'cosyvoice');
  assert.ok(cosyVoice);
  assert.equal(cosyVoice.source, 'https://github.com/QwenAudio/CosyVoice');
  assert.match(cosyVoice.evidence, /074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc/);
  assert.match(cosyVoice.note, /검증 중/);
  assert.match(cosyVoice.note, /원클릭 설치를 제공하지 않습니다/);
  assert.equal(cosyVoice.supportStatus, 'planned');
});

test('Jellyfin is the only first integration target and has complete evidence', () => {
  const integrationTargets = apps.filter((app) => app.supportStatus === 'integration-testing');
  assert.deepEqual(integrationTargets.map((app) => app.slug), ['jellyfin']);
  assert.match(integrationTargets[0].supportDescription, /macOS/);
  assert.match(integrationTargets[0].note, /실기기 검증 전/);
  assert.equal(new URL(integrationTargets[0].official).hostname, 'jellyfin.org');
});

test('independent GUI programs are information-only', () => {
  for (const slug of ['obs-studio', 'handbrake', 'localsend']) {
    const app = apps.find((item) => item.slug === slug);
    assert.ok(app);
    assert.equal(app.supportStatus, 'information-only');
    assert.match(app.supportDescription, /초기 EasyOpen 통합 지원 범위에 포함하지 않습니다/);
  }
});
