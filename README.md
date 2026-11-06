2026.11.06

# 크럭스랩 웹 - Cloudflare Workers 배포

AI-PM-Lab 히스토리와 독립된 크럭스랩 웹앱 빌드 사본입니다. 별도 GitHub 저장소로 push하고 Cloudflare Workers(정적 자산)에 연결해 배포합니다. 소스 원본은 AI-PM-Lab 저장소의 `01_Projects/crux-lab/app/`이며, 이 폴더는 그 빌드 결과(`dist/`)와 배포 설정(`wrangler.jsonc`)만 담습니다.

> 이 폴더에는 일부러 `package.json`을 두지 않습니다. Cloudflare 빌드가 `package.json`을 찾으면 `npm install`을 실행하고, 생긴 `node_modules`까지 자산으로 스캔해 파일 크기 제한에 걸릴 수 있습니다(Brick Quest와 같은 이유).

## 폴더 구성

- `dist/`: `npm run build` 결과(정적 파일). 직접 고치지 않습니다.
- `wrangler.jsonc`: Worker 이름 `crux-lab-web`, 자산 폴더 `./dist`, SPA 대체(`not_found_handling: single-page-application`). 새로고침이나 직접 연 주소(예: `/log/new`)도 앱이 열립니다.
- `README.md`: 이 문서.

## 데이터 위치

- 모든 기록은 사용자 기기의 브라우저 저장소(IndexedDB)에만 저장됩니다. 서버와 DB는 쓰지 않습니다.
- 기록을 기기 밖에 보관하는 방법은 앱의 기록 내보내기(플래너 탭 > 기록 내보내기, CSV ZIP 또는 JSON)입니다. 가져오기 기능은 없습니다.
- 앱은 첫 실행 때 브라우저에 저장소를 지우지 말아 달라고 요청합니다(`navigator.storage.persist()`). 허락 여부는 브라우저가 정합니다.

## 최초 1회 설정 (순서대로)

### 1. GitHub 저장소

1. GitHub에서 새 빈 저장소를 Private으로 만듭니다(README·license 없이). 예: `crux-lab-web`.
2. 이 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git branch -M main
   git remote add origin https://github.com/<계정>/crux-lab-web.git
   git push -u origin main
   ```

### 2. Cloudflare Workers 연결

1. https://dash.cloudflare.com 에 로그인합니다(Brick Quest와 같은 계정이면 `*.luglee.workers.dev` 하위 주소를 씁니다).
2. **Workers & Pages > Create > Import a repository**에서 위 GitHub 저장소를 고릅니다.
3. 빌드 설정: Build command는 비워 두고, Deploy command는 `npx wrangler deploy`(기본값), 루트 폴더는 `/`입니다. 설정은 `wrangler.jsonc`가 정합니다.
4. 배포가 끝나면 주소가 생깁니다. 예상 주소: `https://crux-lab-web.luglee.workers.dev/`
5. 이후 `main`에 push할 때마다 자동으로 다시 배포됩니다.

## 앱을 고친 뒤 반영하는 절차

1. AI-PM-Lab의 `01_Projects/crux-lab/app/`에서:
   ```bash
   npm test
   npm run build
   npm run sync:deploy
   ```
   `sync:deploy`는 `dist/`를 통째로 바꾸고(이전 빌드 파일 삭제) `wrangler.jsonc`와 이 README를 복사합니다. git 명령은 실행하지 않습니다.
2. 이 폴더에서:
   ```bash
   git add -A
   git commit -m "Update app build"
   git push
   ```
3. Cloudflare 대시보드의 배포 기록에서 성공을 확인하고 배포 주소를 새로고침해 봅니다.

## 나중에 계정 동기화를 붙일 때

- Supabase를 쓰게 되면 `app/supabase/schema.sql`(아직 연결하지 않은 초안, 사용자별 RLS)을 기준으로 시작합니다. Brick Quest처럼 anon 키로 공개 읽기 정책을 두면 개인 기록이 남에게 보이므로 그 방식은 쓰지 않습니다.
- Supabase 무료 플랜의 휴면을 막으려면 Brick Quest처럼 UptimeRobot으로 하루 1회 REST를 호출합니다. 정적 호스팅(Workers)만 쓸 때는 휴면이 없어 필요 없습니다.
