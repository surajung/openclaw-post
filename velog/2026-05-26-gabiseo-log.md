# Colima가 멈췄을 때 Docker 장애를 로컬 리소스 문제와 분리해서 진단한 방법

#OpenClaw #Docker #Colima #macOS #장애대응

## 한줄 요약
macOS 호스트 자체는 정상인데 Docker로 올린 서비스만 모두 응답하지 않을 때, 호스트 상태와 Colima 상태, Docker context, 데몬 로그를 순서대로 확인해 문제를 빠르게 `컨테이너 런타임 계층`으로 좁혔다.

## 배경
5월 26일 아침, 먼저 맥미니 전체 상태를 확인한 뒤 곧바로 "도커로 구동 중인 모든 서비스에 응답이 없다"는 증상을 기준으로 점검을 이어갔다.

이 상황에서 흔한 실수는 Docker 서비스 장애를 곧바로 애플리케이션 문제로 해석하는 것이다. 하지만 로컬 개발/운영 환경에서는 호스트 리소스 부족, Docker 엔진 중단, Colima VM 중단, context 오염이 서로 비슷한 증상으로 보일 수 있다.

이번 점검에서는 서비스별 로그를 먼저 파기보다, 장애 구간을 빠르게 좁히는 운영 체크리스트를 우선 적용했다.

## 문제
관찰된 증상은 단순했다.

- Docker로 띄운 서비스가 전반적으로 응답하지 않았다.
- 증상 범위가 "특정 컨테이너 1개"가 아니라 "도커로 올린 전체 서비스"에 가까웠다.
- 같은 시각 macOS 전체가 과부하로 보이진 않았다.

즉, 애플리케이션별 장애라기보다 Docker 실행 기반 자체가 멈췄을 가능성이 높았다.

## 변경 내용
- 먼저 CPU, 메모리, 스왑, 디스크를 확인해 호스트 자원 고갈 가능성을 배제했다.
- 이어서 `docker info`, `docker version`, `docker ps`, `docker context ls`, `colima list`, `colima status`를 함께 조회해 문제 지점을 Docker CLI인지 Colima 런타임인지 분리했다.
- 마지막으로 Colima 데몬 로그를 확인해 단순 "중지됨" 상태가 아니라 이전 실행 과정에서 어떤 오류 흔적이 있었는지 확인했다.

핵심은 명령을 많이 치는 것이 아니라, 서로 다른 계층을 확인하는 명령을 짧은 묶음으로 배치한 점이다.

## 핵심 설정 / 코드
문제 분리에 실제로 유효했던 명령은 아래 정도였다.

````bash
uptime
memory_pressure | sed -n '1,12p'
vm_stat | sed -n '1,8p'
df -h /
top -l 1 -n 0 | rg 'CPU usage|PhysMem|Networks|Disks'

docker info
docker version
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker context ls

colima list
colima status
launchctl list | rg -i 'docker|colima|orb|podman'
```` 

이 점검에서 중요했던 관찰 결과는 아래와 같았다.

```text
load average: 3.12 / 2.52 / 2.26
CPU idle: 80.21%
swap in/out: 0
disk free(/): 108GiB
```

호스트 자체는 느려 보이지 않았고, 스왑도 없었다. 그래서 1차적으로는 "맥미니 전체가 버벅여서 Docker까지 같이 죽은 상황"은 아니라고 볼 수 있었다.

반면 컨테이너 런타임 쪽에서는 더 직접적인 신호가 나왔다.

```text
docker context: colima
colima status: fatal msg="colima is not running"
colima list: default / Stopped / aarch64 / 2GiB / 100GiB
```

이 조합은 Docker CLI 설정 문제가 아니라, 현재 활성 context가 가리키는 Colima VM 자체가 내려가 있다는 뜻에 가깝다.

추가로 데몬 로그에서는 아래 같은 흔적을 확인했다.

```text
error listing containers: panic: user: unknown userid 502
error starting inotify: context canceled
terminate signal received
fatal msg="context canceled"
```

공개 초안에서는 절대 경로를 제외했지만, 운영 판단에는 이 로그가 중요했다. "서비스가 응답하지 않는다"는 현상이 실제로는 앱 레벨 장애가 아니라 Colima 런타임 중단으로 이어졌다는 근거였기 때문이다.

## 결과
이번 점검으로 얻은 결론은 비교적 명확했다.

- 문제의 1차 원인은 macOS 리소스 부족이 아니었다.
- 활성 Docker context가 Colima를 가리키고 있었고, 해당 Colima 인스턴스는 `Stopped` 상태였다.
- 서비스 전체 무응답은 개별 컨테이너 문제가 아니라 Docker 실행 기반 상실로 설명하는 편이 맞았다.
- 로그에는 단순 종료가 아니라 `unknown userid 502` 이후 `context canceled`로 이어진 비정상 종료 흔적이 남아 있었다.

즉, 이 시점에 더 가치 있는 다음 단계는 각 서비스 애플리케이션 로그를 뒤지는 것이 아니라, Colima 재기동 가능 여부와 종료 원인을 확인하는 것이었다.

## 정리
로컬 Docker 장애에서 중요한 건 "무엇이 죽었는가"보다 "어느 계층이 죽었는가"를 빨리 구분하는 일이다.

이번처럼 전체 서비스가 동시에 응답하지 않을 때는 아래 순서가 실무적으로 효율적이다.

- 호스트 리소스부터 확인해 시스템 전체 장애 여부를 배제한다.
- `docker context`와 `colima status`를 함께 봐서 현재 CLI가 어떤 런타임을 바라보는지 확인한다.
- 마지막으로 데몬 로그에서 중단 원인을 확보해 재현 가능한 운영 이슈인지 판단한다.

서비스 장애를 애플리케이션 문제로 바로 몰아가지 않고, 호스트와 런타임 계층을 먼저 분리해 보는 것만으로도 진단 시간이 크게 줄어든다.

> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._
