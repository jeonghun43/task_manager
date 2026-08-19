# 기기 간 동기화 설정

노트북·폰 어디서 열어도 같은 일정이 보이게 만드는 설정입니다.
코드는 이미 다 들어가 있고, **계정을 만들고 키를 넣는 부분만** 직접 하시면 됩니다.

설정하지 않아도 앱은 지금처럼 동작합니다 — 이 값들이 없으면 동기화 메뉴 자체가 나타나지 않고
브라우저 안에만 저장됩니다.

---

## 1. Supabase 프로젝트 만들기 (5분)

1. <https://supabase.com> 가입 → **New project**
2. Region 은 **Northeast Asia (Seoul)** 로 고르세요. 폰에서 열 때 응답이 빠릅니다.
3. 프로젝트가 만들어질 때까지 1~2분 기다립니다.

## 2. 표 만들기 (1분)

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 [`supabase/schema.sql`](../supabase/schema.sql) 내용을 통째로 붙여넣고 **Run**
3. `Success. No rows returned` 가 나오면 됩니다. 여러 번 실행해도 안전합니다.

여기서 만들어지는 RLS 정책이 데이터를 지킵니다. **이 단계를 건너뛰면 안 됩니다** —
정책이 없으면 anon 키를 가진 누구나 표를 읽을 수 있습니다.

## 3. 구글 로그인 붙이기 (10분, 가장 번거로운 단계)

먼저 Supabase 쪽에서 콜백 주소를 확인합니다.
**Authentication → Sign In / Providers → Google** 을 열면 아래에 이런 주소가 있습니다.

```
https://<프로젝트ref>.supabase.co/auth/v1/callback
```

이 주소를 복사한 뒤 구글 쪽에서:

1. <https://console.cloud.google.com> → 프로젝트 만들기
2. **API 및 서비스 → OAuth 동의 화면**
   - User Type: **외부(External)**
   - 앱 이름·지원 이메일만 채우면 됩니다
   - 게시 상태는 **테스트**로 두고, **테스트 사용자**에 본인 구글 계정을 추가하세요.
     혼자 쓸 거라면 심사(게시)까지 갈 필요가 없습니다.
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - **승인된 리디렉션 URI**: 위에서 복사한 `https://<프로젝트ref>.supabase.co/auth/v1/callback` **하나만**
   - **승인된 JavaScript 원본**: 비워둡니다

   > 여기에 `localhost` 나 `vercel.app` 을 넣지 마세요. 구글 입장에서 대화 상대는 Supabase 이지
   > 이 앱이 아닙니다. 구글은 Supabase 콜백으로 돌려보내고, 거기서 이 앱으로 돌아오는 것은
   > 4번의 Supabase Redirect URLs 가 정합니다. **돌려보내는 지점이 두 군데라 목록도 두 개입니다.**
   >
   > `승인된 JavaScript 원본` 은 브라우저의 JS 가 구글 API 를 직접 부를 때(구글 원탭 버튼 등) 쓰는 칸입니다.
   > 이 앱은 페이지를 통째로 Supabase 로 넘기고 코드 교환은 Supabase 서버가 하므로 해당되지 않습니다.
4. 만들어진 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를
   Supabase 의 Google provider 칸에 붙여넣고 **Enable** → **Save**

## 4. 돌아올 주소 등록 (2분)

**Authentication → URL Configuration**

| 항목 | 값 |
|---|---|
| Site URL | 실제 배포 주소 (예: `https://내앱.vercel.app`) |
| Redirect URLs | `http://localhost:3000` <br> `https://내앱.vercel.app` <br> 도메인을 붙였다면 그 주소도 |

로그인 후 앱은 **접속했던 주소 그대로** 돌아옵니다(`window.location.origin`).
그래서 쓰는 주소를 전부 등록해야 합니다. 하나라도 빠지면 그 기기에서만 로그인이 실패합니다.

## 5. 키를 앱에 넣기 (2분)

**Project Settings → API** 에서 두 값을 복사합니다.

- **Project URL**
- **anon / public** 키 (`service_role` 키가 아닙니다. 그건 절대 앱에 넣지 마세요)

### 로컬

`.env.local.example` 을 `.env.local` 로 복사해서 채우고 `npm run dev` 를 다시 시작합니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Vercel

프로젝트 → **Settings → Environment Variables** 에 같은 이름으로 두 개를 추가하고
(Production / Preview / Development 전부 체크) **다시 배포**합니다.
환경변수는 빌드 시점에 들어가므로 재배포하지 않으면 반영되지 않습니다.

## 6. 첫 로그인과 데이터 옮기기

1. **지금 데이터가 들어 있는 노트북**에서 먼저 로그인하세요.
   `⋯` → `구글 로그인해서 기기 간 동기화`
2. 첫 로그인 때 서버가 비어 있으면 **이 기기의 데이터가 그대로 올라갑니다.** 따로 옮길 필요가 없습니다.
3. 폰에서 같은 주소를 열고 **같은 구글 계정**으로 로그인하면 그대로 나타납니다.

> 폰에 이미 다른 데이터가 들어 있었다면, 로그인 시 항목별로 합쳐집니다
> (같은 항목은 나중에 고친 쪽이 남습니다). 통째로 덮어쓰지 않습니다.

폰에서는 브라우저 메뉴의 **홈 화면에 추가**를 쓰면 앱처럼 열립니다.

---

## 도메인 붙이기 (선택, 5분)

동기화와는 무관하지만 주소가 짧아 폰에서 편합니다.

1. Vercel 프로젝트 → **Settings → Domains** → 도메인 입력
2. Vercel 이 알려주는 값을 도메인 DNS 에 등록 (보통 `CNAME` 하나)
3. **4번 단계의 Redirect URLs 에 그 도메인도 추가**하세요. 빠뜨리면 그 주소에서 로그인이 안 됩니다.

---

## 잘 안 될 때

| 증상 | 원인 |
|---|---|
| 설정 메뉴에 `동기화` 가 없다 | 환경변수 미설정. Vercel 이라면 재배포했는지 확인 |
| 로그인 후 `redirect_uri_mismatch` | 구글에서 막힌 것. 구글 콘솔의 승인된 리디렉션 URI 가 Supabase 콜백 주소와 다름 (3-3) |
| 로그인은 되는데 원래 화면으로 안 돌아옴 | Supabase 에서 막힌 것. Redirect URLs 에 그 주소가 없음 (4) |
| 로그인은 되는데 데이터가 안 보인다 | `schema.sql` 을 실행하지 않았거나 RLS 정책이 없음 (2) |
| 다른 기기 변경이 안 넘어온다 | `schema.sql` 마지막의 realtime publication 부분이 실행되지 않음 |
