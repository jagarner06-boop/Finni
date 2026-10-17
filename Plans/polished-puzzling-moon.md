# Finni — SwampHack XII Implementation Plan (v1, overview locked pending approval)

## Context
- **Event:** SwampHack XII. Start Fri 10/16 8:00pm EST → submit Sun 10/18 8:00am EST (**~36h**, 2 people, sleep included).
- **Main track:** Capital One — Best Use of Nessie ($1,000).
- **Add-on tracks:** MLH Best Use of Gemini API, MLH Best Use of Auth0 (explicitly calls out *Auth0 for AI Agents*).
- **Idea:** "Finni" — a friendly, animated finance companion app. You text **Finn** (mascot/agent), who reads your Nessie accounts, takes actions *only with your approval*, builds savings goals with you, and nudges you proactively.
- **Repo state:** empty (readme.md, test.py). Greenfield.

## Positioning (what makes us win, not just qualify)
"AI chatbot over Nessie" will be common at the Capital One table. Our edges, all visible in a 3-min demo:
1. **Finn has personality.** Expressive mascot (happy / thinking / worried / celebrating) reacting to what he's telling you; warm, playful copy.
2. **Real money movement, safely.** Finn proposes → user approves → **Auth0 step-up MFA for large amounts** → real Nessie transfer/bill payment. Pitch: *"an AI agent that can never touch your money without you."*
3. **Proactive, not reactive.** Finn texts *you* first: spending spikes, upcoming bills, goal milestones.
4. **Goals are real accounts.** Each savings goal = its own Nessie savings account; progress = real balance.

## Track mapping
| Track | How Finni earns it |
|---|---|
| Nessie | Reads customers/accounts/purchases/deposits/bills/merchants; **writes** transfers, bill payments, new accounts (goals). Seeded demo persona with realistic history. |
| Gemini | Agent loop with function calling over Nessie tools; structured output for spending insights + nudge text; Finn persona via system prompt. Stretch "whoa": receipt photo scan or Gemini weekly recap. |
| Auth0 | Login (social/passwordless) in Expo; backend JWT verification; agent write actions gated by human approval; **step-up MFA** above threshold. Stretch: Auth0 Async Authorization (CIBA). |

## Decisions locked
- **Frontend:** Expo (managed) React Native; keep web target building as a backup demo.
- **Backend:** Node + TypeScript (shared types package with app).
- **DB:** Neon Postgres + Drizzle ORM.
- **Pet:** Friendly animated mascot, no health/evolution mechanic. 4 expression states selected per message by the agent (`mood` field in response). Gemini-generated PNG expressions animated in code (see Component Plan 4).
- **Team skills:** RN/Expo ✅, backend ✅, LLM/agents ✅, design/animation ❌ → UI kit + prebuilt assets, no custom motion work.
- **Team split:** vertical slices after a shared foundation.

## Architecture
```
Expo app ──HTTPS + Auth0 JWT──> Node/TS API ──> Nessie API
  chat, Finn mascot, goals,       │  Gemini agent (function calling)
  approval cards, nudge inbox,    │  Postgres: users↔nessie_customer_id, goals,
  local notifications             │            pending_actions, nudges, chat history
                                  └─ scheduler: nudge + bill-reminder generation
```
- Backend holds all keys; verifies Auth0 JWTs on every route.
- **Agent tools:** read tools (`get_accounts`, `get_transactions`, `get_recent_purchases` (with merchant names joined in), `spending_summary`, `get_bills`, `get_goals`, `find_nearby_atms`) run freely.
- **Nearby ATMs:** app sends device location (`expo-location`, permission prompt; fixed demo-city fallback coords if denied or on web) with each chat message → `find_nearby_atms(lat, lng, radius)` calls Nessie `GET /atms?lat&lng&rad` → Finn replies with the closest few (name, distance, hours) as a small card list, with a tap to open in maps. Stretch: same flow for Nessie `/branches`.
- **Recent purchases:** "What did I buy this week?" / "How much at Starbucks?" → Nessie `GET /accounts/{id}/purchases` + `/merchants/{id}` → Finn summarizes and shows a compact transaction card list. Write tools (`propose_transfer`, `propose_bill_payment`, `propose_goal`) only create a `pending_action`; execution happens via `POST /actions/:id/approve`, which requires a step-up-authenticated token when amount > threshold.

## Scope
- **MVP (must demo):** Auth0 login → chat with Finn → balance/spending Q&A + **recent purchases** + **nearby ATMs** via Gemini tools → Finn proposes transfer → approval card → Nessie transfer executes → Finn reacts. Create savings goal (new Nessie account) + progress view. Mascot expressions. Seeded demo persona.
- **Committed should-haves:** step-up MFA on large actions · proactive nudges (inbox + local notification) · bill reminders with one-tap "pay with approval".
- **Stretch (in order):** receipt/bill photo scan (Gemini multimodal) or Gemini weekly recap · Auth0 CIBA async approval · real remote push · SMS via Twilio.

