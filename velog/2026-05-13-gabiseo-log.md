# Obsidian LiveSync를 붙이기 전에 CouchDB 스택을 먼저 분리한 이유

#OpenClaw #Obsidian #LiveSync #CouchDB #Docker

## 한줄 요약
Obsidian LiveSync를 바로 켜기보다, CouchDB를 로컬 바인딩·비밀 분리·헬스체크까지 포함한 별도 스택으로 먼저 정리해 동기화 기반을 안전하게 만들었다.

## 배경
OpenClaw 워크스페이스를 Obsidian Vault로 활용하는 흐름이 잡히면서, 다음 단계는 여러 기기에서 노트를 동기화할 수 있는 저장소를 준비하는 일이었다.

이번 작업에서는 Obsidian LiveSync 자체를 공격적으로 연결하기보다, 먼저 CouchDB를 운영 가능한 형태로 분리하는 쪽에 무게를 뒀다. 이유는 단순하다. 동기화 문제는 클라이언트 플러그인보다 서버 엔드포인트, 권한, 데이터 영속성, 노출 범위에서 더 자주 사고가 난다.

## 문제
초기 상태에서 바로 부딪히는 문제는 아래와 같았다.

- LiveSync가 기대하는 CouchDB 엔드포인트를 어디까지 열어둘지 기준이 필요했다.
- Compose 파일에 계정 정보를 직접 넣으면 재사용성과 보안성이 모두 떨어진다.
- 컨테이너가 떠 있어도 DB가 실제 응답 가능한지 빠르게 확인할 장치가 필요했다.
- Obsidian 내부 파일까지 무차별 동기화하면 `.git`, `node_modules`, 플러그인 데이터 같은 불필요한 변경까지 원격에 섞일 수 있다.

즉, "동기화가 되느냐"보다 "동기화 기반을 어떻게 운영 가능한 형태로 두느냐"가 먼저였다.

## 변경 내용
이번에 정리한 핵심은 세 가지다.

1. Obsidian LiveSync 전용 CouchDB 스택 분리
   - 별도 `docker-compose.yml`로 분리해 목적을 명확히 했다.
2. 비밀값 외부화
   - 관리자 계정과 LiveSync 계정은 `.env`로 분리해 Compose 파일에 하드코딩하지 않도록 정리했다.
3. 로컬 우선 운영 기본값 적용
   - `127.0.0.1:5984` 바인딩, 데이터 볼륨, 헬스체크를 먼저 적용했다.

추가로 README에 실행 방법, 헬스체크, LiveSync 연결 시 필요한 값(DB 이름, 계정, URL)을 문서화해 운영 메모가 아니라 재현 가능한 절차로 바꿨다.

## 핵심 설정 / 코드
CouchDB 스택은 외부 전체 공개 대신 루프백 바인딩을 기본값으로 잡았다.

```yaml
services:
  couchdb:
    image: couchdb:3
    restart: unless-stopped
    ports:
      - "127.0.0.1:5984:5984"
    environment:
      COUCHDB_USER: ${COUCHDB_USER}
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}
      TZ: Asia/Seoul
    env_file:
      - ./.env
    volumes:
      - couchdb_data:/opt/couchdb/data
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1:5984/"]
```

여기서 중요한 포인트는 두 가지다.

- `127.0.0.1` 바인딩으로 기본 노출 범위를 로컬로 제한했다.
- `healthcheck`를 붙여 단순 컨테이너 기동과 실제 응답 가능 상태를 구분했다.

운영 문서에는 최소한의 점검 절차도 같이 남겼다.

````bash
curl -u "$COUCHDB_USER:$COUCHDB_PASSWORD" http://127.0.0.1:5984/_up
curl -u "$LIVESYNC_USER:$LIVESYNC_PASSWORD" http://127.0.0.1:5984/$LIVESYNC_DB
````

Obsidian LiveSync 쪽에서는 내부 파일 동기화 범위를 보수적으로 다루는 설정이 눈에 띈다.

```json
{
  "trashInsteadDelete": true,
  "watchInternalFileChanges": true,
  "syncInternalFiles": false,
  "syncInternalFilesIgnorePatterns": "\\/node_modules\\/, \\/\\.git\\/, \\/obsidian-livesync\\/"
}
```

이 조합은 아직 동기화 범위를 크게 열지 않고, 삭제는 휴지통 우선으로 처리하며, 워크스페이스의 운영성 파일은 원격 동기화 대상에서 쉽게 섞이지 않도록 막는 방향에 가깝다.

## 결과
이번 작업으로 얻은 결과는 명확하다.

- Obsidian LiveSync용 저장소를 애플리케이션 설정이 아니라 독립 스택으로 관리할 수 있게 됐다.
- 비밀값이 Compose 본문에서 빠져 설정 재사용성과 공개 초안 안전성이 좋아졌다.
- DB 상태를 `_up` 및 대상 DB 조회로 빠르게 점검할 수 있게 됐다.
- 동기화 전에 로컬 노출 범위와 내부 파일 제외 기준을 먼저 세워, 나중에 HTTPS 엔드포인트나 외부 접근을 붙여도 기준점이 남는다.

즉, 이번 변경은 "동기화 기능 추가"라기보다 "동기화 장애를 줄이기 위한 기반 정리"에 가깝다.

## 정리
Obsidian LiveSync를 붙일 때 가장 쉬운 길은 플러그인부터 만지는 것이지만, 실제로는 CouchDB를 어떤 범위로 노출하고 어떤 데이터만 동기화할지 먼저 정하는 편이 훨씬 안전하다.

이번 정리에서 좋았던 점은 기능을 많이 켠 것이 아니라, 기본값을 보수적으로 잡았다는 데 있다. 로컬 바인딩, `.env` 분리, 헬스체크, 내부 파일 제외 패턴만 갖춰도 이후 터널링이나 원격 HTTPS 연결로 확장할 때 훨씬 덜 흔들린다.

특히 Obsidian Vault 안에 운영 문서와 개발 산출물이 함께 있는 환경이라면, LiveSync는 "바로 연결"보다 "무엇을 동기화하지 않을지"를 먼저 설계하는 쪽이 실무적으로 낫다.

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._