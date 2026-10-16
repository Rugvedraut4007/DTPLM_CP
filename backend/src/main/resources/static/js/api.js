/* ============================================================
   StudyMarket API client
   Talks to the Spring Boot backend when it is reachable
   (same origin when served by the backend, else localhost:8080).
   Every call falls back to the local Demo store so the UI is
   fully interactive without Postgres running.
   ============================================================ */
(function () {
  "use strict";

  const savedBase = localStorage.getItem("studymarket.api");
  const sameOrigin = window.location.port === "8080" || window.location.protocol === "file:";
  const BASE = savedBase !== null ? savedBase : sameOrigin ? "" : "http://localhost:8080";

  const state = {
    mode: "unknown", // 'live' | 'demo'
    checked: false
  };

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
    return state.mode;
  }

  /* ---------------- demo handlers ---------------- */
  const D = () => window.Demo;

  const demoHandlers = {
    "GET /api/assets": () => D().state.assets,
    "GET /api/health": () => ({ status: "UP" }),

    "GET /api/users": () => D().state.users,

    "POST /api/trades/buy": (path, body) => {
      const r = D().buy(body.assetId, body.quantity);
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
      const r = D().sell(body.assetId, body.quantity);
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
      const s = D().startSession(body.assetId);
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

    "POST /api/market/run": () => D().runMarket(),

    "POST /api/assessments": (path, body) => {
      const a = D().submitAssessment(body.assetId, Number(body.scorePercentage));
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
      D().sendRequest(body.receiverUserId, body.receiverName || "student");
      return { id: 0, status: "PENDING" };
    }
  };

  function demoFallback(method, rawPath, body) {
    // ignore query strings when matching demo routes (live fetch keeps them)
    const path = rawPath.split("?")[0];
    const key = method + " " + path;
    if (demoHandlers[key]) return Promise.resolve(demoHandlers[key](path, body));

    // dynamic patterns
    let m;

    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/dashboard$/))) {
      return Promise.resolve(D().dashboard());
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/stats$/))) {
      return Promise.resolve(D().stats());
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)$/))) {
      const u = D().state.users.find((x) => x.id === Number(m[1]));
      return u ? Promise.resolve(u) : Promise.reject(new Error("User not found: " + m[1]));
    }
    if (method === "GET" && path.startsWith("/api/leaderboard")) {
      return Promise.resolve(D().leaderboard());
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress\/today$/))) {
      return Promise.resolve(D().todayProgress());
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress$/))) {
      return Promise.resolve(D().state.progress);
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-sessions$/))) {
      return Promise.resolve(D().state.sessions);
    }
    if (method === "PATCH" && (m = path.match(/^\/api\/users\/(\d+)\/daily-goal$/))) {
      return Promise.resolve(D().setDailyGoal(Number(body.dailyGoalMinutes)));
    }
    if (method === "POST" && (m = path.match(/^\/api\/study-sessions\/(\d+)\/stop$/))) {
      try {
        const r = D().stopSession();
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
        D().state.assessments.map((a) => ({
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
      return Promise.resolve(D().state.challenges);
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/challenges$/))) {
      return Promise.resolve(D().state.userChallenges);
    }
    if (method === "POST" && (m = path.match(/^\/api\/users\/(\d+)\/challenges\/(\d+)\/claim$/))) {
      try {
        return Promise.resolve(D().claimChallenge(Number(m[2])));
      } catch (e) {
        return Promise.reject(e);
      }
    }
    if (method === "GET" && path === "/api/achievements") {
      return Promise.resolve(D().state.achievements);
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/achievements$/))) {
      return Promise.resolve(
        D().state.unlocked.map((u) => {
          const a = D().state.achievements.find((x) => x.code === u.code);
          return { code: a.code, name: a.name, description: a.description, unlockedAt: u.unlockedAt };
        })
      );
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/friends$/))) {
      return Promise.resolve(D().state.friends);
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/friend-requests$/))) {
      return Promise.resolve(
        D().state.requests.filter((r) => r.status === "PENDING" && !r.outgoing)
      );
    }
    if (method === "POST" && (m = path.match(/^\/api\/friends\/requests\/(\d+)\/accept$/))) {
      return Promise.resolve(D().acceptRequest(Number(m[1])));
    }
    if (method === "POST" && (m = path.match(/^\/api\/friends\/requests\/(\d+)\/reject$/))) {
      return Promise.resolve(D().rejectRequest(Number(m[1])));
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/portfolio$/))) {
      return Promise.resolve(D().portfolio());
    }
    if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/purchase-eligibility$/))) {
      return Promise.resolve(D().purchaseEligibilityAll());
    }
    if (method === "GET" && path === "/api/market-activity/today") {
      return Promise.resolve(D().state.activityToday);
    }
    if (method === "GET" && (m = path.match(/^\/api\/assets\/(\d+)\/market-activity$/))) {
      return Promise.resolve(demoAssetActivity(Number(m[1])));
    }

    return Promise.reject(new Error("Demo: unsupported endpoint " + key));
  }

  // synthesize a 30-day activity history for the market detail view
  function demoAssetActivity(assetId) {
    const a = D().assetById(assetId);
    const base = D().state.activityToday.find((x) => x.assetId === assetId) || {};
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

  const API = {
    state,
    detect,
    request,
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body ?? {}),
    patch: (path, body) => request("PATCH", path, body ?? {}),
    base: BASE
  };

  function notifyMode() {
    document.dispatchEvent(new CustomEvent("sm:mode", { detail: state.mode }));
  }

  window.API = API;
})();
