# MY OWN NOTE WEB

**My Own Note WEB** 는 에디팅 웹/앱 서비스를 개발하는 개인 프로젝트의 웹 프론트엔드 입니다.

## 기술 스택 (Tech Stack)

- **프레임워크**: React
- **라이브러리**:

## 초기 세팅

```bash
# React 세팅
npx create-react-app . --template typescript
npm install
# trouble shooting #1
```

### trouble shooting

- #1 react babel-preset-react-app

> One of your dependencies, babel-preset-react-app, is importing the "@babel/plugin-proposal-private-property-in-object" package without declaring it in its dependencies.

직접 @babel/plugin-proposal-private-property-in-object를 프로젝트의 devDependencies에 추가

```shell
npm install --save-dev @babel/plugin-proposal-private-property-in-object
```
