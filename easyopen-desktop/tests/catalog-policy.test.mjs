import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedPackage} from '../electron/catalog-policy.ts';

const catalog = [
  {
    id: 'localsend',
    name: 'LocalSend',
    officialUrl: 'https://localsend.org/',
    install: {
      windows: {
        method: 'winget',
        packageId: 'LocalSend.LocalSend',
        validated: false,
      },
    },
  },
];

test('개발용 allowlist와 카탈로그 ID가 모두 일치해야 실행을 허용', () => {
  assert.equal(allowedPackage(catalog, 'localsend'), 'LocalSend.LocalSend');
});

test('카탈로그 추가만으로 WinGet 실행 권한을 얻을 수 없음', () => {
  const injected = [
    ...catalog,
    {
      id: 'unreviewed',
      name: 'Unreviewed',
      officialUrl: 'https://example.com/',
      install: {
        windows: {
          method: 'winget',
          packageId: 'Vendor.Unreviewed',
          validated: false,
        },
      },
    },
  ];

  assert.equal(allowedPackage(injected, 'unreviewed'), null);
});

test('승인된 앱 ID라도 패키지 ID가 변조되면 거절', () => {
  const changed = structuredClone(catalog);
  changed[0].install.windows.packageId = 'Attacker.Package';
  assert.equal(allowedPackage(changed, 'localsend'), null);
});
