# MY OWN NOTE

## Mono Repo

pnpm 사용

```shell
brew install pnpm
pnpm init

# pmpm 전역 설치시 설정 필요
pnpm setup
mkdir -p ~/Library/pnpm
sudo vi ~/.zshrc

# 추가
export PNPM_HOME="$HOME/Library/pnpm"
export PATH="$PNPM_HOME:$PATH"

source ~/.zshrc

echo $PNPM_HOME # Library/pnpm
```

### Directory Structure

```
my_own_note/
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── api/          # NestJS project
│   ├── mobile/       # React Native project
│   ├── web/          # React project
│   └── desktop/      # Electron project
├── libs/
│   ├── common/       # Shared utilities, types, etc.
│   └── ui/           # Shared UI components
└── .gitignore
```

### INIT

nestjs

```shell
pnpm add -g @nestjs/cli
nest new .
```

react

```shell
pnpm create react-app . --template typescript
```

react-native

```shell
npx react-native init mobile
```

electron

```shell
pnpm init
pnpm add electron electron-builder
pnpm add -D typescript @types/electron
```

libs/common

```shell
pnpm init
pnpm add -D typescript
```

libs/ui

```shell
pnpm init
pnpm add react react-native react-native-web
pnpm add -D @types/react @types/react-native
```