## Team plan (vertical slices)
- **Together, hours 0–3 (Fri 8–11pm):** monorepo scaffold (`apps/mobile`, `apps/api`, `packages/shared` types), Auth0 tenant + login working in Expo + JWT middleware, DB schema v1, Nessie client + seed script, Gemini hello-world tool call. *These are the shared foundations; do not split before they work.*
- **Slice A — "Talk to Finn":** chat UI, mascot + expressions, agent loop, read tools (incl. recent purchases + ATM finder with location), chat history, persona prompt, design system/UI kit setup.
- **Slice B — "Finn does things":** pending actions + approval cards, transfers, step-up MFA, goals (Nessie accounts), bills, nudge scheduler + inbox + local notifications.
- Interface contract between slices: shared TS types for `ChatMessage`, `PendingAction`, `Goal`, `Nudge`, and the agent returning `{ text, mood, actionCards[] }`.

## Timeline (EST)
- Fri 8–11pm: foundation (above). **Spike Auth0-in-Expo first.**
- Fri 11pm–Sat 3am: walking skeleton end-to-end (login → chat → real Nessie balance answer). Sleep in shifts.
- Sat 9am–6pm: both slices to MVP; integrate by 6pm.
- Sat 6pm–Sun 1am: committed should-haves + polish; stretch only if MVP is solid.
- Sun 1am: **feature freeze.** 1–6am: bug bash, record demo video, Devpost write-up (call out each track explicitly), README. **Submit by 7am.**

## Known risks / mitigations
- **Nessie** slow/flaky, mock data → seed script for demo persona early; cache reads; fixture fallback.
- **No Nessie webhooks** → backend computes nudges on a schedule/on app open.
- **Auth0 in Expo:** `react-native-auth0` needs a dev build; `expo-auth-session` redirect URIs fiddly → hour-1 spike; web target as fallback.
- **Push in Expo Go** limited → local notifications + in-app inbox for MVP.
- **Step-up MFA** config (Auth0 Actions / `acr_values`) may take iteration → fallback: re-login prompt for large actions.
- **Nessie ATM data** is real-ish but concentrated in some cities (historically the DC area) → check Gainesville coverage in the hour-1 spike; if sparse, use demo coords where ATMs exist or widen the radius.
- **Gemini track weaker without multimodal** → stretch item #1 is the fix if time allows.

---

# Component Plan 1 — Backend / Agent / Tools

## Stack
- **Express + TypeScript** (run with `tsx` in dev), **Zod** for request/tool-arg validation.
- **Auth:** `express-oauth2-jwt-bearer` (`auth({ audience, issuerBaseURL })`) on every route except `/health`. `req.auth.payload.sub` = user key.
- **DB:** Neon Postgres + **Drizzle ORM** (detailed schema in DB component plan).
- **Gemini:** `@google/genai` SDK, latest Gemini Flash model available at the event (model ID in env `GEMINI_MODEL`, confirm in spike).
- **Jobs:** `node-cron` for the nudge scan.
- **Hosting:** dev through a `cloudflared`/ngrok tunnel so phones can reach the laptop; deploy to Render or Railway by Sat ~noon so both devs and the demo phone hit one stable URL.

## Layout (`apps/api/src`)
```
index.ts            app + middleware + routes
env.ts              zod-validated env (NESSIE_KEY, GEMINI_API_KEY, GEMINI_MODEL, AUTH0_*, DATABASE_URL, STEP_UP_THRESHOLD)
auth.ts             jwt middleware + requireStepUp()
nessie/client.ts    typed wrapper (fetch, ?key=, retry x2, 30s TTL cache per customer, invalidate on writes)
nessie/types.ts
agent/prompt.ts     Finn persona + rules
agent/tools.ts      function declarations + executors (+ card emitters)
agent/loop.ts       runAgent(user, message, ctx) -> { text, mood, cards }
services/           bootstrap.ts actions.ts goals.ts bills.ts spending.ts nudges.ts
routes/             me.ts chat.ts accounts.ts goals.ts actions.ts bills.ts nudges.ts
db/                 schema.ts client.ts
jobs/nudgeCron.ts
scripts/seed.ts     demo persona seeding (details in Seed component plan)
```
`packages/shared` exports `Mood`, `ChatRequest`, `ChatResponse`, `Card` union, `PendingAction`, `Goal`, `Nudge`, `Bill` — both slices code against these.

## Routes
| Route | Purpose |
|---|---|
| `GET /health` | uptime check |
| `POST /me/bootstrap` | first login: if no `users` row for `sub` → create Nessie customer + Checking + Savings and generate a persona's history from a template; idempotent |
| `GET /me` | profile + account summary (home screen) |
| `POST /chat` `{ message, location? }` | runs agent → `ChatResponse { reply:{id,text,mood}, cards[] }` |
| `GET /chat/history` | last N messages (with cards) |
| `GET /accounts` | accounts + balances (goal accounts flagged) |
| `GET /goals` · `POST /goals` | list; UI-initiated create (makes a pending action) |
| `GET /actions?status=pending` | pending approval cards |
| `POST /actions/:id/approve` · `/reject` | execute/decline; approve runs `requireStepUp` if amount ≥ threshold |
| `GET /bills` | upcoming/recurring bills |
| `GET /nudges` · `POST /nudges/:id/read` | inbox; GET also triggers a scan if last scan > 10 min ago |
| `POST /nudges/scan` | **demo trigger**: force a scan now (so a nudge appears on cue during the demo) |

