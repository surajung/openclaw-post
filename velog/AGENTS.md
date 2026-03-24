# AGENTS.md - Velog Draft Harness

이 문서는 `posts/velog/`에서 작업하는 AI 모델용 단일 운영 규칙입니다.
다른 문서보다 이 파일을 우선 기준으로 사용합니다.

## 목적
- Velog 초안 결과물의 구조를 일정하게 유지한다.
- 모델이 바뀌어도 같은 기준으로 작성되게 한다.
- 템플릿, validator, cron 자동화가 동일한 규칙을 따르게 한다.

## 산출물 위치
- 초안 경로: `posts/velog/YYYY-MM-DD-gabiseo-log.md`
- 날짜 기준: **작성 시점의 전날**
- 템플릿: `posts/velog/TEMPLATE.md`
- validator: `posts/scripts/validate-velog-draft.cjs`

## 작성 대상
- 실제로 진행한 기술 작업, 자동화, 인프라, 운영 정리
- 회고보다 기술 구현 내용, 구조 변경, 설정 포인트를 우선
- 기술적으로 설명할 가치가 부족하면 생성하지 않는다

## 필수 구조
초안은 아래 순서를 따라야 한다.

1. 제목 (`# ...`)
2. 해시태그 라인 (`#OpenClaw` 필수 시작)
3. `## 한줄 요약`
4. `## 배경`
5. `## 문제`
6. `## 변경 내용`
7. `## 핵심 설정 / 코드`
8. `## 결과`
9. `## 정리`
10. 고지 문구(문서 최하단)

고지 문구:

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._

## 작성 규칙
- 한국어
- 실용적이고 기술적인 톤
- 과장 금지
- 감상보다 문제, 구조, 구현, 결과를 우선
- 필요 시 코드, JSON, YAML, 프롬프트 일부를 포함
- 민감정보/비밀값/개인정보/내부 토큰/불필요한 내부 경로는 제외
- 외부 계정명, 내부 식별자, 워치리스트 대상은 필요 시 일반화
- 제목 아래 해시태그는 반드시 `#OpenClaw`로 시작
- `## 한줄 요약`은 반드시 한 문장으로 작성
- 고지 문구는 반드시 문서 최하단에 둔다

## 코드 블록 규칙
- Markdown 예시 안에 또 다른 코드펜스를 넣어야 하면 바깥쪽 펜스는 4개 백틱 이상을 사용한다.
- 예시 템플릿/예시 코드 안 placeholder는 가능하지만, 실제 본문에는 `{{title}}`, `{{one_line_summary}}` 같은 placeholder가 남아 있으면 안 된다.

## validator 규칙
초안 생성 후에는 반드시 아래 검증을 통과해야 한다.

```bash
cd /Users/surajung/.openclaw/workspace/posts
node scripts/validate-velog-draft.cjs velog/YYYY-MM-DD-gabiseo-log.md
```

검사 항목:
- 제목이 `# `로 시작하는지
- 해시태그 라인이 `#OpenClaw`로 시작하는지
- `## 한줄 요약` 섹션이 정확히 1개인지
- `## 한줄 요약` 내용이 비어 있지 않은지
- 고지 문구가 문서 최하단에 있는지
- `{{placeholder}}` 미치환 문자열이 남아 있지 않은지
- 필수 섹션이 모두 있는지
- fenced code block 균형이 맞는지

validator 실패 시:
- 파일은 유지
- git add/commit/push는 진행하지 않음
- 실패 사실만 짧게 보고

## Git 규칙
- validator 통과 후에만 git add/commit/push 수행
- commit 메시지 기본값: `docs(velog): add YYYY-MM-DD draft`
- push 실패 시 파일은 유지하고 실패 사실만 보고

## 운영 원칙
- 규칙을 바꿀 때는 `TEMPLATE.md`, validator, cron 지시문을 함께 맞춘다.
- 모델이 바뀌어도 validator 기준은 유지한다.
- 게시 품질 문제는 모델 출력 문제와 하네스 문제를 분리해서 다룬다.
