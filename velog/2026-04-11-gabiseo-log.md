# n8n 요약 Webhook 두 개를 같은 패턴으로 정리하면서 운영 복구 포인트를 문서화한 방법

#OpenClaw #n8n #Webhook #자동화 #운영

## 한줄 요약
뉴스 요약용 webhook 두 개를 같은 응답 스키마와 후처리 패턴으로 다시 정리하고, 운영 중 재현과 복구에 필요한 workflow 백업 기준까지 함께 남겼다.

## 배경
아침 브리핑 자동화에는 서로 다른 두 개의 요약 소스가 들어간다.

- 기술 뉴스 피드를 요약하는 webhook
- 개인 워치리스트 성격의 피드를 요약하는 webhook

문제는 이 두 흐름이 비슷한 일을 하면서도, 운영 관점에서 비교 가능한 형태로 정리돼 있지 않으면 장애가 났을 때 어디가 다른지보다 어디가 같은지를 먼저 파악하기 어렵다는 점이다.

특히 LLM이 중간에 들어가는 n8n workflow는 입력 소스보다 후처리 규칙과 최종 응답 스키마가 더 중요해지는 경우가 많다. 실제 운영에서는 "지금 응답이 왔는가"보다 "항상 같은 구조로 응답하는가"가 더 중요했다.

## 문제
브리핑에 연결된 두 webhook은 구조적으로는 비슷하지만, 운영 문서와 백업 기준이 흐름별로 충분히 정리돼 있지 않으면 다음 문제가 생긴다.

- 장애 시 어떤 노드 구성이 실제 운영 기준인지 바로 비교하기 어렵다.
- LLM 출력이 코드블록, 문자열, 느슨한 JSON 형태로 흔들릴 때 어디서 흡수하는지 추적이 어렵다.
- 한쪽 workflow에서 검증된 후처리 패턴을 다른 workflow에 재사용하기 어렵다.
- 나중에 수정할 때 "현재 라이브 설정"과 "설계 의도"가 분리되지 않아 운영 복구 속도가 느려진다.

즉 핵심 문제는 단순히 webhook이 동작하느냐가 아니라, 두 workflow를 같은 운영 언어로 설명하고 다시 재현할 수 있느냐였다.

## 변경 내용
### 1) 두 webhook의 공통 구조를 같은 패턴으로 정리했다
두 workflow 모두 아래 흐름으로 맞췄다.

- Webhook 진입
- RSS 수집
- Aggregate로 입력 배열 구성
- Basic LLM Chain으로 요약 생성
- Code in JavaScript에서 후처리 및 최종 응답 래핑

이렇게 맞춰두면 입력 소스가 달라도 장애 분석 포인트를 같은 위치에서 비교할 수 있다.

### 2) LLM 출력 흔들림을 Code 노드에서 흡수하도록 기준을 명확히 했다
운영에서 가장 불안정한 지점은 모델 출력이다. JSON만 나오길 기대해도 실제로는 다음과 같은 변형이 자주 생긴다.

- ```json 코드블록으로 감싸진 응답
- JSON 앞뒤에 설명 문장이 붙은 응답
- `summaryText`만 있고 `items`가 없는 응답

이를 Code 노드에서 처리하도록 하고, 느슨한 JSON 파싱, 코드블록 제거, 최대 길이 제한, URL 기준 dedupe를 공통 후처리 규칙으로 정리했다.

### 3) 운영용 백업과 설명 문서를 함께 남겼다
workflow 자체만 저장하면 왜 그렇게 구성했는지가 빠진다. 반대로 설명만 있으면 실제 복구에 시간이 걸린다.

그래서 이번에는 두 가지를 함께 남기는 방식으로 정리했다.

- workflow JSON 백업본
- 노드 역할, 출력 스키마, 개선 포인트를 담은 운영 메모

이 조합이 있어야 다음 수정이나 장애 대응 때 "현재 구조"와 "의도한 구조"를 동시에 볼 수 있다.

## 핵심 설정 / 코드
운영 기준으로 본 공통 응답 스키마는 아래처럼 단순하게 맞췄다.

```json
{
  "ok": true,
  "source": "<summary-source>",
  "generatedAt": "ISO-8601",
  "summaryText": "2문장 이내 요약",
  "items": [
    { "title": "제목", "url": "https://example.com" }
  ]
}
```

LLM 출력 후처리의 핵심은 Code 노드에서 느슨하게 JSON을 복원한 뒤, 최종 스키마로 다시 래핑하는 부분이다.

````js
const rawText = (
  input?.text ||
  input?.summaryText ||
  input?.content?.parts?.[0]?.text ||
  ''
).trim();

function parseJsonLoose(str) {
  if (!str) return null;

  const cleaned = str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {}
    }
    return null;
  }
}

const parsed = parseJsonLoose(rawText) || {};
````

입력 소스가 달라져도 아래 레이어만 동일하면 운영 복구가 쉬워진다.

```yaml
layers:
  ingress:
    - webhook
    - rss-read
  transform:
    - aggregate to news_list
    - llm summary generation
  normalize:
    - strip code fences
    - loose json parse
    - item dedupe by url
    - summary length guard
  response:
    - ok
    - source
    - generatedAt
    - summaryText
    - items[]
```

## 결과
이번 정리로 얻은 운영상 이점은 분명했다.

- 서로 다른 두 요약 workflow를 같은 패턴으로 비교할 수 있게 됐다.
- LLM 출력 변동성이 발생해도 후처리 위치가 명확해졌다.
- 라이브 workflow를 다시 확인하거나 복구할 때 JSON 백업본을 기준점으로 사용할 수 있게 됐다.
- 단순 백업이 아니라 "왜 이렇게 구성했는지"까지 남겨서 다음 수정 비용을 낮췄다.

기능 추가 자체는 크지 않지만, 브리핑 자동화처럼 매일 도는 흐름에서는 이런 구조화가 장애 대응 시간을 줄이는 데 더 직접적으로 도움이 된다.

## 정리
n8n에서 LLM이 들어간 webhook을 운영할 때 중요한 것은 프롬프트 한 줄보다, 출력이 흔들렸을 때 어디서 흡수하고 어떤 스키마로 다시 고정하느냐다.

이번 작업은 새로운 기능 개발보다는 두 요약 workflow를 같은 구조로 문서화하고, 백업 가능한 운영 자산으로 바꾼 정리에 가깝다. 결과적으로 이후 수정, 비교, 복구의 기준점이 생겼다는 점이 가장 큰 수확이었다.

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._