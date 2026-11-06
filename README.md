2026.11.06

# 크럭스랩 웹 - Cloudflare Workers 배포

AI-PM-Lab 히스토리와 독립된 크럭스랩 웹앱 빌드 사본입니다. 별도 GitHub 저장소로 push하고 Cloudflare Workers(정적 자산)에 연결해 배포합니다. 소스 원본은 AI-PM-Lab 저장소의 `01_Projects/crux-lab/app/`이며, 이 폴더는 그 빌드 결과(`dist/`)와 배포 설정(`wrangler.jsonc`)만 담습니다.

> 이 폴더에는 일부러 `package.json`을 두지 않습니다. Cloudflare 빌드가 `package.json`을 찾으면 `npm install`을 실행하고, 생긴 `node_modules`까지 자산으로 스캔해 파일 크기 제한에 걸릴 수 있습니다(Brick Quest와 같은 이유).

## 폴더 구성

- `dist/`: `npm run build` 결과(정적 파일). 직접 고치지 않습니다.
- `wrangler.jsonc`: Worker 이름 `crux-lab-web`, 자산 폴더 `./dist`, SPA 대체(`not_found_handling: single-page-application`). 새로고침이나 직접 연 주소(예: `/log/new`)도 앱이 열립니다.
- `README.md`: 이 문서.

## 데이터 위치

- 모든 기록은 Supabase에 익명 로그인 사용자별로 저장됩니다(사용자별 RLS, 로그인 화면 없음). 이 폴더와 Workers에는 기록이 없습니다.
- 브라우저에는 로그인 토큰만 남습니다. 앱 데이터를 지우면 새 사용자가 되어 옛 기록을 앱에서 열 수 없습니다. 되살리는 방법은 소스 저장소 `app/README.md`의 「익명 로그인의 위험」에 있습니다.
- 기록을 따로 보관하는 방법은 앱의 기록 내보내기(플래너 탭 > 기록 내보내기, CSV ZIP 또는 JSON)입니다. 가져오기 기능은 없습니다.
- `dist/`의 JS에는 Supabase 주소와 공개 키(anon key)가 들어 있습니다. 공개해도 되는 키이며 RLS가 각 사용자의 행을 지킵니다. service_role 키는 넣지 않습니다.

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
   빌드에 Supabase 프로젝트 주소(`https://<프로젝트>.supabase.co`)와 공개 키가 없으면 아무것도 복사하지 않고 멈춥니다. 그때는 `app/.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 확인하고 `npm run build`부터 다시 합니다.
2. 이 폴더에서:
   ```bash
   git add -A
   git commit -m "Update app build"
   git push
   ```
3. Cloudflare 대시보드의 배포 기록에서 성공을 확인하고 배포 주소를 새로고침해 봅니다.

## Supabase

- 설치는 `app/supabase/schema.sql`을 Supabase SQL Editor에서 한 번 실행하는 것으로 끝납니다. 익명 로그인(Allow anonymous sign-ins)을 켜야 합니다.
- Supabase 무료 플랜의 휴면을 막으려고 Brick Quest처럼 UptimeRobot이 `https://<프로젝트>.supabase.co/rest/v1/`을 하루 1회 호출합니다.
