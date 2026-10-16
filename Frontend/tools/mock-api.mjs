/* ============================================================
   StudyMarket mock API  —  `npm run mock-api`
   ------------------------------------------------------------
   A stand-in for the Spring Boot backend for frontend work when
   Postgres or the JVM is not available. It answers the same paths
   with the same payload shapes, backed by the demo store in
   src/lib/demo.js. Start it on :8080 and the dev server (or the
   app itself when served behind the same origin) will report
   "LIVE API" instead of "DEMO DATA".

   This is a development convenience, NOT the real backend: no
   database, no validation, no auth. Run the Spring Boot app in
   ../backend for the real thing.
   ============================================================ */
import { createServer } from "node:http";

import Demo from "../src/lib/demo.js";

const PORT = Number(process.env.MOCK_API_PORT || 8080);

const json = (res, code, body) => {
  const text = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(text);
};

const round4 = (n) => Math.round(n * 10000) / 10000;

function assetActivity(assetId, days) {
  const a = Demo.assetById(assetId);
  const base = Demo.state.activityToday.find((x) => x.assetId === assetId) || {};
  const out = [];
  let price = a.openingPrice;
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000);
    const wave = Math.sin((i + assetId) / 3.1);
    out.push({
      assetId,
      symbol: a.symbol,
      name: a.name,
      activityDate: day.toISOString().slice(0, 10),
      studyMinutes: Math.max(0, Math.round((base.studyMinutes || 40) * (0.6 + wave * 0.4))),
      studySessions: Math.max(0, Math.round((base.studySessions || 2) * (0.6 + wave * 0.4))),
      activeStudents: Math.max(0, Math.round((base.activeStudents || 5) * (0.7 + wave * 0.3))),
      completedGoals: Math.max(0, Math.round(wave * 3)),
      buyVolume: round4(Math.max(0, (base.buyVolume || 0.02) * (0.5 + wave * 0.5))),
      sellVolume: round4(Math.max(0, (base.sellVolume || 0.01) * (0.5 - wave * 0.4))),
      buyTransactions: Math.round(Math.abs(wave) * 6),
      sellTransactions: Math.round(Math.abs(wave) * 4),
      price
    });
    price = round4(price * (1 + wave * 0.012));
  }
  return out;
}

function trade(side, body) {
  const assetId = Number(body.assetId);
  const quantity = Number(body.quantity);
  if (side === "buy") {
    const r = Demo.buy(assetId, quantity);
    return {
      tradeId: r.trade.tradeId,
      side: "BUY",
      quantity: r.trade.quantity,
      price: r.trade.price,
      totalValue: r.trade.totalValue,
      resultingBalance: r.balance,
      positionQuantity: r.position ? r.position.quantity : 0,
      positionAverageBuyPrice: r.position ? r.position.averageBuyPrice : r.trade.price,
      createdAt: r.trade.createdAt
    };
  }
  const r = Demo.sell(assetId, quantity);
  return {
    tradeId: r.trade.tradeId,
    side: "SELL",
    quantity: r.trade.quantity,
    price: r.trade.price,
    totalValue: r.trade.totalValue,
    resultingBalance: r.balance,
    remainingPositionQuantity: r.position ? r.position.quantity : 0,
    createdAt: r.trade.createdAt
  };
}

