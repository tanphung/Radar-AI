# Crypto Analysis Dashboard — Build Plan

> **Project root:** `D:\app`
> **Brief source:** `C:\Users\Admin\Desktop\NOTE\crypto_analysis_dashboard_brief.md`
> **GenLayer rules:** `C:\Users\Admin\CLAUDE.md` (đọc trước mỗi quyết định contract)
>
> **Mục tiêu của plan này:** chia việc build thành các phase nhỏ, có gate verify giữa
> các phase, để không tích lỗi / không tạo file rác / không có component "mồ côi".

---

## 0. Nguyên tắc bắt buộc xuyên suốt

Mọi phase đều phải tuân thủ:

1. **Sửa file thật, không tạo bản song song.** Cấm `*_v2`, `*_new`, `*-old`, `*.bak`,
   `Component2.tsx`. Cần thay logic → sửa trực tiếp file gốc.
2. **Tạo file mới = phải wire vào flow trong cùng commit.** Không có component/module
   mồ côi. Định nghĩa "wire": import + render/call ở entrypoint thực sự (page, layout,
   route handler, contract method).
3. **Sửa tận gốc, không vá lên vá.** Bug → tìm cause ở file nguồn, không thêm lớp che.
4. **Một commit = một chủ đề.** Dễ revert. Không gộp lint-fix + feature + refactor.
5. **Trước mỗi thay đổi `node_modules` / dependency / cấu trúc lớn → dừng dev server.**
6. **Contract storage field chỉ append cuối dataclass.** Không chèn giữa. Không đổi
   thứ tự. Reserve slot từ phase 1 cho các field tương lai (xem §2.1).
7. **Mỗi phase có exit gate** (lint + typecheck + test pass). Không vượt phase khi
   gate fail.

### Stack chốt
- **Contract:** Python intelligent contract trên GenVM, pinned `py-genlayer` hash.
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind 4 + shadcn/ui.
- **State:** Zustand cho client store; React Query cho server data.
- **Realtime price:** Binance WebSocket public stream.
- **Market data:** CoinGecko public API (no key) → fallback cache JSON.
- **Chart:** TradingView Lightweight Charts.
- **Auth + watchlist:** SIWE (viem) + Supabase free tier (Postgres + Edge Functions).
- **Cron:** GitHub Actions `schedule: 0 */2 * * *` chạy script Node TS.
- **Contract client:** `genlayer-js` (frontend) + `genlayer-js` trong cron script.

### Cấu trúc thư mục (chốt từ đầu — không đổi)

```
D:\app\
├── BUILD_PLAN.md           # file này
├── README.md
├── .gitignore
├── .env.example            # template biến môi trường chung
│
├── contracts\
│   └── crypto_oracle.py    # 1 contract duy nhất, không split file
│
├── tests\
│   ├── direct\
│   │   └── test_crypto_oracle.py
│   └── integration\
│       └── test_crypto_oracle_consensus.py
│
├── scripts\
│   ├── deploy.ts           # deploy + ghi address vào frontend/.env.local
│   └── check_contract.ts   # sanity ping sau deploy
│
├── cron\
│   ├── monitor_coins.ts    # script chạy bởi GitHub Actions
│   └── coins_top40.json    # snapshot CoinGecko top 40, refresh manual
│
├── .github\workflows\
│   └── monitor-coins.yml   # cron 2h
│
└── frontend\               # Next.js app
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── .env.example
    ├── public\
    └── src\
        ├── app\
        │   ├── layout.tsx
        │   ├── page.tsx                  # /  → Dashboard
        │   ├── coin\[id]\page.tsx        # /coin/:id  → Detail
        │   ├── watchlist\page.tsx        # /watchlist
        │   ├── alerts\page.tsx           # /alerts
        │   └── api\
        │       ├── siwe\nonce\route.ts
        │       ├── siwe\verify\route.ts
        │       └── watchlist\route.ts
        ├── components\
        │   ├── layout\                   # Sidebar, TopBar, MobileNav
        │   ├── dashboard\                # CoinRow, CoinTable, FilterBar
        │   ├── coin\                     # PriceHeader, ChartBlock, StatsGrid
        │   ├── analysis\                 # AnalysisCard, NewsList, SignalsGrid, Verdict
        │   ├── alerts\                   # AlertBell, AlertList, AlertItem
        │   ├── watchlist\                # StarButton, EmptyState
        │   └── ui\                       # shadcn primitives only
        ├── lib\
        │   ├── store\                    # zustand stores
        │   │   ├── watchlistStore.ts
        │   │   └── priceStore.ts
        │   ├── data\
        │   │   ├── coingecko.ts          # market data client
        │   │   └── binanceWs.ts          # ws client singleton
        │   ├── contract\
        │   │   ├── client.ts             # genlayer-js client singleton
        │   │   ├── cryptoOracle.ts       # typed wrapper of contract ABI
        │   │   └── schema.ts             # JSON shape of analysis result
        │   ├── auth\
        │   │   ├── siwe.ts
        │   │   └── session.ts
        │   ├── supabase\
        │   │   └── client.ts
        │   └── utils\
        │       ├── format.ts             # số, %, currency
        │       └── time.ts
        └── styles\
            └── globals.css
```

