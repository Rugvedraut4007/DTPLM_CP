# StudyMarket — Study. Trade. Master.

A gamified learning platform with two connected worlds: **Study** (focus sessions, XP, streaks,
assessments) and **Market** (subject shares, portfolio, trading in simulated BTC).

One rule ties them together: **you cannot buy a subject asset until you have studied that subject,
and you can only sell the quantity your assessment score allows.**

- **`backend/`** — Spring Boot REST API (Java, PostgreSQL)
- **`Frontend/`** — React single-page app (Vite)

---

## 1. What to install

| # | Tool | Version | Check (run in a terminal) |
| --- | --- | --- | --- |
| 1 | **Java (JDK)** | 25 | `java -version` |
| 2 | **PostgreSQL** | 14 or newer | `psql --version` |
| 3 | **Node.js** | 18+ (20+ recommended) | `node -v` |
| 4 | **npm** | any — ships with Node | `npm -v` |

Download: [Java JDK 25 (Temurin)](https://adoptium.net/temurin/releases/) ·
[PostgreSQL](https://www.postgresql.org/download/) · [Node.js LTS](https://nodejs.org/)

You do **not** need to install Maven or Vite — the backend includes the Maven wrapper (`mvnw`) and
Vite is installed locally by `npm install`. When installing PostgreSQL, remember the password you
set for the `postgres` user; you'll need it in Step 2 below.

> **Using an older JDK?** If `java -version` shows anything below 25, either install JDK 25 or edit
> `backend/pom.xml` and change `<java.version>25</java.version>` to your version (21 works).

---

## 2. How to run the project

Two ways to run it. **Way A** is the fastest start and needs no database. **Way B** is the full
setup with the real backend.

### Way A — frontend only (easiest, no Java or Postgres needed)

**Step 1.** Install frontend dependencies (first time only):

```bash
cd Frontend
npm install
```

**Step 2.** Start the dev server:

```bash
npm run dev
```

**Step 3.** Open **<http://localhost:5173>**.

The backend isn't running, so the app automatically switches to **◆ DEMO DATA** — seeded subjects,
users, trades and XP, all clickable and persisted in your browser. The badge in the top bar shows
which mode you're in.

### Way B — full stack (real backend + database)

**Step 1. Create the database (once).**

Start PostgreSQL, then create a database called `study_market`:

```bash
psql -U postgres -c "CREATE DATABASE study_market;"
```

**Step 2. Set your database password (in every terminal that runs the backend).**

The password is never stored in the repo — the backend reads it from an environment variable. You
can export it by hand (commands below), **or** keep it in a local [.env](.env) file (gitignored —
copy [.env.example](.env.example), fill in your value) and load it with:

```bash
set -a; source .env; set +a        # macOS / Linux / Git Bash
```

```powershell
# Windows PowerShell
Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') {
  [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }
```

```bash
# macOS / Linux / Git Bash
export STUDYMARKET_DB_PASSWORD=your-postgres-password

# Windows PowerShell
$env:STUDYMARKET_DB_PASSWORD="your-postgres-password"

# Windows cmd.exe
set STUDYMARKET_DB_PASSWORD=your-postgres-password
```

**Step 3. Start the backend — terminal 1:**

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

Wait for `Started StudyMarketApplication`, then check it's alive:

```bash
curl http://localhost:8080/api/health      # → {"status":"UP"}
```

All tables and starter subject data are created automatically by Flyway on this first start — no
manual SQL needed. The REST API is at <http://localhost:8080/api/...>, and the original static UI
ships inside the jar at <http://localhost:8080/>.

**Step 4. Start the frontend — terminal 2:**

```bash
cd Frontend
npm install          # first time only
npm run dev
```

Open **<http://localhost:5173>** — the badge should now read **● LIVE API**. The Vite dev server
proxies every `/api/...` request to `:8080`, so the backend needs no CORS configuration.

To try the market: click **restricted zone** in the sidebar, enter any passphrase to unlock the
Vault, then open **Market** — a locked subject's BUY button routes you to Study World until you've
completed its required study minutes.

### Optional — mock API (frontend work without Java/Postgres)

```bash
cd Frontend
npm run mock-api      # terminal 1 — serves the API shape on :8080 from demo data
npm run dev           # terminal 2
```

`Frontend/tools/mock-api.mjs` is a dev stand-in for the Spring Boot backend — useful for frontend
work, **not** a replacement for it.

---

## 3. Production build

```bash
cd Frontend
npm run build         # → Frontend/dist (index.html + hashed assets)
npm run preview       # serves dist on http://localhost:4173 to check it locally
```

`dist/` is plain static output. Serve it behind the **same origin** as the API (e.g. nginx/CDN with a
reverse proxy for `/api`, or Spring Boot serving the files) so requests stay same-origin. If you must
host the UI on a different origin, point the client elsewhere and enable CORS on the backend:

```js
localStorage.setItem("studymarket.api", "http://localhost:8080");   // then reload
```

---

## 4. Using the app

| Zone | Routes | Notes |
| --- | --- | --- |
| Study (light) | `/` Dashboard, `/study`, `/assessments`, `/challenges`, `/leaderboard`, `/friends` | study sessions earn 2 XP per focused minute |
| Vault (dark) | `/vault`, `/market`, `/trade`, `/portfolio`, `/stats` | click **restricted zone** in the sidebar, then any passphrase unlocks it for the session |

### How the market works

Buying and selling sit on opposite sides of what you have demonstrated:

- **Buying requires study.** Every subject asset carries a `requiredStudyMinutes` requirement
  (`5 + global_importance`, so a 10/10 subject needs 15 minutes). `POST /api/trades/buy` rejects the
  order until your **completed** study sessions on that subject add up to the requirement. Study can
  span several sessions, and the subject stays unlocked once the requirement is met.
- **Buying routes you through Study World.** Clicking a locked subject in Market or Trade opens a
  **purchase request** in the Study view: a required timer counts down the minutes still missing.
  Stop the session so the backend validates it, and the purchase unlocks.
- **Selling requires an assessment.** Score `<50%` → 0%, `50%` → 25%, `70%` → 50%, `85%` → 75%,
  `95%` → 100% of a position. You can sell only that fraction of what you hold.

The whole loop:

```
Market: pick a subject, click BUY
        │  (not studied enough)
        ▼
Study World: complete the required session  →  backend validates it
        ▼
Purchase unlocked: balance checked, order settles at mark, asset joins your portfolio
        ▼
Keep studying → take an assessment → sell only the eligible quantity
```

### API endpoints the frontend uses

```
GET    /api/health                                  POST /api/users
GET    /api/assets                                  GET  /api/users/{id}
GET    /api/assets/{id}/market-activity             GET  /api/users/{id}/dashboard
GET    /api/market-activity/today                   GET  /api/users/{id}/stats
POST   /api/market/run                              GET  /api/users/{id}/portfolio
POST   /api/trades/buy                              GET  /api/users/{id}/purchase-eligibility
POST   /api/trades/sell                             GET  /api/users/{id}/study-progress
POST   /api/assessments                             GET  /api/users/{id}/study-progress/today
GET    /api/users/{id}/assessments                  PATCH /api/users/{id}/daily-goal
GET    /api/leaderboard?limit=n                     POST /api/study-sessions/start
GET    /api/challenges                              POST /api/study-sessions/{id}/stop
GET    /api/users/{id}/challenges                   GET  /api/users/{id}/study-sessions
POST   /api/users/{id}/challenges/{cid}/claim       GET  /api/users/{id}/friends
GET    /api/achievements                            GET  /api/users/{id}/friend-requests
GET    /api/users/{id}/achievements                 POST /api/friends/requests
                                                     POST /api/friends/requests/{id}/accept|reject
```

### The buy gate: `STUDY_REQUIRED`

`GET /api/users/{id}/purchase-eligibility` returns one record per subject:

```json
{
  "assetId": 11, "symbol": "IS", "name": "Information Security",
  "requiredStudyMinutes": 12, "studiedMinutes": 0, "remainingMinutes": 12,
  "unlocked": false
}
```

A buy attempted before the requirement is met is rejected with **409**:

```json
{
  "code": "STUDY_REQUIRED",
  "message": "Study required before buying IS — 0 of 12 minutes done (12 more to unlock).",
  "assetId": 11, "symbol": "IS", "requiredStudyMinutes": 12,
  "studiedMinutes": 0, "remainingMinutes": 12, "unlocked": false
}
```

Both UIs catch that code and route the student to the subject's Study view with the purchase
request open. The demo store mirrors the same rule, so the flow behaves identically offline.

---

## 5. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `error: release version 25 not supported` | JDK older than 25 — install JDK 25, or lower `<java.version>` in `backend/pom.xml` |
| `Connection to localhost:5432 refused` | PostgreSQL not running, or wrong port |
| `password authentication failed for user "postgres"` | `STUDYMARKET_DB_PASSWORD` not set in this terminal (Step 2 of Way B) |
| `database "study_market" does not exist` | run the `CREATE DATABASE` command in Step 1 of Way B |
| Browser console shows `502` / `Failed to load resource` for `/api/health` | backend not running — the app has fallen back to **◆ DEMO DATA**; start the backend and reload |
| Buy button says “study N min to unlock” | expected — the subject's study requirement is not met; complete the required session in Study |
| Buy rejected with `409 STUDY_REQUIRED` | the API enforces the same rule server-side; study the subject, then retry |
| `Port 8080 is already in use` | stop the other process, or run the backend with `--server.port=8090` |
| `Port 5173 is already in use` | Vite picks the next free port automatically; use the URL it prints |
| UI shows old demo data after a code change | the demo store lives in `localStorage`; remove the `studymarket.demo.v3` key and reload |
| `npm install` fails behind a proxy | configure the npm registry proxy, or copy a populated `node_modules` |

---

## 6. Project layout

```
backend/
  pom.xml                     Spring Boot project, Java 25
  mvnw, mvnw.cmd              Maven wrapper (no Maven install needed)
  src/main/java/com/studymarket/...   controllers, services, entities
  src/main/resources/
    application.properties    datasource + JPA settings
    db/migration/V*.sql       Flyway schema + seed data
    static/                   original vanilla-JS UI, still served at :8080/

Frontend/
  package.json                scripts: dev, build, preview, mock-api
  vite.config.js              React plugin + /api proxy to :8080
  index.html
  src/
    main.jsx, App.jsx         entry + shell, routing, vault guard
    styles.css                the app stylesheet
    lib/                      api client, demo store, formatters, routes, helpers
    state/AppContext.jsx      connection mode, current user, session, vault lock, toasts
    components/               sidebar, topbar, toasts, charts, focus bar, UI pieces
    views/                    one component per route
  tools/mock-api.mjs          dev-only stand-in API (optional)
```
