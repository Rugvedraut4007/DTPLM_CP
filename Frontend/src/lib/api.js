/* ============================================================
   StudyMarket API client
   Talks to the Spring Boot backend. Requests go to the same
   origin: in development Vite proxies /api -> http://localhost:8080
   (see vite.config.js), in production the built assets are served
   behind the same origin as the API.
   Every call falls back to the local Demo store so the UI stays
   fully interactive even when Postgres / the backend is down.
   ============================================================ */

import Demo from "./demo.js";

const savedBase = localStorage.getItem("studymarket.api");
// override with localStorage.setItem("studymarket.api", "http://host:8080") if needed
export const BASE = savedBase !== null ? savedBase : "";

const state = {
  mode: "unknown", // 'live' | 'demo'
  checked: false
};

const listeners = new Set();

function notifyMode() {
  listeners.forEach((fn) => fn(state.mode));
}

export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function raw(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let detail = res.status + " " + res.statusText;
    let payload = null;
    try {
      const text = await res.text();
      if (text) {
        try {
          const j = JSON.parse(text);
          payload = j;
          detail = j.message || j.error || text;
        } catch (e) {
          detail = text.slice(0, 200);
        }
      }
    } catch (e) { /* ignore body read errors */ }
    const err = new Error(detail);
    err.status = res.status;
    err.fromServer = true;
    // the parsed error body, e.g. {code: "STUDY_REQUIRED", remainingMinutes: 12}
    err.payload = payload;
    throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function detect() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(BASE + "/api/health", { signal: ctrl.signal });
    clearTimeout(t);
    state.mode = res.ok ? "live" : "demo";
  } catch (e) {
    state.mode = "demo";
  }
  state.checked = true;
  notifyMode();
  return state.mode;
}

/* ---------------- demo handlers ---------------- */
const demoHandlers = {
  "GET /api/assets": () => Demo.state.assets,
  "GET /api/health": () => ({ status: "UP" }),

  "GET /api/users": () => Demo.state.users,

  "POST /api/trades/buy": (path, body) => {
    const r = Demo.buy(body.assetId, body.quantity);
    const t = r.trade;
    return {
      tradeId: t.tradeId,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      totalValue: t.totalValue,
      resultingBalance: r.balance,
      positionQuantity: r.position ? r.position.quantity : 0,
      positionAverageBuyPrice: r.position ? r.position.averageBuyPrice : t.price,
      createdAt: t.createdAt
    };
  },
  "POST /api/trades/sell": (path, body) => {
    const r = Demo.sell(body.assetId, body.quantity);
    const t = r.trade;
    return {
      tradeId: t.tradeId,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      totalValue: t.totalValue,
      resultingBalance: r.balance,
      remainingPositionQuantity: r.position ? r.position.quantity : 0,
      createdAt: t.createdAt
    };
  },

  "POST /api/study-sessions/start": (path, body) => {
    const s = Demo.startSession(body.assetId);
    return {
      id: s.id,
      asset: { id: s.assetId, symbol: s.assetSymbol },
      startedAt: s.startedAt,
      endedAt: null,
      durationSeconds: null,
      status: "ACTIVE",
      xpEarned: null
    };
  },

  "POST /api/market/run": () => Demo.runMarket(),

  "POST /api/assessments": (path, body) => {
    const a = Demo.submitAssessment(body.assetId, Number(body.scorePercentage));
    return {
      assessmentId: a.assessmentId,
      userId: a.userId,
      assetId: a.assetId,
      scorePercentage: a.scorePercentage,
      maxSellPercentage: a.maxSellPercentage,
      createdAt: a.createdAt
    };
  },

  "POST /api/friends/requests": (path, body) => {
    Demo.sendRequest(body.receiverUserId, body.receiverName || "student");
    return { id: 0, status: "PENDING" };
  }
};