## Agent loop (`agent/loop.ts`)
1. Load the last ~20 chat turns from DB plus the system prompt (Finn persona, today's date, user's first name, account list with IDs and nicknames so the model doesn't guess IDs).
2. Call Gemini with `tools: [{ functionDeclarations }]`, temperature ~0.4.
3. While the response has `functionCalls` (max 5 iterations): validate args with Zod → check ownership (every account/bill/goal ID must belong to the user) → run the executor → append the `functionResponse`. Executors also push **cards** into a request-scoped array.
4. Final text: the prompt tells Finn to start with a mood tag `[mood:happy|thinking|worried|celebrating]`. Parse and strip it; default `happy`.
5. Persist the user message + Finn reply (+ cards JSON) and return `{ reply, cards }`.
6. Errors: Gemini 429/5xx → one backoff retry, then an in-character fallback ("Glub… my brain's foggy, try again in a sec 🫧"). Nessie failures → the tool returns `{ error }` and Finn explains.

## Tools
Read tools run immediately. Write tools **only create a `pending_action`** and emit an approval card; they never call Nessie.

| Tool | Args | Nessie calls | Card |
|---|---|---|---|
| `get_accounts` | — | `GET /customers/{id}/accounts` | account_list |
| `get_recent_purchases` | `days=7, merchant_query?, account_id?, limit=10` | `GET /accounts/{id}/purchases` + `GET /merchants/{id}` (cached) | transaction_list |
| `spending_summary` | `days=30, group_by: category\|merchant` | purchases + merchant `category` | spending_breakdown |
| `get_bills` | `status?` | `GET /customers/{id}/bills` | bill_list |
| `get_goals` | — | goal accounts' balances + our `goals` rows | goal_progress |
| `find_nearby_atms` | `radius_miles=5` | `GET /atms?lat&lng&rad` — **lat/lng injected from the request's `location`, never from the model**; demo-city fallback coords | atm_list |
| `propose_transfer` | `from_account_id, to_account_id, amount, reason` | none (pending) | approval |
| `propose_bill_payment` | `bill_id, from_account_id?` | none (pending) | approval |
| `propose_goal` | `name, target_amount, target_date?, emoji?` | none (pending) | approval |

Contributing to a goal = `propose_transfer` into that goal's account.

## Actions service (approval + execution)
- `pending_actions`: `id, user_id, type, payload jsonb, amount, status (pending|executed|rejected|expired|failed), requires_step_up, created_at, expires_at (+15 min), executed_at, nessie_ref`.
- **Approve:** atomic `UPDATE … SET status='executing' WHERE id=$1 AND user_id=$2 AND status='pending'` (prevents double execution) → run the executor:
  - transfer → `POST /accounts/{from}/transfers { medium:"balance", payee_id:to, amount, transaction_date, description }`
  - bill payment → `POST /accounts/{acct}/withdrawals` for the amount + `PUT /bills/{id} { status:"completed" }` (Nessie has no single "pay bill" endpoint; check in spike)
  - create goal → `POST /customers/{id}/accounts { type:"Savings", nickname:"<emoji> <name>", rewards:0, balance:0 }` + `goals` row
- Re-check balance ≥ amount at execution time. On success: invalidate the Nessie cache and insert a templated Finn chat message (`celebrating` mood, no Gemini call).
- **Step-up MFA:** if `amount ≥ STEP_UP_THRESHOLD` (default $100), `requireStepUp` requires the access-token claim `https://finni.app/mfa_at` within the last 5 min, otherwise it returns `403 { error:"step_up_required" }`. The client re-authenticates with `acr_values=http://schemas.openid.net/pape/policies/2007/06/multi-factor`, and an **Auth0 post-login Action** enforces MFA when that's requested and stamps the claim when `event.authentication.methods` includes `mfa`. Fallback if MFA setup or plan limits get in the way: require a fresh login (`max_age=0`) and check `auth_time`.

## Nudge engine (`services/nudges.ts`)
Deterministic rules decide *when*; Gemini (one short call, batched) only writes *the copy* in Finn's voice. Each nudge has a unique `dedupe_key` (rule + entity + period).
- Bill due within 3 days (unpaid) → "pay with approval" button that creates `propose_bill_payment`.
- Category spend over the last 7 days > 1.5× the 4-week weekly average.
- Goal milestone crossed (25/50/75/100%).
- Checking balance below $100.
Runs from `node-cron` every 15 min, lazily on `GET /nudges`, and from `POST /nudges/scan` for the demo. The client fires a local notification for unseen nudges.

## Backend build order
1. **Foundation (together, Fri 8–11pm):** scaffold, env, JWT middleware working against the Expo login, Nessie client + spike (create customer/account/purchase/transfer; **check whether balances update immediately or stay "pending"**, and check ATM coverage near Gainesville), Drizzle + Neon connected, Gemini hello-world tool call.
2. **Slice A:** `/chat` loop + read tools + mood parsing + cards + history + `/me/bootstrap`.
3. **Slice B:** actions service + approve/reject + step-up, goals, bills, nudges + cron + scan trigger.

## Backend risks
- **Nessie transfers may sit in `pending` without changing balances** → if the spike confirms this, compute display balances as Nessie balance ± our executed actions (ledger from `pending_actions`).
- **Gemini free-tier rate limits** → keep tool loops short, cache merchant lookups, use event credits if offered.
- **Model inventing IDs or amounts** → IDs listed in the prompt, server-side ownership plus Zod checks, and write tools can only propose.

## Backend verification
- `apps/api/requests.http` (VS Code REST Client) covering every route, with a test JWT.
- Agent smoke test script: ~10 canned prompts ("what's my balance", "what did I buy this week", "how much at Starbucks", "nearest ATM", "save $50 for my trip", "pay my phone bill", "make a goal for a Switch 2") → check that the expected tool fires and the card type matches.
- Manual end-to-end: propose $150 transfer → approve → 403 step_up_required → MFA → approve succeeds → Nessie shows the transfer → Finn posts a celebration message.

---

# Component Plan 2 — Database (Neon Postgres + Drizzle)

## Principles
- **Nessie is the source of truth for money:** balances, purchases, transfers, bills, merchants, and ATMs are never copied into our DB, only read through the cached Nessie client. Our DB holds only what Nessie can't: identity mapping, goal metadata, approvals, chat, and nudges. (This also makes the case for "best use of Nessie.")
- **Money is stored as integer cents** (`*_cents integer`) to avoid float bugs. Convert at the Nessie boundary with `toCents` / `toDollars` helpers in `packages/shared`.
- **Schema changes go through `drizzle-kit push`.** No migration files, since it's a hackathon. One schema file: `apps/api/src/db/schema.ts`.
- **Persona choice:** every new user gets an auto-generated persona at `/me/bootstrap`, so judges can log in on their own phones.

## Tables
**`users`**
| column | type | notes |
|---|---|---|
| id | uuid pk | `defaultRandom()` |
| auth0_sub | text unique not null | from JWT `sub` |
| email, first_name | text | from ID token / profile |
| nessie_customer_id | text unique not null | |
| checking_account_id | text not null | primary spending account |
| savings_account_id | text not null | general savings |
| persona_template | text | which seed template generated their history |
| last_nudge_scan_at | timestamptz | lazy-scan throttle |
| seeded_at | timestamptz null | set when persona history seeding finishes; `GET /me` exposes `seeded` |
| created_at | timestamptz default now() | |

**`goals`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk → users, cascade | index |
| name | text not null | "Switch 2" |
| emoji | text | "🎮" |
| target_cents | integer not null | |
| target_date | date null | |
| nessie_account_id | text unique not null | dedicated Nessie Savings account; progress = its balance |
| milestones_hit | integer[] default '{}' | e.g. `{25,50}`; used by the nudge dedupe |
| status | enum `active \| completed \| archived` | |
| created_at, completed_at | timestamptz | |

**`pending_actions`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk, index | |
| type | enum `transfer \| bill_payment \| create_goal` | |
| payload | jsonb not null | transfer: `{fromAccountId,toAccountId,reason}` · bill: `{billId,fromAccountId}` · goal: `{name,emoji,targetCents,targetDate}` |
| amount_cents | integer | null for create_goal |
| requires_step_up | boolean not null | computed at creation (`amount ≥ threshold`) |
| status | enum `pending \| executing \| executed \| rejected \| expired \| failed` | atomic `pending→executing` guard |
| source | enum `chat \| ui \| nudge` | |
| chat_message_id | uuid fk → chat_messages null | the Finn message that proposed it |
| nessie_ref | text | resulting transfer/withdrawal/account ID |
| error | text | failure reason |
| created_at, expires_at (+15 min), executed_at | timestamptz | |

Index: `(user_id, status)`.

**`chat_messages`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| role | enum `user \| finn` | |
| text | text not null | mood tag stripped |
| mood | enum `happy \| thinking \| worried \| celebrating` null | Finn only |
| cards | jsonb default '[]' | the `Card[]` rendered under the message |
| created_at | timestamptz | |

Index: `(user_id, created_at desc)`. Tool-call internals are not stored; history replay to Gemini uses text only.

**`nudges`**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk | |
| rule | enum `bill_due \| spending_spike \| goal_milestone \| low_balance` | |
| dedupe_key | text not null | e.g. `bill_due:<billId>:2026-10-20`, `spike:food:2026-W42` |
| title, body | text | body written by Gemini in Finn's voice |
| mood | mood enum | |
| action | jsonb null | e.g. `{ type:"propose_bill_payment", billId }` → tap creates a pending action |
| notified_at, read_at | timestamptz null | client sets `notified_at` after firing the local notification |
| created_at | timestamptz | |

Unique: `(user_id, dedupe_key)`. Insert with `onConflictDoNothing`, so rescans are safe.

## Shared types (`packages/shared`)
- `Mood`, `Card` discriminated union: `account_list | transaction_list | spending_breakdown | bill_list | goal_progress | atm_list | approval`.
- `approval` card = `{ actionId, type, title, amountCents, fromLabel, toLabel, requiresStepUp, status, expiresAt }`. The client re-fetches its status after approve/reject.
- `PendingAction`, `Goal` (DB row + live `currentCents` from Nessie + `percent`), `Nudge`, `ChatMessage`, `ChatRequest { message, location?: {lat,lng} }`, `ChatResponse { reply: ChatMessage, cards: Card[] }`.

## DB verification
- `drizzle-kit push` against Neon, then `drizzle-kit studio` to inspect.
- Bootstrap twice with the same JWT → one `users` row (idempotent).
- Approve the same action twice concurrently → exactly one Nessie transfer (guarded by `pending→executing`).
- Run a nudge scan twice → no duplicate nudges.

---

# Component Plan 3 — Frontend (Expo)

## Stack
- **Expo** (latest SDK at event), **Expo Router** (file-based routing, tabs + modals), TypeScript, `@finni/shared` types.
- **Auth:** `expo-auth-session` with Auth0 (PKCE, `audience` = our API) because it works in **Expo Go and on web**, which is required for the fallback. (`react-native-auth0` needs a dev build.) Tokens go in `expo-secure-store` on native and memory/`localStorage` on web, behind a small `tokenStore` abstraction.
- **Server state:** TanStack Query, plus one `api` client (`fetch` + bearer token + base URL from `EXPO_PUBLIC_API_URL`).
- **Device:** `expo-location` (ATMs), `expo-notifications` (local only), `expo-haptics`.
- **Motion:** `react-native-reanimated` (bubble entrances, progress bars), `lottie-react-native` (Finn moods, confetti). Static PNG per mood as a fallback if Lottie misbehaves on web.
- **UI kit, colors, type:** decided in the Design System plan; screens use theme tokens only, so the kit can change without rewrites.

## Layout (`apps/mobile`)
```
app/_layout.tsx            providers: QueryClient, AuthProvider, Theme; auth gate
app/welcome.tsx            Finn waves, "Meet Finn" → Auth0 login → /me/bootstrap
app/(tabs)/_layout.tsx     4 tabs: Chat · Goals · Money · Inbox (unread badge)
app/(tabs)/chat.tsx        home screen
app/(tabs)/goals.tsx
app/(tabs)/money.tsx       accounts + upcoming bills
app/(tabs)/inbox.tsx       nudges
app/approve/[id].tsx       modal approval sheet
app/goal/new.tsx           modal new-goal form
src/auth/                  AuthProvider.tsx, tokenStore.ts, useStepUp.ts
src/api/                   client.ts, queries.ts (useChat, useHistory, useGoals, useAccounts, useBills, useNudges, useApprove…)
src/components/finn/       FinnAvatar.tsx (mood → asset), TypingBubble.tsx
src/components/chat/       MessageBubble, MessageList, QuickReplies, Composer
src/components/cards/      one renderer per Card type + CardRenderer switch
src/components/ui/         Button, Card, ProgressBar, Sheet, Badge, Toast
src/lib/                   location.ts, notifications.ts, format.ts (cents → "$1,234.56", relative dates)
```

## Screens
- **Welcome:** large animated Finn, a friendly line ("Hi! I'm Finn, your money buddy 🐟"), one sign-in button. After login, call `/me/bootstrap` (show a "Finn is setting up your tank…" loader on first run, since it seeds Nessie).
- **Chat (home):**
  - Header: `FinnAvatar` showing the latest reply's mood.
  - Inverted `FlatList` of bubbles; Finn bubbles render their `cards` underneath.
  - Typing bubble with the `thinking` mood while waiting.
  - Quick-reply chips: "What did I buy this week?" · "Nearest ATM" · "Start a goal" · "Any bills due?"
  - The user's message appears optimistically.
  - **Demo trigger:** long-press Finn → `POST /nudges/scan`.
- **Cards:**
  - `account_list`: balance tiles.
  - `transaction_list`: merchant, amount, date; up to 5, then "show more".
  - `spending_breakdown`: horizontal bars by category.
  - `bill_list`: payee, due date, amount, Pay button.
  - `goal_progress`: progress ring or bar.
  - `atm_list`: name, distance, address, "Open in Maps" via `Linking` (Apple/Google maps URL).
  - `approval`: summary + Review button → `/approve/[id]`.
- **Approval sheet:**
  - Shows "Finn wants to…" title, from → to, amount, reason, and a lock icon if `requiresStepUp`.
  - Buttons: **Approve** / **Not now**.
  - Success: haptic, confetti, then back to chat, where Finn's celebration message appears (via history refetch).
  - Expired → disabled with "This request expired".
- **Goals:** goal cards (emoji, name, current/target, progress bar, target date) with "+ Add money" (creates a UI-sourced pending action → approval sheet) and "New goal" (modal form → pending action → approval).
- **Money:** account balances (goal accounts grouped separately) and upcoming bills with "Pay" → pending action → approval.
- **Inbox:** list of nudges (unread dot, Finn mood icon, body, optional action button that creates the pending action). Tapping marks it read.

## Key flows
- **Step-up:** the approve mutation gets `403 step_up_required` → `useStepUp()` runs `promptAsync` with `extraParams: { acr_values: "http://schemas.openid.net/pape/policies/2007/06/multi-factor", prompt: "login" }` → stores the new token → retries approve automatically. Copy before the redirect: "This is a big one — let's double-check it's you 🔒".
- **Location:** on the first Chat mount, a friendly pre-prompt, then the OS permission request. Each `/chat` request attaches `getLastKnownPositionAsync()` (fast), or nothing if denied, in which case the backend uses demo coords.
- **Nudge notifications:** poll `GET /nudges` on app foreground (`AppState`) and every 60s while open. For nudges without `notified_at`: `scheduleNotificationAsync({ trigger: null })` on native or a toast on web, then mark them notified. The tab badge shows the unread count.
- **Session expiry:** a 401 → clear tokens → Welcome screen. Set the Auth0 API token lifetime to 24h so this never happens mid-demo.

## Ownership (vertical slices)
- **Foundation (together):** Expo Router shell, AuthProvider, api client, theme provider stub.
- **Slice A:** Welcome, Chat screen, FinnAvatar, all read-only card renderers, location.
- **Slice B:** approval card + sheet + step-up, Goals, Money, Inbox, notifications.

## Web fallback rules
- Native-only APIs go through `src/lib` wrappers with a `Platform.OS === "web"` branch: haptics → no-op, notifications → toast, SecureStore → localStorage.
- Run `npx expo start --web` at every integration checkpoint (Sat 6pm, Sun 1am at minimum).

## Frontend verification
- Run on a real phone (Expo Go) and on web: login → bootstrap → each quick-reply chip shows the correct card → ATM card opens maps → propose $20 → approve without step-up → propose $150 → MFA → approve → confetti + celebration message → goal created and progress updates → long-press Finn → nudge appears + local notification → inbox badge clears on read.

---

# Component Plan 4 — Design System & Finn Mascot

## Approach (no designer on the team)
- **NativeWind (Tailwind for RN)**, with tokens in `tailwind.config.js`, plus ~8 hand-built components in `src/components/ui`. It works on native and web, is fast to style, and avoids the generic Material look of RN Paper and the setup cost of Tamagui.
- **Light mode only.** Dark mode is out of scope.
- **Time box:** tokens + fonts + base components in ≤1h during the foundation phase; Finn assets ≤1.5h Sat morning (Slice A).

## Tokens (`src/theme/tokens.ts`, mirrored in tailwind config)
| Token | Hex | Use |
|---|---|---|
| `deep` | `#0B2545` | primary text |
| `muted` | `#5B6B82` | secondary text |
| `foam` | `#F3FAFF` | app background |
| `surface` | `#FFFFFF` | cards, Finn bubbles |
| `ocean` | `#2563EB` | primary buttons, user bubbles |
| `lagoon` | `#22C1C3` | accents, progress fills, tab active |
| `coral` | `#FF7A59` | Finn's body color, highlights |
| `sun` | `#FFC845` | celebration, goal-complete |
| `kelp` | `#2FB37F` | success, money in |
| `berry` | `#E5486A` | warnings, money out, worried |

- **Type:** **Nunito** (`@expo-google-fonts/nunito`), a rounded, friendly font, in weights 400/700/800. Sizes: 32 balance hero / 24 title / 17 body / 14 caption. Money uses `fontVariant: ['tabular-nums']`.
- **Shape:** card radius 20, bubble radius 22 (one tighter corner on the speaker's side), pill buttons, soft shadow (`0 4 12 rgba(11,37,69,0.08)`).
- **Spacing:** 4-pt scale; screen padding 16–20; minimum touch target 44.
- **Icons:** Ionicons via `@expo/vector-icons` (bundled with Expo).

## Base components (`src/components/ui`)
- `Button` (primary/secondary/ghost, pill, press scale 0.96 + light haptic)
- `Card` (surface, radius 20, shadow)
- `Sheet` (modal container)
- `ProgressBar` (animated fill in lagoon; sun at 100%)
- `Badge` (unread count)
- `Toast`
- `Money` (formats cents; colored by sign)
- `Chip` (quick replies)

## Finn the mascot
- **Character:** small round **coral-orange fish** with big friendly eyes and a tiny fin wave, on a lagoon-tinted circle.
- **Assets:** generate one consistent character in **4 expressions** (happy, thinking, worried, celebrating) with Gemini's image model, using the same reference image and prompt for each pose for consistency. Then remove the background → transparent PNGs @3x in `assets/finn/`. (Minor Gemini-track mention in the write-up.) Plus app icon + splash from the happy pose.
- **Animation in code, not Lottie,** so the character stays consistent:
  - idle bob (translateY ±4, 2.4s loop)
  - mood change: crossfade + squash-and-stretch bounce
  - `thinking`: gentle side-to-side wiggle while waiting
  - `celebrating`: hop + confetti burst
- **Lottie** only for confetti and an optional bubble-particle background (free LottieFiles assets).
- **Fallback:** if image generation stalls, use 🐟 emoji on a mood-colored circle (happy=lagoon, thinking=ocean, worried=berry, celebrating=sun) so the feature never blocks.
- **Mood rules (also in the agent prompt):**
  - `happy`: default
  - `thinking`: client-only, while loading
  - `worried`: overspending, low balance, bill due or overdue
  - `celebrating`: action executed, goal milestone, savings win

## Motion & feedback
- Message bubbles spring in (Reanimated `FadeInUp`, ~250ms).
- Progress bars animate on mount.
- Approve → success haptic + confetti + Finn `celebrating`.
- Send → light haptic.
- Keep all transitions 200–350ms. Nothing should block input.

## Finn's voice (shared with `agent/prompt.ts`)
- Warm, short: ≤2 sentences; a card carries the details.
- ≤1 emoji and ≤1 fish pun per message.
- Never shames spending. Worried means caring ("Heads up — food delivery is running hot this week 🫧"), not judgmental.
- Always exact amounts and dates. Never invent numbers; if unsure, call a tool.
- For actions: "I can set that up — just tap Approve."

## Accessibility
- Text contrast meets WCAG AA (`deep` on `foam`/`surface`; white on `ocean`).
- `accessibilityLabel` on Finn ("Finn looks happy") and on money amounts.
- Don't rely on color alone: money out also shows "−".

## Design verification
- One screenshot pass on phone + web of every screen and card type against the tokens. Check consistent radii, fonts loaded (no system-font flash), and all four Finn moods visible in a single scripted chat.

---

# Component Plan 5 — Nessie Seed Data & Demo Persona

## Global seed (run once per API key: `pnpm seed:merchants`)
- Create our own merchants (`POST /merchants`) with `category` and Gainesville geocodes, so categories and merchant names are reliable. Write their IDs to `apps/api/src/seed/merchants.generated.json` (committed).
- Merchants:
  - Publix (groceries)
  - Starbucks (coffee)
  - DoorDash (food delivery)
  - Chipotle (dining)
  - Wawa (gas)
  - Spotify, Netflix (subscriptions)
  - AMC (entertainment)
  - UF Bookstore (school)
  - Target (shopping)
  - Uber (transport)

## Persona template "Alex — UF junior" (`seed/personas/alex.ts`)
Applied by `/me/bootstrap` to every new user. All dates are **relative to today**, so the demo always looks current.

- **Accounts:**
  - Checking "Everyday" ≈ $1,240
  - Savings "Rainy Day" $400
  - Pre-made goal account "🌴 Spring Break": $270 of $600 (45%), so a $60 contribution crosses 50% for a milestone moment
- **Deposits (60 days):** biweekly "Campus job" $620; monthly "From Mom 💛" $250.
- **Purchases (~45 over 60 days):**
  - Weekly Publix $40–75; Starbucks 2–3×/week $5–7
  - Monthly Spotify $11.99 and Netflix $15.49
  - Occasional Chipotle, AMC, Target, Uber; one UF Bookstore $120
  - **DoorDash spike:** ~1×/week in earlier weeks, then **4 orders ($18–32) in the last 7 days**, which trips the `spending_spike` nudge
- **Bills:**
  - Rent $750, recurring, 1st of the month
  - Phone (Visible) $45, **due in 2 days**, which trips the `bill_due` nudge
  - GRU electric $82 due in 12 days
  - Renter's insurance $14 recurring
- **Balance consistency:** the spike will tell us whether Nessie purchases and deposits change balances. With the `NESSIE_DEDUCTS` flag on, the seed sets starting balance = target − deposits + purchases; with it off, it sets the target directly.
- **Speed:** create customer + accounts first (fast) and return. Then seed history with `p-limit(6)` concurrency; target < 15s. The app shows the "setting up" loader by polling `GET /me` until `seeded=true` (add a `seeded_at` column to `users`).

## ATM coverage
- Nessie ATMs are read-only, pre-loaded data (we can't create them), historically concentrated around DC.
- **Spike:** `GET /atms?lat=29.6436&lng=-82.3549&rad=10` (UF campus).
- **Fallback chain in `find_nearby_atms`:** requested radius → widen to 25 → 50 mi → if still empty, query `DEMO_ATM_COORDS` (env; a city with data) and Finn says so honestly ("Nessie's sandbox doesn't have ATMs near you yet, so here are some from the demo area").

## Demo account & reset
- Before judging: a dedicated Auth0 demo login (Google social or username/password, MFA enrolled ahead of time).
- `pnpm demo:reset <email>` creates a fresh Nessie customer from the template, repoints the `users` row, clears that user's chat/actions/nudges, and pre-generates nothing else. Run it before every rehearsal and every judge. (Never use Nessie's global `DELETE /data`; it would wipe the merchants too.)

## 3-minute demo script
| Time | Beat | Shows |
|---|---|---|
| 0:00 | Hook: "Banking apps wait for you to open them. Finn texts you first." Open app, Finn waves, Auth0 Google login. | Auth0, design |
| 0:20 | Inbox badge → "Phone bill $45 due in 2 days" → **Pay** → approval sheet → Approve → Finn celebrates. | Nudges, Nessie bill + withdrawal |
| 0:50 | Chat: "What did I spend on food this week?" → spending card; Finn *worried*: DoorDash is running hot. | Gemini tools, Nessie purchases/merchants |
| 1:10 | "What did I buy at Starbucks recently?" → transaction card. | Recent purchases |
| 1:25 | "Where's the nearest ATM?" → ATM cards → Open in Maps. | Nessie ATMs + location |
| 1:40 | "Put $60 toward spring break" → approval → Approve → crosses 50% → confetti + milestone. | Goals = Nessie accounts, transfers |
| 2:05 | "Move $200 to savings" → **MFA step-up** → Approve. Line: "Finn can never move your money without you." | Auth0 for AI agents |
| 2:30 | "Start a goal for a laptop, $900 by May" → approval → new Nessie account appears in Goals. | Account creation |
| 2:45 | Close on an architecture slide: Nessie endpoints used, Gemini function calling, Auth0 step-up. | All tracks |

Backup: record the full script as a video on Sat night after the integration checkpoint, and re-record after freeze.

## Seed verification
- After `demo:reset`: GET Nessie customer accounts → 3 accounts with the expected balances.
- Run a nudge scan → exactly `bill_due` (phone) + `spending_spike` (food delivery).
- Run the demo script twice in a row with a reset between → identical results.

---

# Component Plan 6 — Demo, Pitch & Submission

## Devpost (draft early, edit until deadline)
- **Create the Devpost project Sat ~6pm and submit a rough version by Sat midnight.** Devpost allows edits until the deadline, so a late crash can't cost us the submission.
- **Opt into every prize:** Capital One Best Use of Nessie, MLH Best Use of Gemini API, MLH Best Use of Auth0. Unselected tracks aren't judged.
- **Sections:**
  - **Tagline:** "Finn is the money buddy who texts you first — and never moves a dollar without your OK."
  - **Inspiration:** students only open banking apps after something has gone wrong; money stress; agents that act without consent are scary.
  - **What it does:** chat Q&A, recent purchases, nearby ATMs, goals as real accounts, approvals + step-up, proactive nudges, bill reminders.
  - **How we built it:** architecture diagram + stack.
  - **Track paragraphs** (one each, concrete):
    - *Nessie:* list every endpoint used (customers, accounts create/read, purchases, merchants, deposits, withdrawals, transfers, bills read/update, ATMs) and the "goals are Nessie accounts" design.
    - *Gemini:* function-calling agent with 9 tools, mood-tagged persona, nudge copywriting, mascot art generated with Gemini.
    - *Auth0:* Universal Login, JWT-protected API, human-in-the-loop approvals, MFA step-up via Actions + `acr_values` for agent-initiated money movement.
  - **Challenges, Accomplishments, What we learned, What's next** (CIBA async approval, real push, SMS, receipt scan).
  - **Built with:** tags for each tech.
- **Media:** 4–6 phone screenshots (chat with cards, approval sheet, step-up, goals, inbox) plus the architecture image.

## Video (≤3 min, YouTube unlisted)
- Screen-record the phone (QuickTime/scrcpy) following the demo script, with voiceover.
- Record v1 Sat ~10pm; final take after freeze, Sun ~3am.
- Open with the hook and end on the architecture slide.

## Repo hygiene
- Public GitHub repo with a README covering: one-paragraph pitch, screenshots, architecture, run instructions, `.env.example` files for `apps/api` and `apps/mobile`.
- **No secrets committed.** Check with `git log -p | grep -i key` before making the repo public.

## Live judging pitch
- **30-second version:** problem → Finn texts you first → watch it pay a bill and save for spring break with your approval → built on Nessie + Gemini + Auth0.
- **Live demo** = the 3-minute script. Run `demo:reset` before each judge, keep the phone mirrored to the laptop, and have the backup video ready.
- **Q&A prep:**
  - "What if the AI hallucinates?" → write tools can only propose; server validates ownership + amounts; the user approves.
  - "Security?" → keys server-side, JWT on every route, MFA step-up above $100.
  - "How is this different from a bank chatbot?" → proactive nudges + personality + real actions.
  - "What's next?" → CIBA approvals on a second device, real push, SMS.

## Final-hours checklist
| When (Sun) | Task |
|---|---|
| 1:00am | Feature freeze. Only bug fixes after this. |
| 1–3am | Bug bash on phone + web following the demo script; fix only demo-path bugs. |
| 3–4am | Final video take; screenshots; architecture image. |
| 4–5am | Finish Devpost text, README, `.env.example`; make repo public; secrets check. |
| 5–6am | Rest/buffer; one full rehearsal on the deployed backend. |
| **7:00am** | **Final Devpost submit** (1h buffer before the 8:00am deadline). Verify the video link, repo link, and track selections on the public page. |

---

## Config collected (non-secret)
- Auth0 Domain: `dev-qfcvf4rkm3dp8xsh.us.auth0.com`
- Auth0 Native app Client ID: `qQweRCxviMmTL4nsKygCt8Try2jLvQJL`
- Auth0 API Identifier (audience): `https://api.finni.app` *(confirm it was created)*
- Still needed: Nessie API key, Gemini API key, Neon `DATABASE_URL` (secrets → `.env` only, never in this file)

## Status
All component plans written. **Implementation starts only when the user explicitly says so.** The first implementation step is the shared foundation (Fri 8–11pm block), starting with the Auth0-in-Expo spike.

## Verification
- Run the full demo script on the seeded persona before freeze; every MVP + committed step must work on the demo phone (and web fallback) without dev tools open.