**Cấm tạo thêm folder/file ngoài cây trên** trừ khi update plan này trước.

---

## 1. Phase 0 — Project init (1 commit)

**Goal:** tạo khung repo trống, git khởi tạo, gitignore chuẩn, không có code business.

### Việc làm
- `git init` tại `D:\app`.
- Tạo `.gitignore` (đầy đủ: `node_modules/`, `.next/`, `__pycache__/`, `*.tsbuildinfo`,
  `.env`, `.env.local`, `dist/`, `.pytest_cache/`, `artifacts/`).
- Tạo `README.md` ngắn (1 đoạn giới thiệu + link tới `BUILD_PLAN.md`).
- Tạo `.env.example` rỗng nhưng đầy đủ key name (xem §10).
- Tạo các thư mục trống có `.gitkeep`: `contracts/`, `tests/direct/`, `tests/integration/`,
  `scripts/`, `cron/`, `.github/workflows/`.

### Exit gate
- `git status` clean sau commit đầu.
- Không có file business logic nào.

**Commit:** `chore: init project skeleton`

---

## 2. Phase 1 — Contract design & scaffold (2 commit)

**Goal:** contract `crypto_oracle.py` có đủ API surface, pass `genvm-lint check --json`.
Không có method nào empty/TODO. Mọi method là production-ready hoặc không tồn tại.

### 2.1 Storage schema (CHỐT TRƯỚC KHI VIẾT CODE)

Thứ tự dataclass field cố định. Reserve slot cuối cho v2.

```python
@allow_storage
@dataclass
class CoinAnalysis:
    coin_id: str            # CoinGecko id, ví dụ "bitcoin"
    symbol: str
    signal: str             # "buy" | "hold" | "sell" | "watch"
    sentiment_score: u8     # 0-100
    risk_level: str         # "low" | "medium" | "high" | "extreme"
    confidence: u8          # 0-100
    breaking_headline: str
    news_json: str          # JSON string — list of {sentiment,title,impact}
    updates_json: str       # JSON string — list of {type,content}
    bullish_json: str       # JSON string — list[str]
    risks_json: str         # JSON string — list[str]
    smart_money: str
    verdict_summary: str
    sources_json: str       # JSON string — list[str]
    requested_by: Address   # 0x0 nếu do cron
    created_at_iso: str     # ISO8601 string (deterministic, từ web fetch hoặc tx)
    is_alert: bool          # True nếu cron-generated và đạt ngưỡng bất thường
    alert_reason: str       # "" nếu không phải alert

@allow_storage
@dataclass
class CronRun:
    run_id: str
    started_at_iso: str
    batch_count: u32
    coin_count: u32
    alert_count: u32
```

**Quy tắc:** muốn thêm field v2 → append CUỐI dataclass, không sửa thứ tự cũ. Sau khi
deploy lần đầu, **mọi thay đổi storage = redeploy contract + cập nhật address**.

### 2.2 Contract methods (đủ — không thừa, không thiếu)

State:
- `owner: Address`
- `paused: bool`
- `next_analysis_id: u64`
- `next_run_id: u64`
- `analyses: TreeMap[str, CoinAnalysis]`      # key = analysis_id ("an_<n>")
- `latest_by_coin: TreeMap[str, str]`         # coin_id → latest analysis_id
- `alerts_index: TreeMap[str, str]`           # coin_id → pipe-separated alert ids
- `runs: TreeMap[str, CronRun]`               # run_id → CronRun
- `cron_authorized: TreeMap[str, bool]`       # address hex → bool

Methods:
- `set_global_paused(paused: bool)` — owner only.
- `authorize_cron(operator: Address)` — owner only.
- `revoke_cron(operator: Address)` — owner only.
- `request_analysis(coin_id: str, symbol: str) -> str` — public write. Gọi LLM +
  web fetch theo equivalence principle (xem §2.3). Trả về `analysis_id`.
- `monitor_batch(run_id: str, coin_ids_pipe: str, symbols_pipe: str) -> str` — cron
  authorized only. Lặp qua coin, gọi same prompt as analysis nhưng yêu cầu LLM trả
  thêm `is_alert: bool` và `alert_reason: str`. Lưu vào `analyses` + index nếu alert.
- `get_analysis(analysis_id: str) -> CoinAnalysis` — view.
- `get_latest_analysis(coin_id: str) -> CoinAnalysis` — view.
- `get_alerts(coin_id: str) -> str` — view, pipe-separated ids.
- `get_run(run_id: str) -> CronRun` — view.

**Không thêm method nào ngoài list trên trong MVP.** Cần thêm → update plan trước.

### 2.3 Equivalence principle

