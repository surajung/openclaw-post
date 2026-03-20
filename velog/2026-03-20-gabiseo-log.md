# Daily 브리핑 확장 정보 파이프라인을 RSSHub·n8n 기반으로 재구성한 날

#OpenClaw #n8n #RSSHub #Daily브리핑 #자동화

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._

## 배경
기존 Daily 브리핑 2번째 메시지는 관심주제 링크, 트렌드 키워드, GeekNews 상세 브리핑이 섞여 있었습니다. 구조 자체는 동작했지만, 관심주제 링크 브리핑과 GeekNews 상세 브리핑이 모두 “읽을거리 큐레이션” 역할을 하다 보니 중복감이 컸습니다.

그래서 단순 링크 큐레이션 대신, 실제로 참고 가치가 있는 소셜 소스를 **워치리스트 기반 요약**으로 바꾸고 싶었습니다. 문제는 Threads 같은 소스가 일반적인 HTML 추출로는 안정적으로 읽기 어렵다는 점이었고, 이걸 풀기 위해 RSSHub와 n8n을 중간 계층으로 붙이는 방향으로 정리했습니다.

## 문제
이번에 해결하려던 문제는 크게 네 가지였습니다.

- Threads 같은 동적 소스를 자동화 파이프라인에 안정적으로 넣기 어렵다.
- 브리핑 2번째 메시지에서 관심주제 링크와 GeekNews가 역할상 겹친다.
- n8n workflow를 GUI에만 두면 변경 이력과 재사용성이 약하다.
- Velog용 작업일지 자동화가 돌아가더라도, 블로그 초안으로는 기술적 밀도가 부족했다.

특히 Threads 쪽은 브라우저에서는 보이는데 n8n에서 바로 읽으려면 실패하기 쉬웠고, Docker 네트워크/호스트 접근 차이까지 같이 고려해야 했습니다.

## 변경 내용
- RSSHub를 Docker로 최소 구성으로 띄우고, Threads 계정 `@choi.openai`를 RSS로 변환할 수 있는지 확인했다.
- `http://127.0.0.1:1200/threads/choi.openai`는 호스트에서는 되지만, n8n 컨테이너 내부에서는 localhost 범위 문제로 실패한다는 점을 확인했다.
- 테스트 환경에서는 RSS feed URL을 `http://host.docker.internal:1200/threads/choi.openai`로 바꿔 n8n에서 RSSHub를 읽을 수 있게 했다.
- 기존 `GeekNews 요약` workflow를 JSON으로 export해서 `infra/n8n/workflows/geeknews-summary.json` 기준 원본으로 관리하기 시작했다.
- 같은 구조를 복제해 `watchlist-summary` 초안을 만들고, RSS source / webhook path / prompt / source 필드를 워치리스트용으로 교체했다.
- watchlist-summary와 geeknews-summary 모두 Daily 브리핑 2번째 메시지에 맞게 브리핑 친화형으로 튜닝했다.
- Daily 브리핑 2번째 cron은 이제 관심주제 링크 브리핑 대신 `watchlist-summary` + `geeknews-summary` webhook을 함께 호출하도록 수정했다.
- Velog 초안 자동 생성 흐름도 같이 정리했다. 초안 생성 후 git commit/push까지 자동화되도록 보정하고, posts 전용 저장소 구조도 정리했다.

## 핵심 설정 / 코드
이번에 가장 중요했던 포인트는 “호스트에서 되는 URL”과 “컨테이너 안에서 되는 URL”이 다르다는 점이었습니다.

```yaml
# RSSHub 호스트 테스트 URL
http://127.0.0.1:1200/threads/choi.openai

# n8n 컨테이너에서 RSSHub 접근용 테스트 URL
http://host.docker.internal:1200/threads/choi.openai
```

watchlist-summary workflow는 기존 GeekNews workflow를 거의 그대로 재사용했습니다.

```json
{
  "source": "threads-watchlist",
  "summaryText": "2문장 이내의 짧은 브리핑 메모",
  "items": [
    { "title": "제목", "url": "https://..." }
  ]
}
```

프롬프트도 단순 요약이 아니라, Daily 브리핑 2번째 메시지에 바로 넣을 수 있도록 바꿨습니다.

```text
- 오늘 피드에서 반복적으로 보인 핵심 주제 2~4개만 요약
- 기사체보다 브리핑 메모 톤
- 첫 문장: 공통 흐름
- 두 번째 문장: 왜 지금 볼 만한지
- items는 최대 4개
```

그리고 Velog 초안 생성용 cron도 단순 작업일지가 아니라, 기술 블로그형 구조를 우선하도록 튜닝했습니다.

```text
배경 → 문제 → 변경 내용 → 핵심 설정/코드 → 결과 → 정리
```

## 결과
결과적으로 Daily 브리핑 2번째 메시지의 역할이 훨씬 선명해졌습니다.

- 워치리스트는 “오늘 외부 소스에서 반복적으로 보인 흐름”을 짧게 정리하고
- GeekNews는 기술 뉴스 축을 보강하고
- 트렌드 키워드는 두 소스 사이에서 공통 테마를 압축하는 역할을 맡게 됐습니다.

또한 n8n workflow도 파일 기반 관리 구조를 시작했습니다.

- `infra/n8n/workflows/` : 기준 workflow
- `infra/n8n/notes/` : 구조와 운영 메모
- `infra/n8n/archive/` : 원본 백업

이 구조를 잡아두니 앞으로 watchlist를 추가하거나 GeekNews를 다시 튜닝할 때도 GUI에서만 만지는 것보다 훨씬 다루기 쉬워졌습니다.

Velog 초안 자동화도 함께 안정화했습니다. 초안은 날짜 기준으로 생성되고, 생성 후 `posts` 저장소에 자동 커밋/푸시되도록 연결했습니다. 작성 방식 고지 문구와 `#OpenClaw` 필수 해시태그 규칙도 같이 반영했습니다.

## 정리
하루 동안 한 작업이 많았지만, 핵심은 결국 하나였습니다. **Daily 브리핑의 확장 정보 구간을, 링크 나열이 아니라 구조화된 요약 파이프라인으로 바꾸는 것**이었습니다.

이번 작업으로 RSSHub → n8n → Daily 브리핑 연결 흐름이 실제로 성립했고, GeekNews와 watchlist를 같은 패턴으로 다룰 수 있는 기반도 생겼습니다. 동시에 n8n workflow와 Velog 초안까지 파일 기반으로 관리하기 시작해서, 이후 수정과 회고도 훨씬 쉬워졌습니다.

다음 단계는 명확합니다. 워치리스트 대상을 늘릴지, summaryText를 더 압축할지, 그리고 n8n/RSSHub 네트워크를 테스트용 `host.docker.internal`이 아니라 정식 Docker network 기준으로 정리할지를 결정하면 됩니다.
