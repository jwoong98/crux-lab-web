2026.11.06

# 크럭스랩 웹 - Cloudflare Workers 배포

AI-PM-Lab 히스토리와 독립된 크럭스랩 웹앱 빌드 사본입니다. 별도 GitHub 저장소로 push하고 Cloudflare Workers에 연결해 배포합니다. 소스 원본은 AI-PM-Lab 저장소의 `01_Projects/crux-lab/app/`입니다. 이 폴더의 루트는 Worker `crux-lab-web`(https://pastcrux.com)의 배포 사본으로 빌드 결과(`dist/`), 공개 Worker(`worker/`), 배포 설정(`wrangler.jsonc`)을 담고, `cms/`는 같은 저장소에 연결한 Worker `crux-lab-cms`(https://cms.pastcrux.com)의 배포 사본입니다(`cms/README.md`). 모두 `npm run sync:deploy`가 다시 쓰므로 여기서 직접 고치지 않습니다.

> 이 폴더와 `cms/`에는 일부러 `package.json`을 두지 않습니다. Cloudflare 빌드가 `package.json`을 찾으면 `npm install`을 실행하고, 생긴 `node_modules`까지 자산으로 스캔해 파일 크기 제한에 걸릴 수 있습니다(Brick Quest와 같은 이유).

## 폴더 구성

- `dist/`: `npm run build` 결과(정적 파일, 카드뉴스 `/climbing/` 포함). 직접 고치지 않습니다.
- `worker/`: 공개 Worker(`index.mjs`, `kv-keys.mjs`). `/climbing`, `/climbing/*`, `/sitemap.xml`, `/robots.txt`를 먼저 받습니다. `GUIDE_FROM_KV`가 `"false"`인 동안은 정적 자산을 그대로 주고, `"true"`면 Workers KV의 카드뉴스를 먼저 줍니다.
- `wrangler.jsonc`: Worker 이름 `crux-lab-web`, `main: worker/index.mjs`, 자산 폴더 `./dist`, SPA 대체(`not_found_handling: single-page-application`), KV 바인딩 `GUIDE_KV`, 스위치 `GUIDE_FROM_KV`와 `GUIDE_STATIC_FALLBACK`. 새로고침이나 직접 연 주소(예: `/log/new`)도 앱이 열립니다. KV ID는 sync-deploy가 `app/.env.local`의 `CF_GUIDE_KV_ID`에서 넣습니다.
- `README.md`: 이 문서.
- `cms/`: CMS Worker의 배포 사본. 구성과 설정은 `cms/README.md`에 있습니다.

## 데이터 위치

- 모든 기록은 Supabase에 사용자별로 저장됩니다(사용자별 RLS). 가입 없이 익명으로 시작하고, Google이나 카카오로 로그인하면 같은 계정으로 다른 기기에서도 기록을 엽니다. 이 폴더와 Workers에는 기록이 없습니다.
- 브라우저에는 로그인 토큰만 남습니다. 로그인하지 않은 채 앱 데이터를 지우면 새 사용자가 되어 옛 기록을 앱에서 열 수 없습니다. 되살리는 방법은 소스 저장소 `app/README.md`의 「익명 로그인의 위험」에 있습니다.
- 기록을 따로 보관하는 방법은 앱의 기록 내보내기(플래너 탭 > 기록 내보내기, CSV ZIP 또는 JSON)입니다. 가져오기 기능은 없습니다.
- Workers KV 이름공간 `crux-lab-guide`에는 CMS가 게시한 공개 카드뉴스 페이지, sitemap, 그림만 있습니다.
- `dist/`의 JS에는 Supabase 주소와 공개 키(anon key)가 들어 있습니다. 공개해도 되는 키이며 RLS가 각 사용자의 행을 지킵니다. service_role 키와 `sb_secret_` 키는 넣지 않고, sync-deploy가 옮길 파일에서 찾으면 복사하지 않고 멈춥니다.

## 최초 1회 설정 (순서대로)

### 1. GitHub 저장소

1. 배포 저장소는 https://github.com/jwoong98/crux-lab-web 이고, Cloudflare 연결에 필요해 Public입니다. 그래서 이 저장소에는 비밀 값을 절대 두지 않습니다(DEC-010). service_role 키, `sb_secret_` 키, OAuth 클라이언트 시크릿을 넣지 않고, sync-deploy는 비밀 키를 찾으면 복사하지 않고 멈춥니다.
2. 처음 한 번 이 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git branch -M main
   git remote add origin https://github.com/jwoong98/crux-lab-web.git
   git push -u origin main
   ```

### 2. Cloudflare Workers 연결

1. https://dash.cloudflare.com 에 로그인합니다(Brick Quest와 같은 계정이면 `*.luglee.workers.dev` 하위 주소를 씁니다).
2. **Workers & Pages > Create > Import a repository**에서 위 GitHub 저장소를 고릅니다.
3. 빌드 설정: Build command는 비워 두고, Deploy command는 `npx wrangler deploy`(기본값), 루트 폴더는 `/`입니다. 설정은 `wrangler.jsonc`가 정합니다.
   - KV 이름공간 `crux-lab-guide`가 먼저 있어야 합니다. 만든 뒤 그 ID를 `app/.env.local`의 `CF_GUIDE_KV_ID`에 넣고 sync-deploy를 다시 실행하면 `wrangler.jsonc`에 들어갑니다.
4. 배포가 끝나면 무료 주소가 생깁니다. 예상 주소: `https://crux-lab-web.luglee.workers.dev/`. Worker 이름은 `wrangler.jsonc`의 `name`(`crux-lab-web`)과 같아야 합니다.
5. 지정 주소: 이 Worker의 **Settings > Domains & Routes > Add > Custom domain**에 `pastcrux.com`을 넣습니다. 도메인은 2026-11-06 Cloudflare Registrar에서 샀고 네임서버가 이미 Cloudflare라 DNS 레코드와 인증서가 자동으로 만들어집니다. `www.pastcrux.com`도 쓰려면 같은 방법으로 하나 더 넣습니다.
6. 이후 `main`에 push할 때마다 자동으로 다시 배포됩니다.
7. CMS Worker는 같은 저장소를 루트 폴더 `cms`로 한 번 더 연결합니다(`cms/README.md`).

## 앱을 고친 뒤 반영하는 절차

1. AI-PM-Lab의 `01_Projects/crux-lab/app/`에서:
   ```bash
   npm test
   npm run build
   npm run sync:deploy
   ```
   `sync:deploy`는 `dist/`의 `dist/assets/` 밖과 `worker/`, `cms/`의 빌드와 Worker 파일을 통째로 바꾸고(이전 파일 삭제), `dist/assets/`의 이전 파일은 남깁니다(같은 이름은 새 빌드 것으로 덮음). 배포 전에 앱을 열어 둔 사용자가 옛 이름의 코드 파일을 계속 받게 하려는 것입니다. 두 `wrangler.jsonc`와 두 README도 씁니다. `.git`처럼 sync가 만들지 않은 것은 둡니다. git 명령은 실행하지 않습니다.
   다음 경우에는 아무것도 복사하지 않고 멈춥니다(종료 코드 1). 메시지대로 고친 뒤 `npm run build`부터 다시 합니다. 파일 수 상한 항목만 빌드 없이 `npm run sync:deploy`부터 다시 합니다.
   - 빌드에 Supabase 프로젝트 주소(`https://<프로젝트>.supabase.co`)와 공개 키가 없음: `app/.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 확인합니다.
   - `app/.env.local`에 `CF_GUIDE_KV_ID`나 Supabase 두 값이 없음, CMS 빌드(`dist-cms/index.html`)가 없음.
   - 옮기거나 쓸 파일에 `sb_secret_` 키나 role이 service_role인 JWT가 있음. 메시지에는 파일 이름만 나옵니다.
   - 동기화 뒤 `dist/` 파일이 15,000개를 넘음(남긴 이전 파일 포함, Cloudflare 무료 한도 20,000개 전에 멈춤): 이 폴더의 `dist/assets/`에서 옛 파일을 지웁니다. 꼭 남길 것은 지금 운영 중인 배포가 쓰는 파일(`dist/index.html`이 가리키는 파일과 그 파일들이 불러오는 파일)입니다. 그 밖의 옛 파일을 얼마나 남길지는 PM이 정하고, 지운 파일은 그 파일을 쓰던 배포 때 연 화면이 다시 받지 못합니다. 언제 더한 파일인지는 이 폴더에서 `git log --name-status -- dist/assets`로 봅니다. 그다음 빌드 없이 소스 저장소에서 `npm run sync:deploy`를 다시 실행하고 push합니다.
   - 그 밖의 경우는 소스 저장소 `app/README.md` 「배포」에 있습니다.
2. 이 폴더에서:
   ```bash
   git add -A
   git commit -m "Update app build"
   git push
   ```
3. Cloudflare 대시보드의 두 Worker 배포 기록에서 성공을 확인하고 배포 주소를 새로고침해 봅니다.

## 스위치와 되돌리기

스위치는 소스 `app/wrangler.jsonc`의 vars에서 바꿉니다. 이 폴더의 사본을 고치면 다음 sync에 덮어써집니다. 바꾼 뒤 소스에 커밋하고 빌드, sync, push합니다.

- `GUIDE_FROM_KV`(기본 `"false"`): `"false"`면 `/climbing` 응답이 정적 자산 그대로이고, `"true"`면 KV를 먼저 읽습니다(주소마다 60초 캐시). KV와 정적 본문 비교가 통과한 뒤에 켭니다. 되돌리기: `"false"`로 바꿔 push하면 약 60초 뒤 정적 자산이 나갑니다.
- `GUIDE_STATIC_FALLBACK`(기본 `"true"`): `"true"`면 KV에 없는 페이지와 KV 오류에 정적 자산을 주고, `"false"`면 404나 503을 줍니다. 정적 카드뉴스 HTML을 배포에서 뺄 때 `"false"`가 됩니다.
- 배포 전체 되돌리기: 되돌린 소스(AI-PM-Lab 커밋)로 다시 빌드해 `sync:deploy`와 push를 합니다. 이 저장소의 `git revert`나 Cloudflare 대시보드의 이전 버전 되돌리기는 쓰지 않습니다. 그 뒤 배포의 코드 파일이 빠져, 그 사이 새 화면을 연 사용자가 그 파일을 받지 못합니다.
- Cloudflare는 무료 플랜 기준입니다. `/climbing/*` 요청은 그림과 `guide.css`까지 Worker 요청(하루 10만)으로 셉니다.

## Supabase

- 설치는 `app/supabase/schema.sql`을 Supabase SQL Editor에서 한 번 실행하는 것으로 끝납니다. 익명 로그인(Allow anonymous sign-ins)을 켜야 합니다. 로그인은 Google, 카카오 공급자와 Manual linking을 켭니다.
- Supabase 무료 플랜의 휴면을 막으려고 Brick Quest처럼 UptimeRobot이 `https://<프로젝트>.supabase.co/rest/v1/`을 하루 1회 호출합니다.
