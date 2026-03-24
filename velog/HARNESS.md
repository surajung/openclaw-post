# Velog Draft Harness

이 문서는 Velog 초안 자동 생성 하네스의 목적과 규칙을 정리한 운영 문서입니다.

## 목적
- 초안 생성 모델이 바뀌어도 결과물 구조를 일정하게 유지한다.
- 템플릿, 가이드, validator, cron 지시문이 같은 기준을 따르도록 맞춘다.
- 사람이 검수하기 쉬운 게시 후보 문서를 안정적으로 만든다.

## 결과물 규칙
Velog 초안은 아래 구조를 따라야 합니다.

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

## 왜 이렇게 고정했는가
- 글 목록 상단 미리보기에서 같은 고지 문구가 반복 노출되는 문제를 막기 위해 고지 문구는 최하단에 둡니다.
- 초반에 글 핵심을 빠르게 파악할 수 있도록 `## 한줄 요약`을 둡니다.
- 감상보다 기술적 맥락과 변경 사항을 우선하기 위해 섹션 순서를 고정합니다.

## validator
초안 자동 생성 후에는 반드시 아래 validator를 통과해야 합니다.

- 파일: `posts/scripts/validate-velog-draft.cjs`
- 실행 예시:

```bash
cd /Users/surajung/.openclaw/workspace/posts
node scripts/validate-velog-draft.cjs velog/2026-03-24-gabiseo-log.md
```

## validator 검사 항목
- 제목이 `# `로 시작하는지
- 해시태그 라인이 `#OpenClaw`로 시작하는지
- `## 한줄 요약` 섹션이 정확히 1개인지
- `## 한줄 요약` 내용이 비어 있지 않은지
- 고지 문구가 문서 최하단에 있는지
- `{{title}}`, `{{one_line_summary}}` 같은 placeholder가 남아 있지 않은지
- 필수 섹션이 모두 있는지
- fenced code block이 균형을 이루는지

## 작성 시 주의사항
- Markdown 예시 안에 또 다른 코드펜스를 넣어야 하면 바깥쪽 펜스는 4개 백틱 이상을 사용합니다.
- 예시 템플릿이나 예시 코드 내부 placeholder는 validator가 무시하도록 설계되어 있지만, 실제 본문에 placeholder가 남아 있으면 실패합니다.
- validator 실패 시 초안 파일은 남기되 git add/commit/push는 진행하지 않습니다.

## 관련 파일
- 템플릿: `posts/velog/TEMPLATE.md`
- 작성/검수 가이드: `posts/velog/POSTING-GUIDE.md`
- validator: `posts/scripts/validate-velog-draft.cjs`
- 실제 산출물: `posts/velog/YYYY-MM-DD-gabiseo-log.md`

## 운영 원칙
- 규칙을 바꿀 때는 템플릿만 수정하지 말고, 가이드/validator/cron 지시문까지 같이 맞춥니다.
- 모델이 바뀌어도 validator 기준은 유지합니다.
- 게시 품질 이슈는 모델 품질 문제와 구조/하네스 문제를 분리해서 다룹니다.
