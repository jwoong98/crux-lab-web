2026.11.06

# 크럭스랩 웹 - Cloudflare Workers 배포

AI-PM-Lab 히스토리와 독립된 크럭스랩 웹앱 빌드 사본입니다. 별도 GitHub 저장소로 push하고 Cloudflare Workers에 연결해 배포합니다. 소스 원본은 AI-PM-Lab 저장소의 `01_Projects/crux-lab/app/`입니다. 이 폴더의 루트는 Worker `crux-lab-web`(https://pastcrux.com)의 배포 사본으로 빌드 결과(`dist/`), 공개 Worker(`worker/`), 배포 설정(`wrangler.jsonc`)을 담고, `cms/`는 같은 저장소에 연결한 Worker `crux-lab-cms`(https://cms.pastcrux.com)의 배포 사본입니다(`cms/README.md`). 모두 `npm run sync:deploy`가 다시 쓰므로 여기서 직접 고치지 않습니다.

> 이 폴더와 `cms/`에는 일부러 `package.json`을 두지 않습니다. Cloudflare 빌드가 `package.json`을 찾으면 `npm install`을 실행하고, 생긴 `node_modules`까지 자산으로 스캔해 파일 크기 제한에 걸릴 수 있습니다(Brick Quest와 같은 이유).

## 폴더 구성

- `dist/`: `npm run build:deploy`의 웹 빌드 결과(정적 파일, 카드뉴스 `/climbing/` 포함). 직접 고치지 않습니다.
- `dist/app-update/`: 설치형 앱(APK)이 받는 앱 묶음 새 판(라이브 업데이트). `manifest.json`(판 번호, 최소 APK versionCode, 파일 목록과 SHA-256)과 `files/{sha256}`(내용 주소 파일, 이름이 내용의 SHA-256)입니다. `files/`의 이전 파일은 배포마다 남고 `manifest.json`만 바뀝니다. APK는 앱을 켜거나 다시 열 때 `https://pastcrux.com/app-update/manifest.json`을 읽고, 바뀐 파일만 받습니다.
- `worker/`: 공개 Worker(`index.mjs`, `kv-keys.mjs`). `/climbing`, `/climbing/*`, `/sitemap.xml`, `/robots.txt`, `/app-update/*`를 먼저 받습니다. `GUIDE_FROM_KV`가 `"false"`인 동안은 카드뉴스에 정적 자산을 그대로 주고, `"true"`면 Workers KV의 카드뉴스를 먼저 줍니다. `/app-update/*`는 스위치와 상관없이 정적 자산을 주되 `manifest.json`은 `Cache-Control: no-store`, `files/`는 1년 immutable로 주고, 없는 파일은 SPA의 `index.html`(200) 대신 404 no-store로 답합니다.
- `wrangler.jsonc`: Worker 이름 `crux-lab-web`, `main: worker/index.mjs`, 자산 폴더 `./dist`, SPA 대체(`not_found_handling: single-page-application`), KV 바인딩 `GUIDE_KV`, 스위치 `GUIDE_FROM_KV`와 `GUIDE_STATIC_FALLBACK`. 새로고침이나 직접 연 주소(예: `/log/new`)도 앱이 열립니다. KV ID는 sync-deploy가 `app/.env.local`의 `CF_GUIDE_KV_ID`에서 넣습니다.
- `README.md`: 이 문서.
- `.gitattributes`: `dist/app-update/** -text`. 앱 묶음 파일은 기기가 크기와 SHA-256으로 검사하므로 `git add`가 줄끝(CRLF를 LF로)을 바꾸지 않게 합니다. 소스 쪽 PC의 git은 `core.autocrlf=true`라, 이 줄이 없으면 CRLF가 든 파일(SVG, HTML, CSS 등)이 바뀌어 모든 기기가 그 판을 받지 않습니다. sync-deploy가 씁니다.
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
   npm run build:deploy
   npm run sync:deploy
   ```
   `build:deploy`는 웹 빌드(`npm run build`: `dist/`, `dist-cms/`)와 앱 묶음 빌드(`npm run build:bundle`: `dist-app/`, `dist-app-update/`)를 같은 빌드 번호로 만듭니다. 이제 배포 한 번이 설치된 APK에도 바로 들어갑니다.
   `sync:deploy`는 `dist/`의 `dist/assets/`, `dist/app-update/` 밖과 `worker/`, `cms/`의 빌드와 Worker 파일을 통째로 바꾸고(이전 파일 삭제), `dist/assets/`와 `dist/app-update/files/`의 이전 파일은 남깁니다(같은 이름은 새 빌드 것으로 덮음). 배포 전에 앱을 열어 둔 사용자가 옛 이름의 코드 파일을 계속 받게 하려는 것입니다. `dist/app-update/manifest.json`은 새 판으로 바꿉니다. 두 `wrangler.jsonc`, 두 README, `.gitattributes`도 씁니다. `.git`처럼 sync가 만들지 않은 것은 둡니다. git 명령은 실행하지 않습니다.
   다음 경우에는 아무것도 복사하지 않고 멈춥니다(종료 코드 1). 메시지대로 고친 뒤 `npm run build:deploy`부터 다시 합니다. 파일 수 상한 항목만 빌드 없이 `npm run sync:deploy`부터 다시 합니다.
   - 웹 빌드나 앱 묶음 JS에 Supabase 프로젝트 주소(`https://<프로젝트>.supabase.co`)와 공개 키가 없음: `app/.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 확인합니다.
   - `app/.env.local`에 `CF_GUIDE_KV_ID`나 Supabase 두 값이 없음, CMS 빌드(`dist-cms/index.html`)가 없음.
   - 앱 묶음(`dist-app-update/manifest.json`)이 없음, 목록의 파일이 없거나 크기나 SHA-256이 다름, 웹 빌드 번호(`dist/crux-build.json`, 배포하지 않음)가 앱 묶음 판 번호와 다름(`npm run build`나 `npm run build:app`만 다시 실행한 경우).
   - 앱 묶음 JS에 라이브 업데이트 컨트롤러(`CruxUpdate`)가 없음. 그 판은 기기에서 확정 신호를 보내지 않아 25초 뒤 이전 판으로 되돌려집니다.
   - 옮기거나 쓸 파일(앱 묶음 파일 포함)에 `sb_secret_` 키나 role이 service_role인 JWT가 있음. 메시지에는 파일 이름만 나옵니다.
   - 동기화 뒤 `dist/` 파일이 15,000개를 넘음(남긴 이전 파일 포함, Cloudflare 무료 한도 20,000개 전에 멈춤): 이 폴더의 `dist/assets/`와 `dist/app-update/files/`에서 옛 파일을 지웁니다. 꼭 남길 것은 지금 운영 중인 배포가 쓰는 파일(`dist/index.html`이 가리키는 파일과 그 파일들이 불러오는 파일, `dist/app-update/manifest.json`이 가리키는 파일)입니다. 그 밖의 옛 파일을 얼마나 남길지는 PM이 정하고, 지운 파일은 그 파일을 쓰던 배포 때 연 화면이 다시 받지 못합니다. 언제 더한 파일인지는 이 폴더에서 `git log --name-status -- dist/assets dist/app-update/files`로 봅니다. 그다음 빌드 없이 소스 저장소에서 `npm run sync:deploy`를 다시 실행하고 push합니다.
   - 그 밖의 경우는 소스 저장소 `app/README.md` 「배포」에 있습니다.
2. 이 폴더에서:
   ```bash
   git add -A
   git ls-files --eol -- dist/app-update | grep -v 'attr/-text'   # push 전 확인: 아무 줄도 나오지 않아야 합니다
   git commit -m "Update app build"
   git push
   ```
   `git ls-files --eol` 줄에서 한 줄이라도 나오면 commit과 push를 하지 않습니다. 그 파일은 `git add`가 줄끝을 바꿨을 수 있습니다. `.gitattributes`가 있는지 보고(없으면 소스 저장소에서 `npm run sync:deploy`를 다시 실행) `git add --renormalize dist/app-update`로 다시 담은 뒤 같은 확인을 합니다.
3. Cloudflare 대시보드의 두 Worker 배포 기록에서 성공을 확인하고 배포 주소를 새로고침해 봅니다.
4. 배포가 끝난 뒤 이번 배포가 더한 앱 묶음 파일을 운영 주소에서 받아 SHA-256을 이름과 비교합니다(Git Bash, 이 폴더). 아무 줄도 나오지 않아야 합니다. 나온 파일은 운영에서 내용이 달라 기기가 그 판을 받지 않으니, 원인을 고친 뒤 소스 저장소에서 `npm run build:deploy`부터 다시 배포합니다.
   ```bash
   for f in $(git diff --name-only --diff-filter=A HEAD~1 HEAD -- dist/app-update/files); do
     sha=${f##*/}
     [ "$(curl -fsS "https://pastcrux.com/app-update/files/$sha" | sha256sum | cut -c1-64)" = "$sha" ] || echo "다름: $sha"
   done
   ```

## 스위치와 되돌리기

스위치는 소스 `app/wrangler.jsonc`의 vars에서 바꿉니다. 이 폴더의 사본을 고치면 다음 sync에 덮어써집니다. 바꾼 뒤 소스에 커밋하고 빌드, sync, push합니다.

- `GUIDE_FROM_KV`(기본 `"false"`): `"false"`면 `/climbing` 응답이 정적 자산 그대로이고, `"true"`면 KV를 먼저 읽습니다(주소마다 60초 캐시). KV와 정적 본문 비교가 통과한 뒤에 켭니다. 되돌리기: `"false"`로 바꿔 push하면 약 60초 뒤 정적 자산이 나갑니다.
- `GUIDE_STATIC_FALLBACK`(기본 `"true"`): `"true"`면 KV에 없는 페이지와 KV 오류에 정적 자산을 주고, `"false"`면 404나 503을 줍니다. 정적 카드뉴스 HTML을 배포에서 뺄 때 `"false"`가 됩니다.
- 배포 전체 되돌리기: 되돌린 소스(AI-PM-Lab 커밋)로 다시 빌드(`npm run build:deploy`)해 `sync:deploy`와 push를 합니다. 이 저장소의 `git revert`나 Cloudflare 대시보드의 이전 버전 되돌리기는 쓰지 않습니다. 그 뒤 배포의 코드 파일이 빠져, 그 사이 새 화면을 연 사용자가 그 파일을 받지 못합니다. 다시 빌드한 앱 묶음은 판 번호(빌드 시각)가 더 커서 APK도 그 판을 받습니다. `git revert`로 옛 `manifest.json`을 되살리면 판 번호가 작아 APK가 받지 않습니다.
- Cloudflare는 무료 플랜 기준입니다. `/climbing/*` 요청은 그림과 `guide.css`까지 Worker 요청(하루 10만)으로 셉니다. `/app-update/*`도 Worker 요청입니다. APK가 켜지거나 다시 열릴 때마다 `manifest.json` 1회, 새 판이 있으면 바뀐 파일 수만큼 더합니다.

## Supabase

- 설치는 `app/supabase/schema.sql`을 Supabase SQL Editor에서 한 번 실행하는 것으로 끝납니다. 익명 로그인(Allow anonymous sign-ins)을 켜야 합니다. 로그인은 Google, 카카오 공급자와 Manual linking을 켭니다.
- Supabase 무료 플랜의 휴면을 막으려고 Brick Quest처럼 UptimeRobot이 `https://<프로젝트>.supabase.co/rest/v1/`을 하루 1회 호출합니다.
