# MY OWN NOTE

**My Own Note** 는 에디팅 웹/앱 서비스를 개발하는 개인 프로젝트입니다.

## 기술 스택 (Tech Stack)

- **프론트엔드**: React, React-Native, Electron
- **백엔드**: Nest.js
- **버전 관리**: Git
- **기타 도구**: pnpm

## 설치 및 사용법 (Installation and Usage)

OS 환경 : MAC 12.4 / NODE v18.20.2

### Prerequisites

- Node.js
- Docker

### 설치 방법 (Installation)

```bash
# Clone the repository
git clone https://github.com/ParkSuJeong74/my_own_note.git

# Navigate to the project directory
cd my_own_note

# pnpm가 아닌 다른 패키지 매니저를 사용하는 것을 막고 설치 진행
npm run pre-install
pnpm install
```

### 실행 방법 (Usage)

```bash
pnpm install

# @my_own_note/web PORT 3001로 실행
npm run web start

# @my_own_note/mobile PORT 8081로 실행
npm run mobile start # Expo App QR
npm run mobile ios
npm run mobile aos

# @my_own_note/api PORT 3005로 실행
npm run api start
```
