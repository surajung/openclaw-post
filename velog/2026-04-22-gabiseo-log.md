# OpenClaw 워크스페이스를 Obsidian Vault로 정리하면서 Git 동기화 전략을 보수적으로 잡은 이유

#OpenClaw #Obsidian #Git #워크스페이스 #문서화

## 한줄 요약
OpenClaw 워크스페이스를 Obsidian Vault로 바로 활용할 수 있게 구조와 가이드를 정리하되, 운영 문서와 자동 생성 파일이 섞여 있는 특성을 고려해 Git 자동 동기화는 공격적으로 켜지 않고 단계적으로 설계했다.

## 배경
OpenClaw 워크스페이스에는 단순 메모만 있는 것이 아니라, 에이전트 메모리 문서, 자동 생성되는 Velog 초안, 운영 문서가 함께 들어 있다.

이런 구조에서는 Obsidian을 바로 붙이는 것 자체는 어렵지 않지만, 폴더 역할이 섞여 있으면 탐색 경험이 복잡해지고 Git 자동 동기화까지 곧바로 켜는 순간 충돌 가능성이 커진다.

이번 작업에서는 두 가지를 같이 정리했다.

1. 워크스페이스를 Obsidian에서 보기 좋은 Vault 구조로 문서화
2. Git 기반 동기화를 바로 자동화하지 않고, 단계적으로 도입하는 운영 원칙 정리

## 문제
처음 상태에서 바로 부딪히는 문제는 아래와 같았다.

- 어떤 폴더를 자주 보고 어떤 폴더를 숨겨야 할지 기준이 없다.
- 개인 메모와 에이전트 운영 문서가 한 저장소 안에 공존한다.
- `push on save` 같은 자동화 옵션을 성급하게 켜면 충돌 원인 파악이 어려워진다.
- Daily Notes, Templates, Inbox 같은 기본 루틴이 정리되지 않으면 Vault는 금방 산만해진다.

특히 이 워크스페이스는 일반 노트 저장소가 아니라, 운영 중인 AI 비서의 기억과 산출물까지 함께 관리하는 공간이라는 점이 핵심이었다.

## 변경 내용
이번에 추가한 핵심 산출물은 다음과 같다.

- `VAULT_GUIDE.md`
  - 워크스페이스를 Obsidian Vault로 사용할 때의 핵심 폴더 역할 정리
- `docs/obsidian-setup.md`
  - Obsidian에서 자주 볼 폴더, 숨겨도 되는 폴더, Daily Notes / Templates 권장 설정 정리
- `docs/obsidian-git-strategy.md`
  - Git 자동 동기화 전략을 2단계로 나눠 보수적으로 도입하는 기준 정리
- `notes/` 하위 기본 구조와 템플릿
  - `inbox`, `daily`, `projects`, `reference`, `study`
  - `daily-note.md`, `note-basic.md`, `project-note.md`

핵심은 "Vault 사용성 정리"와 "동기화 정책 분리"였다.

Vault 구조는 명확하게 잡되, Git 자동화는 바로 강하게 걸지 않는 방향으로 정리했다.

## 핵심 설정 / 코드
문서화한 Git 동기화 전략의 핵심은 2단계 접근이다.

````markdown
## 현실적인 2단계 전략

### 1단계, 로컬 vault 운영 안정화
- `notes/`에 개인 메모 작성
- `memory/`, `posts/velog/` 읽기
- 일일 메모 루틴 정착

### 2단계, Git plugin 적용
- Pull on startup: On
- Push on save: Off
- Auto pull interval: Off 또는 길게
- Auto push interval: Off 또는 길게
- Commit after stop editing: On
````

Obsidian 측 권장 설정도 사용 빈도 기준으로 나눴다.

````markdown
## 자주 볼 폴더
- `notes/`
- `memory/`
- `posts/velog/`

## 평소 무시해도 되는 폴더
- `node_modules/`
- `.npm-cache/`
- `state/`
- `.git/`
- `.openclaw/`
````

또한 Daily Notes와 Templates가 바로 작동하도록 기본 위치 규칙도 함께 정리했다.

```yaml
Daily notes:
  new_file_location: notes/daily
  date_format: YYYY-MM-DD
  template: templates/daily-note.md

Templates:
  folder: templates
```

## 결과
정리 이후 얻은 효과는 명확하다.

- OpenClaw 워크스페이스를 Obsidian에서 바로 탐색할 수 있는 기준이 생겼다.
- 개인 메모와 운영 문서의 경계를 문서 수준에서 먼저 분리했다.
- Git 동기화는 "일단 자동화"가 아니라, 충돌 비용을 감당할 수 있을 때 확장하는 방식으로 정리했다.
- 향후 모바일이나 다중 기기 사용으로 확장할 때도 기준 문서가 남는다.

즉, 기능 추가보다 운영 안정성을 먼저 확보하는 방향의 정리였다.

## 정리
Obsidian과 Git을 붙이는 일 자체는 쉽지만, 운영 중인 워크스페이스에서는 "무엇을 자동화할지"보다 "어디까지 자동화하지 않을지"를 먼저 정하는 편이 안전하다.

이번 작업은 단순한 폴더 정리가 아니라, AI 운영 문서와 개인 노트가 공존하는 저장소를 사람이 다루기 쉬운 Vault로 바꾸고, 이후의 동기화 정책까지 미리 설계한 작업에 가까웠다.

특히 `push on save` 같은 옵션은 편해 보여도, 기억 문서와 자동 생성 초안이 함께 움직이는 환경에서는 초반 기본값으로 두기 어렵다. 먼저 구조를 안정화하고, 그다음에 자동화를 늘리는 순서가 더 실용적이다.

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._