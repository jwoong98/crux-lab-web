2026.11.14

# 크럭스랩 CMS - Cloudflare Workers 배포

크럭스랩 CMS(https://cms.pastcrux.com)의 배포 사본입니다. 공개 웹앱과 같은 배포 저장소의 `cms/` 폴더이고, Worker `crux-lab-cms`가 이 폴더를 루트로 배포합니다. 소스 원본은 AI-PM-Lab 저장소의 `01_Projects/crux-lab/app/`이며 `npm run sync:deploy`가 이 폴더를 다시 씁니다. 여기서 직접 고치지 않습니다.

> 이 폴더에도 `package.json`을 두지 않습니다. 이유는 저장소 루트 `README.md`와 같습니다.

## 폴더 구성

- `dist-cms/`: CMS 빌드 결과(정적 화면, `_headers`, `robots.txt`).
- `cms-worker/`: CMS Worker. `POST /api/publish`(게시, 숨김, 모음 게시, 다시 반영)만 받고, 나머지 주소는 `dist-cms`의 정적 화면과 SPA 대체가 답합니다.
- `worker/kv-keys.mjs`: 공개 Worker와 같은 KV 키 함수. CMS Worker가 불러옵니다.
- `scripts/climbing-guide/`: 카드뉴스 검사와 렌더 순수 모듈 중 CMS Worker가 불러오는 것만 있습니다.
- `wrangler.jsonc`: Worker 이름 `crux-lab-cms`, `main: cms-worker/index.mjs`, 자산 `./dist-cms`와 SPA 대체, `run_worker_first: ["/api/*"]`, KV 바인딩 `GUIDE_KV`(공개 Worker와 같은 이름공간), vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PRIVACY_PUBLISHED`, Custom domain `cms.pastcrux.com`, workers.dev와 미리보기 주소 꺼짐(`workers_dev`, `preview_urls` false). 경로는 이 폴더 기준입니다. KV ID와 Supabase 두 값은 sync-deploy가 `app/.env.local`에서 넣습니다.
- `README.md`: 이 문서.

## 데이터와 권한

- CMS에는 기록이 없습니다. 카드뉴스 원천은 Supabase 테이블(tb_guide_page, tb_guide_hub, tb_guide_revision)과 Storage 버킷 guide-images에 있습니다. 게시하면 CMS Worker가 검사와 렌더를 통과한 페이지를 Workers KV `crux-lab-guide`에 쓰고, 공개 Worker는 그 KV를 읽기만 합니다.
- 관리자는 Supabase의 tb_admin 행으로 정합니다. CMS Worker는 secret을 쓰지 않고 관리자 본인의 로그인 토큰으로 Supabase를 부릅니다. Supabase 주소와 anon 키는 공개 값입니다. service_role 키와 `sb_secret_` 키는 이 폴더 어디에도 없고, sync-deploy가 찾으면 복사하지 않고 멈춥니다.
- 검색 노출을 막습니다: 모든 응답에 `X-Robots-Tag: noindex, nofollow`, `robots.txt`는 `Disallow: /`, GA 태그 없음, 공개 사이트에 CMS 링크 없음.

## 최초 1회 설정 (순서대로)

1. KV 이름공간과 앱 쪽 준비(첫 배포 전): Cloudflare 대시보드의 **Storage & Databases > KV**에서 이름공간 `crux-lab-guide`를 만들고(공개 Worker와 같은 이름공간, 이미 있으면 그것을 씀), 그 ID를 `app/.env.local`의 `CF_GUIDE_KV_ID`에 넣습니다. 그다음 `npm run build`와 `npm run sync:deploy` 뒤 이 폴더까지 저장소에 push합니다. 이 값이 없으면 sync-deploy가 멈춥니다.
2. https://dash.cloudflare.com 의 **Workers & Pages > Create > Import a repository**에서 공개 웹앱과 같은 GitHub 저장소를 고릅니다.
3. 빌드 설정: Worker 이름 `crux-lab-cms`, 루트 폴더 `cms`, Build command는 비워 두고, Deploy command는 `npx wrangler deploy`(기본값)입니다. 설정은 이 폴더의 `wrangler.jsonc`가 정합니다.
4. 배포가 끝나면 이 Worker의 **Settings > Domains & Routes**에 Custom domain `cms.pastcrux.com`이 있는지 확인합니다(`wrangler.jsonc`의 routes가 만듭니다). workers.dev 주소와 미리보기 주소는 `wrangler.jsonc`에서 꺼져 있습니다. 결제나 플랜 화면이 나오면 PM이 정합니다.
5. Cloudflare Access: Custom domain을 확인한 바로 뒤, 누구도 로그인하기 전에 Zero Trust의 **Access > Applications**에서 `cms.pastcrux.com` 전체(경로 없음)를 덮는 Self-hosted 애플리케이션을 만듭니다. 정책은 Allow 하나이고 허용은 PM 이메일 하나, 로그인 방법은 일회용 코드(One-time PIN)입니다. 이 애플리케이션을 만들기 전에는 로그인 화면과 `/api/publish`가 누구에게나 열려 있습니다(관리자 확인은 Supabase가 따로 합니다).
6. https://cms.pastcrux.com 을 열어 Access 코드 확인 화면이 먼저 나오는지, 확인 뒤 로그인 화면, 응답 헤더의 noindex, `/robots.txt`의 `Disallow: /`를 확인합니다.
7. Supabase 이메일 가입 확인: **Authentication > Sign In / Providers**에서 아무나 이메일과 비밀번호로 가입할 수 있는지 확인하고, 이메일 가입만 막을 수 있으면 막습니다. 관리자 로그인이 이메일과 비밀번호라 이메일 공급자는 켜 둡니다. 가입 전체를 끄면 앱의 익명 로그인과 Google, 카카오 첫 로그인까지 막힐 수 있으니 그 설정은 바꾸기 전에 확인합니다. 이메일로 가입한 계정은 tb_admin 행이 없어 CMS를 쓰지 못합니다.
8. 관리자: PM이 Supabase **Authentication > Users**에서 관리자 계정(이메일과 비밀번호, 이메일 확인 없이 바로 확인된 계정)을 직접 만들고 비밀번호를 정합니다. 이메일은 앱에서 Google이나 카카오로 로그인할 때 쓰는 이메일과 다른 것을 씁니다. 같은 이메일이면 앱 로그인이 관리자 사용자에 연결되고, 앱의 기록과 계정 삭제는 ADMIN_ACCOUNT로 거부됩니다. 그 사용자 id로 SQL Editor에서 `insert into tb_admin (user_id) values ('<id>');`를 실행합니다. CMS 로그인 화면에서 그 이메일과 비밀번호로 로그인합니다. CMS에는 소셜 로그인, 가입, 비밀번호 찾기 화면이 없습니다.
9. CMS 카드뉴스 목록에서 다시 반영을 실행해 KV를 채웁니다. 반영 상태가 DONE이면 끝입니다.

## 고친 뒤 반영하는 절차

저장소 루트 `README.md`의 「앱을 고친 뒤 반영하는 절차」와 같습니다. 한 번 push하면 두 Worker가 함께 다시 배포됩니다.

## 스위치와 되돌리기

- `PRIVACY_PUBLISHED`(`wrangler.jsonc` vars, 기본 `"false"`): `"true"`면 게시하는 카드뉴스 페이지 푸터에 처리방침 링크(/privacy/)가 들어갑니다. 처리방침을 게시한 뒤(O-24) 정적 빌드의 같은 이름 스위치와 함께 켭니다. `PRIVACY_PUBLISHED=true npm run guide:build`로 정적 카드뉴스 HTML을 다시 만들고, 같은 커밋에서 소스 `app/wrangler.cms.jsonc`의 값을 바꾼 뒤 빌드, sync, push하고 CMS에서 다시 반영합니다(앱 `README.md` 배포 순서 9단계). 되돌릴 때는 두 쪽을 함께 끄고 같은 절차를 밟습니다.
- CMS 배포가 잘못되면 되돌린 소스(AI-PM-Lab 커밋)로 다시 빌드해 `sync:deploy`와 push를 합니다. 이 저장소의 `git revert`는 쓰지 않습니다. 같은 저장소라 루트의 공개 웹앱 배포 사본까지 되돌아가 그 뒤 배포의 웹 코드 파일이 빠지고, 그 사이 새 화면을 연 사용자가 그 파일을 받지 못합니다. 공개 카드뉴스가 잘못 나가면 공개 Worker의 `GUIDE_FROM_KV`를 `"false"`로 되돌립니다(저장소 루트 `README.md` 「스위치와 되돌리기」).

## 무료 플랜 한도

- Cloudflare 무료 플랜의 요청당 CPU 10ms와 하위 요청 50개에 맞추려고, 게시는 바뀔 수 있는 페이지만 렌더하고 다시 반영은 여러 요청으로 나눕니다. Worker를 불러올 때 검사와 렌더를 작은 자료로 한 번 돌려 첫 요청의 CPU를 줄입니다.
- 배포 뒤 Cloudflare 대시보드의 crux-lab-cms 화면에서 게시 요청의 CPU 시간과 1102 오류를 확인합니다. 무료 플랜을 넘으면 Workers Paid(월 5달러)로 올릴지는 PM이 정합니다.
