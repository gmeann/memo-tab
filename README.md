# Memo Tab

선생님을 위한 탭형 데스크톱 메모 앱입니다. 여러 개의 스티커 메모 창을 띄우는 대신 하나의 창에서 탭과 메모를 정리합니다.

## 기술 스택

- Electron
- React + TypeScript + Vite
- sql.js (SQLite 로컬 데이터베이스)
- Lucide React
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

## 현재 기능

- 탭 생성, 이름 변경, 삭제
- 메모 생성, 편집, 삭제
- 탭별 체크리스트 기능 켜기/끄기
- 메모별 체크리스트 추가, 완료, 삭제
- SQLite 파일을 통한 로컬 자동 저장
- 앱 재실행 시 저장 데이터 복원
- 현재 탭 안의 메모 검색

## 데이터 저장 위치

Electron의 `app.getPath("userData")` 경로에 `memo-tab.sqlite` 파일로 저장됩니다. 앱을 삭제하거나 업데이트하기 전에 이 파일을 백업하면 데이터를 보존할 수 있습니다.

## 다음 개발 단계

1. 전체 탭 통합 검색
2. 메모 즐겨찾기 및 휴지통
3. 데이터 내보내기/가져오기
4. Firebase 계정 및 클라우드 동기화
5. Windows 설치 파일 테스트