- `request_analysis` và `monitor_batch` đều dùng `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`.
- Leader: gọi `gl.nondet.exec_prompt(prompt, response_format="json")` để LLM trả về
  JSON đúng shape.
- Prompt yêu cầu LLM tự fetch dữ liệu qua web tool nếu có; nếu không thì dựa vào
  knowledge + context truyền vào.
- Validator: check JSON shape + range (sentiment 0–100, signal in set, news là list,
  news[i] có đủ 3 key). KHÔNG so sánh literal text (LLM non-deterministic).
- Error classification: dùng prefix `[LLM_ERROR]`, `[EXPECTED]`, `[EXTERNAL]`,
  `[TRANSIENT]` đúng chuẩn CLAUDE.md §6.

### 2.4 Validation rules cho LLM output (validator_fn)

```
- response phải là dict
- signal ∈ {"buy","hold","sell","watch"}
- sentiment_score: int 0..100
- risk_level ∈ {"low","medium","high","extreme"}
- confidence: int 0..100
- breaking_headline: non-empty str
- news: list, len ∈ [1..6], mỗi item có {sentiment,title,impact} đúng kiểu
- bullish_signals: list[str], len ∈ [3..6]
- risk_signals: list[str], len ∈ [3..6]
- verdict_summary: str, len ∈ [40..600]
- (monitor_batch) is_alert: bool, alert_reason: str
```

### Files tạo
- `contracts/crypto_oracle.py`
- `genlayer.toml` (config network + contract path)

### Exit gate
- `genvm-lint check contracts/crypto_oracle.py --json` → `ok: true`.
- Mỗi field storage tồn tại đúng thứ tự đã chốt §2.1.
- Không có import bị cấm (`os`, `sys`, `subprocess`, `random`).

**Commits:**
1. `feat(contract): add CoinAnalysis storage + view methods`
2. `feat(contract): add request_analysis + monitor_batch with consensus`

---

## 3. Phase 2 — Direct tests cho contract (1 commit)

**Goal:** unit test toàn bộ logic deterministic của contract (rules, access control,
indexing). Mock LLM + web cho path qua judgment.

### Files
- `tests/direct/test_crypto_oracle.py`

### Coverage bắt buộc
- Owner-only methods reject sender khác.
- `cron_authorized` gate cho `monitor_batch`.
- `paused=True` block cả request_analysis và monitor_batch.
- `get_latest_analysis` trả đúng item mới nhất sau 2 lần request_analysis cùng coin.
- `alerts_index` chỉ append khi `is_alert=True`.
- Mock LLM trả JSON hợp lệ → analysis lưu được.
- Mock LLM trả JSON xấu (thiếu key, sai range) → revert đúng `[LLM_ERROR]`.

### Exit gate
- `pytest tests/direct/ -v` → all pass.

**Commit:** `test(contract): direct tests for oracle rules and storage`

---

## 4. Phase 3 — Frontend foundation (2 commit)

**Goal:** Next.js app chạy được `npm run dev`, có layout chính (sidebar + topbar +
content), dark mode default, không có business data.

### 4.1 Init
- `npx create-next-app@latest frontend --typescript --tailwind --app --eslint --src-dir`.
  Trả lời defaults; không tạo `pages/` cũ.
- Cài: `zustand`, `@tanstack/react-query`, `viem`, `siwe`, `genlayer-js`,
  `lightweight-charts`, `lucide-react`, `clsx`, `tailwind-merge`.
- Cài shadcn/ui: `npx shadcn@latest init` (dark + Inter font + slate base).
- Thêm components shadcn cần ngay: `button`, `card`, `badge`, `dialog`, `dropdown-menu`,
  `input`, `skeleton`, `tabs`, `tooltip`, `toast`.

**Cấm cài component shadcn mà chưa dùng tới.**

### 4.2 Layout
- `src/app/layout.tsx`: HTML root + dark class + Inter font + `<Sidebar>` + `<TopBar>`
  + `<main>`.
- `src/components/layout/Sidebar.tsx`: 4 link (Dashboard, Watchlist, Alerts, Settings)
  với icon lucide. Active state bằng `usePathname`.
- `src/components/layout/TopBar.tsx`: search input (chưa wire data — chỉ UI),
  connect-wallet button (chưa wire — chỉ UI placeholder gọi `onClick={noop}` ghi
  chú TODO trong cùng phase 5), alert bell (chưa có count).
- `src/components/layout/MobileNav.tsx`: bottom nav cho viewport <768px.

**Wire ngay:** Sidebar/TopBar import vào `app/layout.tsx`. MobileNav render trong
layout, hidden ở md+ qua tailwind class. Không có component để dangling.

