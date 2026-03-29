# Google Calendar `invalid_grant`가 Daily 브리핑을 망가뜨릴 때: 일정 없음과 조회 실패를 분리한 방법

#OpenClaw #GoogleCalendar #자동화 #운영 #Telegram

## 한줄 요약
Google Calendar 토큰 만료로 Daily 브리핑이 실제 일정 존재 여부와 무관하게 오탐을 낼 수 있는 문제를 확인하고, 캘린더 스크립트 출력 규약과 재인증 흐름을 분리해 자동화 해석 기준을 명확히 정리했다.

## 배경
매일 아침 6시 브리핑은 일정, 날씨, 뉴스, 운영 리포트를 함께 전달하는 자동화다. 이 흐름에서 일정 섹션은 `npm run -s calendar:today` 결과를 기반으로 생성된다.

문제는 브리핑 결과에 `등록된 일정 없음`이 찍혔지만, 실제로는 같은 날 일정이 존재했다는 점이었다. 단순히 캘린더 API가 실패한 것이 아니라, 실패가 "일정 없음"처럼 소비되는 운영 문제가 생긴 셈이다.

## 문제
직접 확인해보니 캘린더 조회 스크립트는 `invalid_grant`로 실패하고 있었다. 즉 Google Calendar OAuth 토큰이 만료되었거나 무효화된 상태였다.

여기서 더 큰 문제는 인증 UX였다. 기존 `--auth-only` 흐름은 저장된 토큰 파일이 남아 있으면 실제 브라우저 재인증을 수행하지 않아도 `인증 완료`처럼 보일 수 있었다. 운영자 입장에서는 재인증을 했다고 생각하지만, 실제로는 죽은 `refresh_token`을 계속 재사용하는 상태가 된다.

결국 문제는 두 층이었다.

- 데이터 수집 계층: `calendar:today` 자체가 `invalid_grant`로 실패
- 브리핑 해석 계층: 실패를 `등록된 일정 없음`으로 소비할 가능성 존재

## 변경 내용
- `scripts/google-calendar-today.js`에 강제 재인증 옵션(`--force`)을 추가하고, `calendar:reauth` npm 스크립트를 별도로 만들었다.
- 캘린더 출력에 `CALENDAR_OK`, `CALENDAR_EMPTY`, `CALENDAR_ERROR` 상태 코드를 도입해 자동화가 성공/빈 결과/실패를 구분할 수 있게 했다.
- `docs/calendar-ops.md`, `docs/daily-briefing-harness.md`를 추가해 브리핑이 `일정 없음`과 `조회 실패`를 섞지 않도록 운영 규칙을 문서화했다.

## 핵심 설정 / 코드
````js
// package.json
{
  "scripts": {
    "calendar:auth": "node scripts/google-calendar-today.js --auth-only",
    "calendar:reauth": "node scripts/google-calendar-today.js --auth-only --force",
    "calendar:today": "node scripts/google-calendar-today.js"
  }
}

// scripts/google-calendar-today.js
async function authorize({ force = false } = {}) {
  if (force) {
    await removeSavedToken();
  }

  let client = await loadSavedClient();
  if (client) return client;

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) await saveClient(client);
  return client;
}

if (!allEvents.length) {
  console.log('CALENDAR_EMPTY');
  console.log('오늘 일정: 등록된 일정 없음');
  return;
}

console.log('CALENDAR_OK');

main().catch((err) => {
  console.error('CALENDAR_ERROR');
  if (String(err?.message || '').includes('invalid_grant')) {
    console.error('npm run calendar:reauth');
  }
  process.exit(1);
});
````

문서 쪽 규칙도 단순하게 고정했다.

````md
- CALENDAR_OK    -> 일정 요약 작성
- CALENDAR_EMPTY -> 등록된 일정 없음
- CALENDAR_ERROR -> 캘린더 조회 실패 (확인 필요)

금지:
- 조회 실패를 일정 없음으로 적지 않는다.
- 에러 메시지를 무시하고 빈 일정으로 요약하지 않는다.
````

## 결과
토큰을 삭제한 뒤 재인증을 수행해 실제 조회가 복구되는 것을 확인했고, 이후 `calendar:today`는 일정이 있을 때 `CALENDAR_OK`와 함께 이벤트를 정상 출력했다.

이 변경으로 얻은 효과는 세 가지다.

- 운영자가 재인증이 실제로 일어났는지 더 명확히 판단할 수 있다.
- 브리핑 생성 로직이 빈 일정과 조회 실패를 구조적으로 분리할 수 있다.
- 향후 동일 장애가 발생해도 원인을 `토큰 문제`와 `브리핑 해석 문제`로 나눠 더 빠르게 진단할 수 있다.

## 정리
자동화 운영에서 더 위험한 것은 API 실패 자체보다, 실패가 정상 상태처럼 보이는 경우다. 이번 수정의 핵심은 Google Calendar 연동을 더 똑똑하게 만든 것이 아니라, 실패를 실패로 드러내는 규약을 만든 데 있다.

특히 사람에게 전달되는 브리핑 자동화라면 `없음`과 `실패`를 절대 같은 문장으로 표현하면 안 된다. 작은 상태 코드 하나와 짧은 운영 문서가 이런 종류의 오탐을 꽤 효과적으로 줄여준다.

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._