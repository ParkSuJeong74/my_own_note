# Docker 컨테이너 시작

```shell
$ pnpm init-storage
$ pnpm init-monitoring
```

## Vault (8200)

- Vault 웹으로 확인 : http://localhost:8200

- Vault 키 조회

```shell
$ vault kv get secret/my_own_note_local

# cli 없으면 설치
$ brew install vault
```

- Vault 키 세팅

```shell
$ cd tool/script
$ sh set-vault.sh
```

# 로그 확인 (Root Token 확인)

```shell
$ docker-compose logs vault
```

# Docker 중지

```shell
$ docker-compose down
```

# 볼륨까지 삭제 (모든 데이터 삭제)

```shell
$ docker-compose down -v
```