### 4.3 Design system
- `src/styles/globals.css`: CSS variables cho palette §brief (background #0F1419,
  surface #1A1F2E, border #2A2F3E, accent xanh #3B82F6, sentiment green/red/amber).
- Bật `font-variant-numeric: tabular-nums` toàn cục cho số.
- Setup Tailwind theme extension dùng các biến trên.

### Exit gate
- `cd frontend && npx tsc --noEmit` → 0 lỗi.
- `npm run dev` → trang `/` hiện sidebar + topbar + content placeholder "Dashboard
  coming next". Không lỗi console.
- Lighthouse a11y > 90 ở dashboard skeleton (nice-to-have).

**Commits:**
1. `chore(frontend): init Next.js app with Tailwind + shadcn`
2. `feat(frontend): layout shell with sidebar, topbar, mobile nav`

---

## 5. Phase 4 — Real-time price dashboard (Feature 1) (3 commit)

**Goal:** trang `/` hiển thị top 200 coin với data CoinGecko + WebSocket Binance.
Search + sort + filter chạy được.

### 5.1 Data clients
- `src/lib/data/coingecko.ts`: fetcher market data top 200 với React Query
  (`useQuery`), TTL 60s, cache key `["coingecko","top200"]`. Trả về type
  `MarketCoin` (id, symbol, name, image, price, market_cap, volume_24h,
  change_24h, sparkline_7d).
- `src/lib/data/binanceWs.ts`: singleton WebSocket connect `!miniTicker@arr`. Push
  ticker update vào Zustand store. Auto reconnect exponential backoff. Map symbol
  → coin id qua bảng tra (CoinGecko platform `binance`).
- `src/lib/store/priceStore.ts`: `Map<coinId, livePrice>` với selector.

**Wire ngay:** binanceWs import từ `app/page.tsx` (hoặc layout) qua hook init
chạy 1 lần (`useEffect` + ref). Không tạo file ws mà không gắn vào page.

### 5.2 UI dashboard
- `src/components/dashboard/CoinTable.tsx`: virtualized list (dùng React built-in
  hoặc `@tanstack/react-virtual` nếu cần) cho 200 row.
- `src/components/dashboard/CoinRow.tsx`: logo + symbol + name + price (flash 200ms
  khi thay đổi) + 24h % badge + market cap + volume + sparkline + StarButton.
- `src/components/dashboard/FilterBar.tsx`: search + sort dropdown + category filter.
  State lên `useDashboardFilters` (URL search params) — không lưu Zustand tránh
  duplicate truth.
- `src/components/dashboard/Sparkline.tsx`: SVG mini chart 7d, không dùng lib nặng.

**Wire ngay:** `app/page.tsx` render `<FilterBar/> + <CoinTable/>`. Không tạo
component nào không xuất hiện trên page.

### 5.3 UX detail
- Skeleton rows khi loading lần đầu (shadcn `<Skeleton/>`).
- Price flash: lưu `previousPrice` trong row, so sánh, apply class `bg-green-500/10`
  hoặc `bg-red-500/10` trong 200ms qua `setTimeout` cleanup đúng.
- Tabular-nums cho mọi cell số.

### Exit gate
- `npx tsc --noEmit` → 0 lỗi.
- Dev server: trang `/` load 200 coin trong <2s, giá flash mượt, sort/filter chạy.
- DevTools Network: chỉ 1 request CoinGecko khi reload (React Query cache hoạt động).
- Console: 0 warning.

**Commits:**
1. `feat(dashboard): coingecko market data client + types`
2. `feat(dashboard): binance ws + price store + flash animation`
3. `feat(dashboard): coin table, filter bar, sparkline`

---

## 6. Phase 5 — Coin detail + AI Analysis UI (Feature 2) (3 commit)

**Goal:** `/coin/[id]` hiển thị chart + stats + nút "Run AI Analysis" gọi contract.
Báo cáo render đầy đủ 7 phần theo brief §UI.

### 6.1 Contract client
- `src/lib/contract/client.ts`: tạo `genlayer-js` client từ env (network, RPC, address).
  **Đọc SDK reference trước khi viết** — không bịa method.
- `src/lib/contract/cryptoOracle.ts`: typed wrappers: `requestAnalysis(coinId,symbol)`,
  `getLatestAnalysis(coinId)`, `getAlerts(coinId)`. Decode `_json` fields về object.
- `src/lib/contract/schema.ts`: types `AnalysisResult`, `NewsItem`, `Signal`, etc.
  Match đúng JSON shape brief §Output.

### 6.2 Page
- `src/app/coin/[id]/page.tsx`: server component fetch coin meta từ CoinGecko, render
  `<PriceHeader/>`, `<ChartBlock/>`, `<StatsGrid/>`, `<AnalysisSection/>`.
- `src/components/coin/PriceHeader.tsx`: logo + name + current price (live) + 24h %.
- `src/components/coin/ChartBlock.tsx`: TradingView Lightweight Charts, tabs
  1D/1W/1M/1Y/ALL, fetch OHLC từ CoinGecko `market_chart`.
- `src/components/coin/StatsGrid.tsx`: market cap, supply, ATH, ATL, rank.

### 6.3 Analysis UI
- `src/components/analysis/AnalysisSection.tsx`: client component. Có 3 state:
  `empty` (chưa chạy), `loading` (đang chạy 30-90s), `ready` (có result).
  - Empty: nút `"Run AI Analysis"` + mô tả ngắn.
  - Loading: progress text rotate qua 5 step trong brief (interval 8s), spinner.
  - Ready: render `<AnalysisCard/>` đầy đủ 7 phần.
- `src/components/analysis/AnalysisCard.tsx`: orchestrator 7 phần:
  1. `<AnalysisHeader/>` — signal/sentiment/confidence badge
  2. `<BreakingBanner/>` — breaking_headline
  3. `<NewsList/>` — màu nền theo sentiment
  4. `<ProjectUpdates/>` — icon theo type
  5. `<SignalsGrid/>` — bullish vs risk 2 cột
  6. `<SmartMoneyCard/>`
  7. `<VerdictBlock/>` — văn xuôi + share + re-analyze
- Tách từng phần thành file riêng để dễ test, **tất cả import vào `AnalysisCard`**
  trong cùng commit (no orphan).

### 6.4 Flow
- Click "Run AI Analysis" → optimistic state `loading` → gọi
  `cryptoOracle.requestAnalysis()` → poll `getLatestAnalysis()` mỗi 5s đến khi
  `created_at_iso` mới hơn lần cuối → set `ready`.
- Lần load page: gọi `getLatestAnalysis()` trước, nếu có và mới (<24h) → render thẳng.

### Exit gate
- `npx tsc --noEmit` → 0 lỗi.
- `/coin/bitcoin` mở được, chart render.
- Mock contract call (env flag `NEXT_PUBLIC_MOCK_CONTRACT=1`) → loading state đẹp,
  cycle progress text, kết thúc bằng AnalysisCard render đủ 7 phần.

**Commits:**
1. `feat(contract-client): typed wrappers for crypto oracle`
2. `feat(coin): detail page with chart and stats`
3. `feat(analysis): 7-section card with loading states`

---

## 7. Phase 6 — Auth + Watchlist (Feature 4) (3 commit)

**Goal:** SIWE 1 lần, session JWT 30 ngày, star coin instant lưu Supabase.

### 7.1 Supabase setup (1 lần manual, không commit code)
- Tạo project Supabase free tier.
- Schema SQL (chạy trong dashboard):
  ```sql
  create table user_watchlists (
    wallet_address text primary key,
    coin_ids text[] not null default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create index idx_watchlists_updated on user_watchlists(updated_at desc);
  ```
- RLS: enable + policy `wallet_address = auth.jwt() ->> 'sub'`.
- Lưu `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` vào `.env.local`.

### 7.2 Auth
- `src/lib/auth/siwe.ts`: build SIWE message, verify signature server-side (viem).
- `src/lib/auth/session.ts`: ký JWT HS256 với secret env, payload `{sub: wallet, exp: +30d}`.
  Cookie httpOnly + sameSite=lax.
- `src/app/api/siwe/nonce/route.ts`: GET → trả nonce random, lưu vào cookie.
- `src/app/api/siwe/verify/route.ts`: POST `{message, signature}` → verify → set
  JWT cookie → 200.
- `src/lib/supabase/client.ts`: client server-side dùng service key + RLS bypass cho
  API route; client browser-side dùng anon key.

### 7.3 Watchlist
- `src/lib/store/watchlistStore.ts`: Zustand `{ coinIds: Set<string>, toggle, set }`.
  Init từ `/api/watchlist` GET sau khi auth.
- `src/app/api/watchlist/route.ts`:
  - GET: đọc JWT → query Supabase → trả `{coinIds}`.
  - PUT: body `{coinIds}` → upsert.
- `src/components/watchlist/StarButton.tsx`: click → optimistic update store +
  debounce 500ms gọi PUT. Animation pop. Hover tooltip.
- `src/app/watchlist/page.tsx`: filter `CoinTable` theo `coinIds`. Empty state
  illustration + CTA quay về dashboard.

**Wire ngay:** `StarButton` import vào `CoinRow` (sửa file `CoinRow.tsx` đã có,
không tạo `CoinRow2.tsx`).

### 7.4 Connect wallet flow
- `src/components/layout/TopBar.tsx`: thay placeholder bằng button thực thi:
  request wallet → fetch nonce → sign SIWE → POST verify → fetch watchlist → render
  địa chỉ rút gọn + dropdown disconnect.
- Sửa **trực tiếp** TopBar đã có, không tạo bản mới.

### Exit gate
- `npx tsc --noEmit` → 0 lỗi.
- Connect wallet 1 lần, reload page → vẫn auth (cookie sống).
- Star/unstar 1 coin → reload page → vẫn star. Không có ký ví lần 2.
- API watchlist không có JWT → 401.

**Commits:**
1. `feat(auth): SIWE flow with JWT session cookie`
2. `feat(watchlist): Supabase storage + API routes`
3. `feat(watchlist): star button wired to CoinRow + watchlist page`

---

## 8. Phase 7 — Alerts UI (Feature 3 front) (2 commit)

**Goal:** alert bell + danh sách alert filtered theo watchlist.

### 8.1 Data
- Thêm vào `cryptoOracle.ts`: `getAlertsForCoins(coinIds: string[])` — gọi
  `get_alerts` cho từng coin (batch tuần tự, không Promise.all hết để tránh rate
  limit). Cache React Query TTL 60s.

### 8.2 UI
- `src/components/alerts/AlertBell.tsx`: số badge = count alert mới sau last_seen
  (lưu `lastSeenAlertId` localStorage). Click → mở dropdown 5 alert gần nhất.
- `src/components/alerts/AlertList.tsx`: trang `/alerts` full list, tabs `My Watchlist`
  (default) + `All`.
- `src/components/alerts/AlertItem.tsx`: emoji theo loại (whale/volume/news/...),
  coin symbol, time ago, alert_reason, CTA → `/coin/[id]?analysis=<id>`.

**Wire ngay:** AlertBell thay placeholder ở TopBar (sửa trực tiếp).

### Exit gate
- `/alerts` hiển thị danh sách (mock OK).
- Badge count cập nhật khi có alert mới.
- Filter watchlist hoạt động.

**Commits:**
1. `feat(alerts): contract client batch + bell badge`
2. `feat(alerts): list page with watchlist filter`

---

## 9. Phase 8 — Cron job (Feature 3 back) (2 commit)

**Goal:** GitHub Actions chạy mỗi 2h, chia 40 coin thành batch 10, gọi
`monitor_batch` 4 lần. Contract `MAX_BATCH_SIZE=30` giữ làm giới hạn cứng
(headroom để tăng pool sau mà không cần redeploy).

### 9.1 Script
- `cron/coins_top40.json`: snapshot CoinGecko top 40 (id, symbol). Refresh manual,
  có script `npm run cron:refresh-coins`.
- `cron/monitor_coins.ts`:
  - Load list, chunk **10**.
  - For each chunk: build `coin_ids_pipe`, `symbols_pipe`, gọi `monitor_batch` với
    `run_id = "cron_" + Date.now()`.
  - Log số tx, số alert (đọc lại run record).
  - Retry mỗi tx tối đa 2 lần với delay 5s nếu fail TRANSIENT.

### 9.0 Cost ước tính (mới)
- 4 tx/cycle × 12 cycle/day = **48 tx/ngày**
- 48 × 10 LLM call/tx = **480 LLM call/ngày** (leader path)
- 1 tx batch 10 coin ≈ 1-3 phút → cycle ≈ 4-12 phút

### 9.2 GitHub Actions
- `.github/workflows/monitor-coins.yml`:
  ```yaml
  name: Monitor Coins
  on:
    schedule: [{ cron: "0 */2 * * *" }]
    workflow_dispatch: {}
  jobs:
    run:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: cd cron && npm ci
        - run: cd cron && npx tsx monitor_coins.ts
          env:
            GENLAYER_RPC: ${{ secrets.GENLAYER_RPC }}
            CRON_PRIVATE_KEY: ${{ secrets.CRON_PRIVATE_KEY }}
            CONTRACT_ADDRESS: ${{ secrets.CONTRACT_ADDRESS }}
  ```
- Secrets cần set thủ công trên GitHub (không commit).

### Exit gate
- `workflow_dispatch` chạy thử thành công (manual trigger).
- Mỗi cycle log đủ: `runId, batches=8, coins=200, alerts=N`.
- Contract state: `runs[<run_id>]` tồn tại với đúng `batch_count` và `coin_count`.

**Commits:**
1. `feat(cron): monitor script with batched contract calls`
2. `chore(ci): GitHub Actions schedule every 2h`

---

## 10. Phase 9 — Deploy + integration smoke (2 commit)

**Goal:** contract chạy thật trên Studio testnet, frontend connect được.

### 10.1 Deploy contract
- `genlayer network set testnet-asimov` (hoặc bradbury — chốt 1 mạng từ đầu phase).
- Lấy testnet GEN từ faucet (manual browser, không tự động được).
- `genlayer deploy --contract contracts/crypto_oracle.py` → ghi address.
- `scripts/deploy.ts` tự ghi address vào `frontend/.env.local` key
  `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- `scripts/check_contract.ts`: gọi `get_owner`, `is_paused` để sanity.

### 10.2 Integration test
- `tests/integration/test_crypto_oracle_consensus.py`: 1 test deploy + chạy
  `request_analysis("bitcoin","BTC")` → assert latest analysis có signal hợp lệ.
  - `gltest tests/integration/ -v -s --network testnet_bradbury` (hoặc asimov).
- Chạy 1 lần. Không spam testnet.

### 10.3 Smoke UI
- `npm run dev` → connect wallet (testnet) → mở `/coin/bitcoin` → click Run AI
  Analysis → đợi 30-90s → AnalysisCard render đủ 7 phần với data thật.
- Star Bitcoin → reload → vẫn star.
- Chạy `workflow_dispatch` cron → mở `/alerts` → thấy alert thật.

### Exit gate
- Smoke checklist trên pass 100%.
- `npm run build` frontend → 0 error, 0 warning quan trọng.

**Commits:**
1. `feat(scripts): deploy + check contract`
2. `test(integration): consensus smoke for request_analysis`

---

## 11. Biến môi trường (`.env.example` chuẩn)

### `D:\app\.env.example` (cron + scripts)
```
GENLAYER_RPC=
CRON_PRIVATE_KEY=
CONTRACT_ADDRESS=
GENLAYER_NETWORK=testnet-bradbury
```

### `D:\app\frontend\.env.example`
```
NEXT_PUBLIC_GENLAYER_NETWORK=testnet-bradbury
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_MOCK_CONTRACT=0

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

SIWE_DOMAIN=localhost
SIWE_ORIGIN=http://localhost:3000
JWT_SECRET=
```

**Cấm commit `.env` / `.env.local`** — đã có trong `.gitignore`.

---

## 12. Verification gates tóm tắt (chạy cuối mỗi phase)

| Phase | Lệnh bắt buộc | Phải pass |
|-------|---------------|-----------|
| 1 | `genvm-lint check contracts/crypto_oracle.py --json` | `ok:true` |
| 2 | `pytest tests/direct/ -v` | all pass |
| 3 | `cd frontend && npx tsc --noEmit` + `npm run dev` | 0 err, page load |
| 4 | `npx tsc --noEmit` + manual UI check | 0 err, flash mượt |
| 5 | `npx tsc --noEmit` + mock contract render | 0 err, 7 phần render |
| 6 | `npx tsc --noEmit` + connect wallet smoke | star persist sau reload |
| 7 | `npx tsc --noEmit` + alert UI render | badge đúng count |
| 8 | `workflow_dispatch` manual | log đủ, runs[] có |
| 9 | `gltest ... -v -s` + `npm run build` | smoke pass |

**Không vượt phase khi gate fail.** Fix tại chỗ, không patch sang phase sau.

---

## 13. Cấm tuyệt đối trong suốt project

- ❌ Tạo file `*_v2`, `*_new`, `*_old`, `*.bak`, `*-copy`, `Component2.tsx`.
- ❌ Giữ component không được import (orphan).
- ❌ Chèn field giữa dataclass contract.
- ❌ Dùng `dict`/`list` cho contract storage.
- ❌ Dùng `strict_eq` cho LLM call.
- ❌ Dùng `float` cho money (atto-scale `u256`).
- ❌ Import `os`/`sys`/`subprocess`/`random` trong contract.
- ❌ Bịa method `genlayer-js` — verify SDK reference trước.
- ❌ Commit `.env*` thật, `node_modules`, `.next`, `__pycache__`.
- ❌ Đổi `node_modules`/cấu trúc khi dev server đang chạy.
- ❌ Tạo file mới ngoài cây thư mục §0 mà không update plan trước.
- ❌ Vượt qua exit gate khi nó fail.

---

## 14. Khi cần thay đổi plan

- Update file này trong **cùng commit** với thay đổi cấu trúc.
- Không có "plan ngầm" — mọi thư mục/phase mới phải xuất hiện ở đây trước.
- Nếu phát hiện brief thay đổi → ghi note ở cuối file này (changelog), không xoá
  phần cũ.

---

## 15. Changelog plan

- 2026-06-02: bản đầu, chốt 10 phase và cấu trúc thư mục.
- 2026-06-02: Phase 0 + 1 hoàn tất.
  - Contract `contracts/crypto_oracle.py` — 12 method (7 view + 5 write), pinned
    hash `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.
  - `genvm-lint check ... --json` → `ok:true`.
  - `genlayer.toml` chưa tạo — dời sang Phase 9 (deploy) vì CLI không bắt buộc.
- 2026-06-02: Phase 2 hoàn tất.
  - `tests/direct/test_crypto_oracle.py` — 22 test, pass <1s.
  - `tests/conftest.py` — Windows tempfile cleanup autouse fixture.
  - `gltest` dùng cache riêng `~/.cache/gltest-direct/`, đã copy tarball
    `genvm-universal-v0.2.16.tar.xz` sang. Workaround tương tự linter (xem dưới).
  - `mock_llm` accumulate chứ không override — phải gọi `direct_vm.clear_mocks()`
    trước khi mock response mới với cùng matcher.
- 2026-06-03: Phase 5 hoàn tất (2 commit: detail page + analysis card).
  - Real client `genlayer-js` **chưa cài** — dời sang Phase 9 khi contract
    deploy xong. Mock client trong `cryptoOracle.ts` dùng localStorage +
    setTimeout 12s, varied per-coin via hash.
  - lucide-react 1.17 bỏ icon `Github`, dùng `GitBranch` cho update type
    `github`.
  - shadcn: thêm `tabs` (ChartBlock) + `badge` (AnalysisHeader). `card`
    không cài — mỗi section có style riêng theo brief, không cần wrapper
    chung.
  - `lightweight-charts` v5 API: `chart.addSeries(AreaSeries, opts)` —
    khác v4 (`addAreaSeries`). Đã dùng đúng.
  - CoinRow wrap `<Link>` → click row → `/coin/[id]`. Hover state thêm.
  - Page `/coin/[id]/page.tsx` dùng `useParams` (client-side) thay vì
    server component `await params` — tránh tách thành 2 file page+view.
  - Exit gate: tsc + build pass, /coin/bitcoin 200, route `ƒ` dynamic.
- 2026-06-03: Phase 4 hoàn tất (gộp 3 commit Plan §5 thành 1).
  - Lý do gộp: tách 3 commit theo sub-phase sẽ tạo `coingecko.ts` không có
    consumer ở commit 1, hoặc phải viết page.tsx tạm rồi đè ở commit sau —
    phạm rule "không tạo file rồi đè". 1 commit cohesive, vẫn revert được.
  - `@tanstack/react-query` + `zustand` cài cùng commit feature.
  - shadcn: chỉ `skeleton`. `badge` ban đầu cài rồi xoá vì không có consumer
    (CoinRow dùng `<span>` thuần — đủ và đỡ deps).
  - URL params `?q=&sort=` cho FilterBar. `useDashboardFilters` đặt cạnh
    `FilterBar.tsx` thay vì tạo dir `hooks/` empty.
  - Suspense bao Dashboard trong page.tsx vì Next 16 yêu cầu cho
    `useSearchParams`.
  - Binance symbol map: dedupe theo highest mcap (CoinGecko trả mcap desc).
  - Exit gate: `tsc --noEmit` + `next build` đều pass; HTML response 200 với
    đầy đủ FilterBar/Select/Skeleton; URL params reflow đúng.
- 2026-06-03: Phase 3 hoàn tất.
  - `frontend/` — Next.js **16.2.7** + React 19.2 + Tailwind 4 + shadcn (radix preset).
    Tên scaffold ghi Next 15 trong plan ban đầu, thực tế create-next-app pull bản 16.
  - shadcn components đã cài: chỉ `button` + `input` (Phase 3 layout cần). Các
    component khác (`card`, `badge`, `dialog`, `dropdown-menu`, `skeleton`, `tabs`,
    `tooltip`, `toast`) dời sang phase tiêu thụ thật sự — tránh deps thừa.
  - npm deps dời theo phase: `zustand`+`react-query` ở Phase 4; `genlayer-js`+
    `lightweight-charts` ở Phase 5; `viem`+`siwe`+`@supabase/supabase-js` ở Phase 6.
  - Font: giữ Geist (đã wire sẵn bởi scaffold) thay vì Inter — Plan §4.3 cho phép.
  - Brand palette override trong `.dark` của `globals.css` đúng spec BUILD_PLAN.
  - `tabular-nums` global cho mọi số.
  - `layout.tsx` import Sidebar/TopBar/MobileNav — không có component orphan.
  - `nav-items.ts` chung cho Sidebar + MobileNav — không duplicate truth.
  - Exit gate: `npx tsc --noEmit` 0 lỗi; `curl /` 200 + markers; `/watchlist` 404
    nhưng layout vẫn render.

### Known setup gotcha — genvm-linter v0.10.0 vs GenVM v0.3.0-rc

Linter tự fetch GitHub release "latest" và tìm asset tên `genvm-universal.tar.xz`,
nhưng release v0.3.0-rc* đã đổi tên asset thành `genvm-runners-all.tar.xz`. Trên
máy mới sẽ thấy:

```
{"validate":{"errors":[{"code":"E101","msg":"Failed to load SDK: HTTP 404"}]}}
```

Workaround (cho đến khi linter ra bản fix):

```bash
mkdir -p ~/.cache/genvm-linter
LATEST=$(curl -sI https://github.com/genlayerlabs/genvm/releases/latest | \
  grep -i ^location | awk -F/ '{print $NF}' | tr -d '\r')
curl -sL -o ~/.cache/genvm-linter/genvm-universal-$LATEST.tar.xz \
  https://github.com/genlayerlabs/genvm/releases/download/v0.2.16/genvm-universal.tar.xz
```

Tarball v0.2.16 chứa runner hash đang pin nên SDK validate chạy được.

Tương tự cho `gltest` (test runner):

```bash
mkdir -p ~/.cache/gltest-direct
cp ~/.cache/genvm-linter/genvm-universal-v0.2.16.tar.xz \
   ~/.cache/gltest-direct/genvm-universal-v0.2.16.tar.xz
```

Trong test file: `SDK_VERSION = "v0.2.16"` và truyền `sdk_version=SDK_VERSION`
vào `direct_deploy()`.
