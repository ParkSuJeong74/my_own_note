# MY OWN NOTE API

**My Own Note API** 는 에디팅 웹/앱 서비스를 개발하는 개인 프로젝트의 API 입니다.

## 기술 스택 (Tech Stack)

- **프레임워크**: Nest.js
- **라이브러리**:

## 초기 세팅

```bash
# Nest.js 세팅
npm install -g @nestjs/cli
# trouble shooting #1
nest new .
npm install

# @my_own_note/api PORT 3005
npm run start
```

### trouble shooting

- #1 global package install

> Error: EACCES: permission denied, symlink '../lib/node_modules/@nestjs/cli/bin/nest.js' -> '/usr/local/bin/nest'

전역 npm 패키지 설치 경로를 사용자 디렉토리로 변경

```shell
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g @nestjs/cli
```
