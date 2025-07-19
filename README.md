# My Own Note

## 프로젝트 개요

모노레포 구조로 구성된 다중 플랫폼 노트 애플리케이션

## 서비스 구성

Web (Next.js) - 웹 애플리케이션 (포트 3000)

API (NestJS) - 백엔드 API 서버 (포트 4000)

Desktop (Electron) - 데스크톱 애플리케이션 (포트 7000)

Mobile (React Native) - 모바일 애플리케이션 (포트 8000)

## 필수 도구 설치

```shell
# 전역 도구 설치
$ npm install -g pnpm
$ npm install -g nx

# 또는 yarn 사용시
$ yarn global add pnpm
$ yarn global add nx
```

## 프로젝트 설정

```
# 프로젝트 클론
$ git clone [repository-url]
$ cd my_own_note

# 의존성 설치
$ pnpm install

# Electron 추가 설정 (필요한 경우)
$ cd node_modules/electron
$ node install.js
$ cd ../..
```

## 개별 서비스 실행

```shell
$ pnpm start:web      # Next.js 앱 시작 (3000)
$ pnpm start:api      # NestJS API 시작 (4000)
$ pnpm start:desktop  # Electron 앱 시작 (7000)
$ pnpm start:mobile   # React Native 앱 시작 (8000)

$ pnpm start:all      # 전체 시작

$ pnpm build:all      # 전체 빌드
```

## 디렉토리 구조

```
my_own_note/
├── apps/
│ ├── web/ # Next.js 웹 앱
│ ├── api/ # NestJS API
│ ├── desktop/ # Electron 앱
│ └── mobile/ # React Native 앱
├── libs/ # 공유 라이브러리
├── tools/ # 빌드 도구
├── package.json # 루트 패키지 설정
├── nx.json # NX 설정
└── pnpm-workspace.yaml
```

## 기술 스택

웹: Next.js

데스크톱: Electron

모바일: React Native

백엔드: NestJS

빌드 도구: NX, Webpack

패키지 매니저: pnpm
