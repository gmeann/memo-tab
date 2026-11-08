# Memo Tab

선생님을 위한 탭형 데스크톱 메모 앱입니다. 여러 개의 스티커 메모 창을 띄우는 대신 하나의 창에서 탭과 메모를 정리하는 것을 목표로 합니다.

## 기술 스택

- Electron
- React + TypeScript + Vite
- Lucide React
- SQLite 로컬 저장 (다음 개발 단계)
- Firebase 동기화 (후속 단계)

## 개발 환경

- Node.js 20 이상 권장
- npm

```bash
npm install
npm run dev
```

## Windows 설치 파일 만들기

```bash
npm run dist:win
```

설치 파일은 `release` 폴더에 생성됩니다.

## 개발 로드맵

1. 기본 데스크톱 창과 화면 레이아웃
2. 탭 생성 및 관리
3. 메모 생성·수정·삭제 및 자동 저장
4. SQLite 로컬 데이터베이스
5. 탭별 투두리스트 켜기/끄기
6. 전체 메모 검색
7. Windows 설치 파일 패키징
8. Firebase 계정 및 클라우드 동기화

## 현재 상태

초기 UI 골격 단계입니다. 현재 화면의 메모는 앱 실행 중 메모리에서만 유지되며, 아직 디스크에 저장되지 않습니다. 다음 단계에서 SQLite와 자동 저장을 연결합니다.