# My Own Note

## 프로젝트 개요

모노레포 구조로 구성된 다중 플랫폼 노트 애플리케이션

## 서비스 구성

Web (Next.js) - 웹 애플리케이션 (포트 3000)

API (NestJS) - 백엔드 API 서버 (포트 4000)

Desktop (Electron) - 데스크톱 애플리케이션 (포트 7000)

Mobile (React Native) - 모바일 애플리케이션 (포트 8000)

## 나머지 PORT 정리

Vault (8200)

Postgresql (5432)

MongoDB (27017)

RabbitMQ (5672) - Admin (15672)

Minio (9000) - Admin (9001)

Prometheus (9090)

Grafana (3200)

Loki (3100)

Node Exporter (9100)

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
$ git clone https://github.com/ParkSuJeong74/my_own_note.git
$ cd my_own_note

# 의존성 설치
$ pnpm install

# Electron 추가 설정 (필요한 경우)
$ cd node_modules/electron
$ node install.js
$ cd ../..
```

## 프로젝트 초기 설정

```shell
# vault, husky 설정
$ pnpm init-all
```

## 개별 서비스 실행

```shell
$ pnpm start-web:local      # Next.js 앱 시작 (3000)
$ pnpm start-api:local      # NestJS API 시작 (4000)
$ pnpm start-desktop:local  # Electron 앱 시작 (7000)
$ pnpm start-mobile:local   # React Native 앱 시작 (8000)

$ pnpm start-all:local      # 전체 시작

$ pnpm build:all            # 전체 빌드
```

## 디렉토리 구조

```
my_own_note/
├── apps/
│ ├── web/                     # Next.js 웹 앱
│ ├── api/                     # NestJS API
│ ├── desktop/                 # Electron 앱
│ └── mobile/                  # React Native 앱
├── libs/                      # 공유 라이브러리
│ ├── core/                    # 기본 공통 코드
│ └── ui/                      # 공유 UI 컴포넌트 및 훅 등
├── tools/                     # 빌드 도구
│ ├── docker/                  # Docker 설정 파일
│ └── script/                  # 스크립트
├── package.json               # 루트 패키지 설정
├── nx.json                    # NX 설정
└── pnpm-workspace.yaml
```

## 기술 스택

웹: Next.js, tailwind, vercel

데스크톱: Electron

모바일: React Native

백엔드: NestJS, TypeORM, PostgreSQL, MongoDB, RabbitMQ

빌드 도구: NX, Webpack

패키지 매니저: pnpm