// synthesize a 30-day activity history for the market detail view
function demoAssetActivity(assetId) {
  const a = Demo.assetById(assetId);
  const base = Demo.state.activityToday.find((x) => x.assetId === assetId) || {};
  const out = [];
  let price = a.openingPrice;
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000);
    const wave = Math.sin((i + assetId) / 3.1);
    out.push({
      assetId,
      symbol: a.symbol,
      activityDate: day.toISOString().slice(0, 10),
      studyMinutes: Math.max(0, Math.round((base.studyMinutes || 40) * (0.6 + wave * 0.4))),
      studySessions: Math.max(0, Math.round((base.studySessions || 2) * (0.6 + wave * 0.4))),
      activeStudents: Math.max(0, Math.round((base.activeStudents || 5) * (0.7 + wave * 0.3))),
      completedGoals: Math.max(0, Math.round(wave * 3)),
      buyVolume: round4(Math.max(0, (base.buyVolume || 0.02) * (0.5 + wave * 0.5))),
      sellVolume: round4(Math.max(0, (base.sellVolume || 0.01) * (0.5 - wave * 0.4))),
      buyTransactions: Math.round(Math.abs(wave) * 6),
      sellTransactions: Math.round(Math.abs(wave) * 4),
      price: price
    });
    price = round4(price * (1 + wave * 0.012));
  }
  return out;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function demoFallback(method, rawPath, body) {
  // ignore query strings when matching demo routes (live fetch keeps them)
  const path = rawPath.split("?")[0];
  const key = method + " " + path;
  if (demoHandlers[key]) return Promise.resolve(demoHandlers[key](path, body));

  // dynamic patterns
  let m;

  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/dashboard$/))) {
    return Promise.resolve(Demo.dashboard());
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/stats$/))) {
    return Promise.resolve(Demo.stats());
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)$/))) {
    const u = Demo.state.users.find((x) => x.id === Number(m[1]));
    return u ? Promise.resolve(u) : Promise.reject(new Error("User not found: " + m[1]));
  }
  if (method === "GET" && path.startsWith("/api/leaderboard")) {
    return Promise.resolve(Demo.leaderboard());
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress\/today$/))) {
    return Promise.resolve(Demo.todayProgress());
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress$/))) {
    return Promise.resolve(Demo.state.progress);
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-sessions$/))) {
    return Promise.resolve(Demo.state.sessions);
  }
  if (method === "PATCH" && (m = path.match(/^\/api\/users\/(\d+)\/daily-goal$/))) {
    return Promise.resolve(Demo.setDailyGoal(Number(body.dailyGoalMinutes)));
  }
  if (method === "POST" && (m = path.match(/^\/api\/study-sessions\/(\d+)\/stop$/))) {
    try {
      const r = Demo.stopSession();
      return Promise.resolve({
        id: Number(m[1]),
        status: "COMPLETED",
        durationSeconds: r.seconds,
        xpEarned: r.xp,
        endedAt: new Date().toISOString()
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/assessments$/))) {
    return Promise.resolve(
      Demo.state.assessments.map((a) => ({
        assessmentId: a.assessmentId,
        userId: a.userId,
        assetId: a.assetId,
        scorePercentage: a.scorePercentage,
        maxSellPercentage: a.maxSellPercentage,
        // extra vs the live payload so the UI can show live remaining rights
        remainingSellPercentage: a.remainingSellPercentage,
        createdAt: a.createdAt
      }))
    );
  }
  if (method === "GET" && path === "/api/challenges") {
    return Promise.resolve(Demo.state.challenges);
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/challenges$/))) {
    return Promise.resolve(Demo.state.userChallenges);
  }
  if (method === "POST" && (m = path.match(/^\/api\/users\/(\d+)\/challenges\/(\d+)\/claim$/))) {
    try {
      return Promise.resolve(Demo.claimChallenge(Number(m[2])));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  if (method === "GET" && path === "/api/achievements") {
    return Promise.resolve(Demo.state.achievements);
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/achievements$/))) {
    return Promise.resolve(
      Demo.state.unlocked.map((u) => {
        const a = Demo.state.achievements.find((x) => x.code === u.code);
        return { code: a.code, name: a.name, description: a.description, unlockedAt: u.unlockedAt };
      })
    );
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/friends$/))) {
    return Promise.resolve(Demo.state.friends);
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/friend-requests$/))) {
    return Promise.resolve(
      Demo.state.requests.filter((r) => r.status === "PENDING" && !r.outgoing)
    );
  }
  if (method === "POST" && (m = path.match(/^\/api\/friends\/requests\/(\d+)\/accept$/))) {
    return Promise.resolve(Demo.acceptRequest(Number(m[1])));
  }
  if (method === "POST" && (m = path.match(/^\/api\/friends\/requests\/(\d+)\/reject$/))) {
    return Promise.resolve(Demo.rejectRequest(Number(m[1])));
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/portfolio$/))) {
    return Promise.resolve(Demo.portfolio());
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/purchase-eligibility$/))) {
    return Promise.resolve(Demo.purchaseEligibilityAll());
  }
  if (method === "GET" && path === "/api/market-activity/today") {
    return Promise.resolve(Demo.state.activityToday);
  }
  if (method === "GET" && (m = path.match(/^\/api\/assets\/(\d+)\/market-activity$/))) {
    return Promise.resolve(demoAssetActivity(Number(m[1])));
  }

  return Promise.reject(new Error("Demo: unsupported endpoint " + key));
}

/* ---------------- public ---------------- */
async function request(method, path, body) {
  if (state.mode === "unknown") await detect();
  if (state.mode === "live") {
    try {
      return await raw(method, path, body);
    } catch (e) {
      if (e.fromServer) throw e; // real server error — surface it
      // network died mid-session → degrade to demo
      state.mode = "demo";
      notifyMode();
    }
  }
  return demoFallback(method, path, body);
}

export const API = {
  state,
  detect,
  request,
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body ?? {}),
  base: BASE
};

export default API;