function handle(method, path, query, body) {
  const users = Demo.state.users;
  let m;

  if (method === "GET" && path === "/api/health") return { code: 200, body: { status: "UP" } };

  if (method === "GET" && path === "/api/assets") return { code: 200, body: Demo.state.assets };
  if (method === "GET" && (m = path.match(/^\/api\/assets\/(\d+)\/market-activity$/))) {
    return { code: 200, body: assetActivity(Number(m[1]), 30) };
  }
  if (method === "GET" && path === "/api/market-activity/today") {
    return { code: 200, body: Demo.state.activityToday };
  }
  if (method === "POST" && path === "/api/market/run") {
    const r = Demo.runMarket();
    return { code: 200, body: { updated: r.updated } };
  }

  if (method === "GET" && path === "/api/users") return { code: 200, body: users };
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)$/))) {
    const u = users.find((x) => x.id === Number(m[1]));
    return u ? { code: 200, body: u } : { code: 404, body: { message: "User not found" } };
  }
  if (method === "POST" && path === "/api/users") {
    const created = { id: Demo.state.nextId++, ...body, xp: 0, currentStreak: 0, longestStreak: 0 };
    users.push(created);
    return { code: 200, body: created };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/dashboard$/))) {
    return { code: 200, body: Demo.dashboard() };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/stats$/))) {
    return { code: 200, body: Demo.stats() };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/portfolio$/))) {
    return { code: 200, body: Demo.portfolio() };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress$/))) {
    return { code: 200, body: Demo.state.progress };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress\/(\d+)$/))) {
    const p = Demo.state.progress.find((x) => x.assetId === Number(m[2]));
    return p ? { code: 200, body: p } : { code: 404, body: { message: "Progress not found" } };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-progress\/today$/))) {
    return { code: 200, body: Demo.todayProgress() };
  }
  if (method === "PATCH" && (m = path.match(/^\/api\/users\/(\d+)\/daily-goal$/))) {
    return { code: 200, body: Demo.setDailyGoal(Number(body.dailyGoalMinutes)) };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/study-sessions$/))) {
    return { code: 200, body: Demo.state.sessions };
  }
  if (method === "POST" && path === "/api/study-sessions/start") {
    const s = Demo.startSession(Number(body.assetId));
    return {
      code: 200,
      body: {
        id: s.id,
        asset: { id: s.assetId, symbol: s.assetSymbol },
        startedAt: s.startedAt,
        endedAt: null,
        durationSeconds: null,
        status: "ACTIVE",
        xpEarned: null
      }
    };
  }
  if (method === "POST" && (m = path.match(/^\/api\/study-sessions\/(\d+)\/stop$/))) {
    const r = Demo.stopSession();
    return {
      code: 200,
      body: {
        id: Number(m[1]),
        status: "COMPLETED",
        durationSeconds: r.seconds,
        xpEarned: r.xp,
        endedAt: new Date().toISOString()
      }
    };
  }

  if (method === "POST" && path === "/api/assessments") {
    const a = Demo.submitAssessment(Number(body.assetId), Number(body.scorePercentage));
    return {
      code: 200,
      body: {
        assessmentId: a.assessmentId,
        userId: a.userId,
        assetId: a.assetId,
        scorePercentage: a.scorePercentage,
        maxSellPercentage: a.maxSellPercentage,
        createdAt: a.createdAt
      }
    };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/assessments$/))) {
    return {
      code: 200,
      body: Demo.state.assessments.map((a) => ({
        assessmentId: a.assessmentId,
        userId: a.userId,
        assetId: a.assetId,
        scorePercentage: a.scorePercentage,
        maxSellPercentage: a.maxSellPercentage,
        createdAt: a.createdAt
      }))
    };
  }

  if (method === "POST" && path === "/api/trades/buy") return { code: 200, body: trade("buy", body) };
  if (method === "POST" && path === "/api/trades/sell") return { code: 200, body: trade("sell", body) };
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/purchase-eligibility$/))) {
    return { code: 200, body: Demo.purchaseEligibilityAll() };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/positions$/))) {
    return { code: 200, body: Demo.portfolio().positions };
  }

  if (method === "GET" && path.startsWith("/api/leaderboard")) {
    return { code: 200, body: Demo.leaderboard() };
  }
  if (method === "GET" && path === "/api/achievements") {
    return { code: 200, body: Demo.state.achievements };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/achievements$/))) {
    return {
      code: 200,
      body: Demo.state.unlocked.map((u) => {
        const a = Demo.state.achievements.find((x) => x.code === u.code);
        return { code: a.code, name: a.name, description: a.description, unlockedAt: u.unlockedAt };
      })
    };
  }
  if (method === "GET" && path === "/api/challenges") return { code: 200, body: Demo.state.challenges };
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/challenges$/))) {
    return { code: 200, body: Demo.state.userChallenges };
  }
  if (method === "POST" && (m = path.match(/^\/api\/users\/(\d+)\/challenges\/(\d+)\/claim$/))) {
    return { code: 200, body: Demo.claimChallenge(Number(m[2])) };
  }

  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/friends$/))) {
    return {
      code: 200,
      body: Demo.state.friends.map((f) => ({ id: f.id, username: f.username }))
    };
  }
  if (method === "GET" && (m = path.match(/^\/api\/users\/(\d+)\/friend-requests$/))) {
    return {
      code: 200,
      body: Demo.state.requests.filter((r) => r.status === "PENDING" && !r.outgoing)
    };
  }
  if (method === "POST" && path === "/api/friends/requests") {
    Demo.sendRequest(Number(body.receiverUserId), body.receiverName || "student");
    return {
      code: 200,
      body: { id: Demo.state.nextId - 1, senderId: Demo.state.me, status: "PENDING" }
    };
  }
  if (method === "POST" && (m = path.match(/^\/api\/friends\/requests\/(\d+)\/accept$/))) {
    return { code: 200, body: Demo.acceptRequest(Number(m[1])) };
  }
  if (method === "POST" && (m = path.match(/^\/api\/friends\/requests\/(\d+)\/reject$/))) {
    return { code: 200, body: Demo.rejectRequest(Number(m[1])) };
  }

  return { code: 404, body: { message: "mock api: no route for " + method + " " + path } };
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, null);
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://localhost");
    let body = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch (e) {
        return json(res, 400, { message: "invalid JSON body" });
      }
    }
    const path = decodeURIComponent(url.pathname);
    let out;
    try {
      out = handle(req.method, path, url.searchParams, body);
    } catch (e) {
      // domain refusals carry the JSON body the real backend sends
      const studyRequired = e.payload && e.payload.code === "STUDY_REQUIRED";
      out = { code: studyRequired ? 409 : e.code === "STUDY_REQUIRED" ? 409 : 400, body: e.payload || { message: e.message } };
    }
    console.log(req.method + " " + path + " -> " + out.code);
    json(res, out.code, out.body);
  });
});

server.listen(PORT, () => {
  console.log("StudyMarket mock API listening on http://localhost:" + PORT);
  console.log("(stand-in for the Spring Boot backend — see README)");
});
