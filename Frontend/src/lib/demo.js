/* ============================================================
   StudyMarket demo state
   Mirrors the Spring Boot API payloads so the UI works even
   when the backend / Postgres is not reachable. Persisted to
   localStorage so your trades and sessions survive reloads.
   ============================================================ */

const STORE_KEY = "studymarket.demo.v3";

/* the store is shared with the dev mock API (node), which has no localStorage */
const memory = new Map();
const LS = {
  get(key) {
    try {
      if (typeof localStorage !== "undefined") return localStorage.getItem(key);
    } catch (e) { /* blocked */ }
    return memory.has(key) ? memory.get(key) : null;
  },
  set(key, value) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
        return;
      }
    } catch (e) { /* storage full/blocked — keep in-memory */ }
    memory.set(key, value);
  }
};

// deterministic RNG so sparklines look the same every load
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
const now = Date.now();

function iso(ts) {
  return new Date(ts).toISOString();
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

/* ---------------- seed ---------------- */
function seed() {
  const assetDefs = [
    ["DSA", "Data Structures & Algorithms", "Core", 10, 0.05],
    ["DBMS", "Database Management Systems", "Core", 9, 0.045],
    ["OS", "Operating Systems", "Core", 9, 0.045],
    ["CN", "Computer Networks", "Core", 8, 0.04],
    ["OOP", "Object-Oriented Programming", "Core", 8, 0.04],
    ["COA", "Computer Organization & Architecture", "Core", 7, 0.035],
    ["TOC", "Theory of Computation", "Core", 7, 0.035],
    ["AI", "Artificial Intelligence", "AI", 9, 0.045],
    ["ML", "Machine Learning", "AI", 9, 0.045],
    ["DL", "Deep Learning", "AI", 8, 0.04],
    ["IS", "Information Security", "Core", 7, 0.035],
    ["FSD", "Full Stack Development", "Development", 8, 0.04],
    ["CLOUD", "Cloud Computing", "Development", 7, 0.035]
  ];

  const assets = assetDefs.map((d, i) => {
    const r = rng(1000 + i * 7);
    const drift = (r() - 0.42) * 0.06; // +/- 6%
    const current = Math.max(0.0001, Math.round(d[4] * (1 + drift) * 10000) / 10000);
    return {
      id: i + 1,
      symbol: d[0],
      name: d[1],
      description: null,
      branch: "Computer Science",
      category: d[2],
      globalImportance: d[3],
      // learning unlocks buying: minutes of study required before buying
      requiredStudyMinutes: requiredMinutesForImportance(d[3]),
      openingPrice: d[4],
      currentPrice: current,
      status: "ACTIVE",
      createdAt: iso(now - 60 * DAY)
    };
  });

  const users = [
    ["arjun_dev", "arjun@studymarket.dev", 1450, 6, 21, 60, 0.6118],
    ["diya_sharma", "diya@studymarket.dev", 3120, 18, 34, 45, 0.8421],
    ["rohan_gupta", "rohan@studymarket.dev", 2750, 9, 26, 45, 0.7333],
    ["meera_iyer", "meera@studymarket.dev", 2210, 12, 19, 30, 0.6905],
    ["kabir_singh", "kabir@studymarket.dev", 1980, 4, 15, 60, 0.5127],
    ["isha_verma", "isha@studymarket.dev", 1640, 3, 11, 30, 0.9012],
    ["vihaan_joshi", "vihaan@studymarket.dev", 1210, 2, 9, 30, 0.4444],
    ["sara_khan", "sara@studymarket.dev", 870, 1, 5, 30, 0.975]
  ].map((u, i) => ({
    id: i + 1,
    username: u[0],
    email: u[1],
    simulatedBtcBalance: u[6],
    xp: u[2],
    dailyGoalMinutes: u[5],
    currentStreak: u[3],
    longestStreak: u[4],
    lastGoalCompletedDate: null,
    createdAt: iso(now - 90 * DAY)
  }));

  const assetById = (id) => assets.find((a) => a.id === id);

  const positions = [
    { assetId: 1, quantity: 6.5, avg: 0.0498 },
    { assetId: 8, quantity: 4.2, avg: 0.0451 },
    { assetId: 12, quantity: 3.0, avg: 0.0392 }
  ].map((p) => {
    const a = assetById(p.assetId);
    return {
      assetId: p.assetId,
      symbol: a.symbol,
      name: a.name,
      quantity: p.quantity,
      averageBuyPrice: p.avg,
      currentPrice: a.currentPrice
    };
  });

  const trades = [
    [12, "BUY", 3.0, 0.0392, 1.6],
    [8, "BUY", 2.2, 0.0448, 2.4],
    [1, "BUY", 3.5, 0.0498, 3.1],
    [3, "SELL", 2.0, 0.0461, 4.7],
    [8, "BUY", 2.0, 0.0455, 5.2],
    [4, "BUY", 2.0, 0.0402, 6.5],
    [1, "BUY", 3.0, 0.0497, 8.0]
  ].map((t, i) => {
    const a = assetById(t[0]);
    return {
      tradeId: 100 + i,
      assetId: t[0],
      symbol: a.symbol,
      side: t[1],
      quantity: t[2],
      price: t[3],
      totalValue: Math.round(t[2] * t[3] * 10000) / 10000,
      createdAt: iso(now - t[4] * DAY)
    };
  });

  // 14-day study minutes (index 13 = today)
  const dailyMinutes = [45, 60, 30, 75, 90, 0, 50, 65, 40, 80, 55, 70, 35, 42];

  const progressDefs = [
    [1, 470], [8, 265], [12, 190], [2, 120], [3, 95],
    [4, 60], [9, 35], [13, 20], [5, 12], [6, 0]
  ];
  const progress = progressDefs.map((p) => {
    const a = assetById(p[0]);
    const target = 600;
    const pct = Math.min(100, Math.round((p[1] / target) * 10000) / 100);
    return {
      assetId: p[0],
      symbol: a.symbol,
      assetName: a.name,
      targetMinutes: target,
      completedMinutes: p[1],
      progressPercentage: pct
    };
  });

  const sessions = [];
  let sid = 500;
  dailyMinutes.forEach((mins, dayIdx) => {
    if (mins <= 0) return;
    const assetId = [1, 8, 12, 2, 3][dayIdx % 5];
    const started = now - (13 - dayIdx) * DAY + 10 * 3600000;
    sessions.push({
      id: sid++,
      assetId,
      assetSymbol: assetById(assetId).symbol,
      startedAt: iso(started),
      endedAt: iso(started + mins * 60000),
      durationSeconds: mins * 60,
      status: "COMPLETED",
      xpEarned: mins * 2
    });
  });

  const achievements = [
    { code: "FIRST_SESSION", name: "First Step", description: "Complete your first study session." },
    { code: "FIVE_HOURS", name: "Study Starter", description: "Complete 5 total hours of study." },
    { code: "SEVEN_DAY_STREAK", name: "Week Warrior", description: "Reach a 7-day streak." },
    { code: "MASTERED_ASSET", name: "Subject Master", description: "Reach 100% progress on any asset." },
    { code: "SEVEN_GOALS", name: "Goal Crusher", description: "Complete the daily goal on 7 different calendar days." }
  ];
  const unlocked = [
    { code: "FIRST_SESSION", unlockedAt: iso(now - 80 * DAY) },
    { code: "FIVE_HOURS", unlockedAt: iso(now - 24 * DAY) },
    { code: "SEVEN_DAY_STREAK", unlockedAt: iso(now - 12 * DAY) }
  ];

  const challenges = [
    { id: 1, code: "STUDY_60_MIN", name: "Study for 60 Minutes", description: "Log a full hour of focused study — it can span several sessions.", type: "STUDY_MINUTES", targetValue: 60, xpReward: 50, active: true },
    { id: 2, code: "STUDY_3_SESSIONS", name: "Complete 3 Study Sessions", description: "Complete three focus sessions to lock the habit in.", type: "STUDY_SESSIONS", targetValue: 3, xpReward: 40, active: true },
    { id: 3, code: "GOAL_3_DAYS", name: "Complete Your Daily Goal 3 Days", description: "Hit your daily study goal on three separate days.", type: "DAILY_GOAL_DAYS", targetValue: 3, xpReward: 75, active: true }
  ];
  const userChallenges = [
    { id: 11, challengeId: 1, progress: 42, completed: false, completedAt: null },
    { id: 12, challengeId: 2, progress: 3, completed: true, completedAt: iso(now - 2 * DAY) },
    { id: 13, challengeId: 3, progress: 2, completed: false, completedAt: null }
  ];

  const assessments = [
    { assessmentId: 71, userId: 1, assetId: 1, scorePercentage: 88, maxSellPercentage: 75, remainingSellPercentage: 75, createdAt: iso(now - 9 * DAY) },
    { assessmentId: 72, userId: 1, assetId: 3, scorePercentage: 72, maxSellPercentage: 50, remainingSellPercentage: 50, createdAt: iso(now - 6 * DAY) },
    { assessmentId: 73, userId: 1, assetId: 4, scorePercentage: 96, maxSellPercentage: 100, remainingSellPercentage: 100, createdAt: iso(now - 3 * DAY) },
    { assessmentId: 74, userId: 1, assetId: 8, scorePercentage: 64, maxSellPercentage: 25, remainingSellPercentage: 25, createdAt: iso(now - 1 * DAY) }
  ];

  const friends = [
    { id: 3, username: "rohan_gupta" },
    { id: 4, username: "meera_iyer" },
    { id: 6, username: "isha_verma" }
  ];
  const requests = [
    { id: 201, senderId: 2, senderName: "diya_sharma", receiverId: 1, status: "PENDING", createdAt: iso(now - 0.4 * DAY) },
    { id: 202, senderId: 1, senderName: "arjun_dev", receiverId: 7, status: "PENDING", createdAt: iso(now - 2 * DAY), outgoing: true }
  ];

  const activityToday = assets.map((a, i) => {
    const r = rng(500 + i * 13);
    const imp = a.globalImportance;
    const study = Math.round(r() * imp * 22);
    return {
      assetId: a.id,
      symbol: a.symbol,
      name: a.name,
      activityDate: new Date(now).toISOString().slice(0, 10),
      studyMinutes: study,
      studySessions: Math.ceil(study / 25),
      activeStudents: Math.round(r() * imp * 1.4),
      completedGoals: Math.round(r() * imp * 0.5),
      buyVolume: Math.round(r() * imp * 0.018 * 10000) / 10000,
      sellVolume: Math.round(r() * imp * 0.011 * 10000) / 10000,
      buyTransactions: Math.round(r() * imp * 1.6),
      sellTransactions: Math.round(r() * imp)
    };
  });

  return {
    v: 3,
    assets,
    users,
    me: 1,
    positions,
    trades,
    sessions,
    progress,
    achievements,
    unlocked,
    challenges,
    userChallenges,
    assessments,
    friends,
    requests,
    activityToday,
    dailyMinutes,
    activeSession: null,
    nextId: 900
  };
}

/* the purchase study requirement follows the subject's importance (6–15 minutes),
   exactly like the backend's assets.required_study_minutes */
export function requiredMinutesForImportance(importance) {
  return 5 + (Number(importance) || 5);
}

/* ---------------- store ---------------- */
function normalize(state) {
  if (!state || !Array.isArray(state.assets)) return state;
  state.assets.forEach((a) => {
    if (a.requiredStudyMinutes == null) {
      a.requiredStudyMinutes = requiredMinutesForImportance(a.globalImportance);
    }
  });
  return state;
}

function load() {
  try {
    const raw = LS.get(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 3) return normalize(parsed);
    }
  } catch (e) { /* ignore corrupt store */ }
  return seed();
}

function save() {
  LS.set(STORE_KEY, JSON.stringify(Demo.state));
}

export const Demo = {
  seed,
  state: load(),
  reset() {
    Demo.state = seed();
    save();
    return Demo.state;
  },
  save,
  assetById(id) {
    return Demo.state.assets.find((a) => a.id === Number(id));
  },
  me() {
    return Demo.state.users.find((u) => u.id === Demo.state.me);
  },

  /* ----- learning unlocks buying ----- */
  /* completed study minutes on a subject */
  studiedMinutes(assetId) {
    const id = Number(assetId);
    const seconds = Demo.state.sessions
      .filter((s) => s.status === "COMPLETED" && s.assetId === id)
      .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    return Math.floor(seconds / 60);
  },

  /* what a student has studied on a subject versus what buying it requires */
  purchaseEligibility(assetId) {
    const a = Demo.assetById(assetId);
    const required = a.requiredStudyMinutes || requiredMinutesForImportance(a.globalImportance);
    const studied = Demo.studiedMinutes(a.id);
    return {
      assetId: a.id,
      symbol: a.symbol,
      name: a.name,
      requiredStudyMinutes: required,
      studiedMinutes: studied,
      remainingMinutes: Math.max(0, required - studied),
      unlocked: studied >= required
    };
  },

  purchaseEligibilityAll() {
    return Demo.state.assets.map((a) => Demo.purchaseEligibility(a.id));
  },

  /* thrown when a purchase needs more study — same shape as the API error body */
  studyRequiredError(eligibility) {
    const err = new Error(
      "Study required before buying " + eligibility.symbol + " — " + eligibility.studiedMinutes + " of " +
        eligibility.requiredStudyMinutes + " minutes done (" + eligibility.remainingMinutes + " more to unlock)."
    );
    err.code = "STUDY_REQUIRED";
    err.status = 409;
    err.payload = { code: "STUDY_REQUIRED", message: err.message, ...eligibility };
    return err;
  },

  /* ----- derived ----- */
  portfolio() {
    const me = Demo.me();
    const positions = Demo.state.positions.map((p) => {
      const a = Demo.assetById(p.assetId);
      const currentPrice = a.currentPrice;
      const invested = p.quantity * p.averageBuyPrice;
      const value = p.quantity * currentPrice;
      const pnl = value - invested;
      return {
        assetId: p.assetId,
        symbol: a.symbol,
        name: a.name,
        quantity: p.quantity,
        averageBuyPrice: p.averageBuyPrice,
        currentPrice,
        investedValue: round4(invested),
        currentValue: round4(value),
        unrealizedPnl: round4(pnl),
        unrealizedPnlPercentage: invested ? round2((pnl * 100) / invested) : 0
      };
    });
    const invested = round4(positions.reduce((s, p) => s + p.investedValue, 0));
    const value = round4(positions.reduce((s, p) => s + p.currentValue, 0));
    const pnl = round4(value - invested);
    return {
      userId: me.id,
      simulatedBtcBalance: me.simulatedBtcBalance,
      positions,
      totalInvestedValue: invested,
      totalCurrentValue: value,
      totalUnrealizedPnl: pnl,
      totalUnrealizedPnlPercentage: invested ? round2((pnl * 100) / invested) : 0,
      totalPortfolioValue: round4(me.simulatedBtcBalance + value)
    };
  },

  stats() {
    const me = Demo.me();
    const sessions = Demo.state.sessions.filter((s) => s.status === "COMPLETED");
    const totalMin = Math.round(sessions.reduce((s, x) => s + (x.durationSeconds || 0), 0) / 60);
    const trades = Demo.state.trades;
    const progress = Demo.state.progress;
    return {
      userId: me.id,
      totalStudyMinutes: totalMin,
      totalStudySessions: sessions.length,
      totalXp: me.xp,
      currentStreak: me.currentStreak,
      longestStreak: me.longestStreak,
      goalsCompleted: 9,
      assetsStudied: progress.filter((p) => p.completedMinutes > 0).length,
      masteredAssets: progress.filter((p) => p.progressPercentage >= 100).length,
      totalTrades: trades.length,
      buyTrades: trades.filter((t) => t.side === "BUY").length,
      sellTrades: trades.filter((t) => t.side === "SELL").length
    };
  },

  todayProgress() {
    const me = Demo.me();
    const today = new Date().toISOString().slice(0, 10);
    const completed = Demo.state.sessions
      .filter((s) => s.status === "COMPLETED" && s.endedAt && s.endedAt.slice(0, 10) === today)
      .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const completedMinutes = Math.floor(completed / 60);
    return {
      date: today,
      dailyGoalMinutes: me.dailyGoalMinutes,
      completedMinutes,
      remainingMinutes: Math.max(0, me.dailyGoalMinutes - completedMinutes),
      goalCompleted: completedMinutes >= me.dailyGoalMinutes,
      currentStreak: me.currentStreak,
      longestStreak: me.longestStreak
    };
  },

  leaderboard() {
    const sorted = [...Demo.state.users].sort(
      (a, b) => b.xp - a.xp || b.currentStreak - a.currentStreak || a.id - b.id
    );
    return sorted.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      xp: u.xp,
      currentStreak: u.currentStreak
    }));
  },

  dashboard() {
    const me = Demo.me();
    const tp = Demo.todayProgress();
    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = Demo.state.sessions.filter(
      (s) => s.status === "COMPLETED" && s.endedAt && s.endedAt.slice(0, 10) === today
    );
    const goal = me.dailyGoalMinutes;
    const goalPct = goal ? round2((tp.completedMinutes * 100) / goal) : 0;
    return {
      user: { id: me.id, username: me.username, email: me.email },
      study: {
        xp: me.xp,
        dailyGoalMinutes: goal,
        todayStudyMinutes: tp.completedMinutes,
        todayGoalProgressPercentage: goalPct,
        currentStreak: me.currentStreak,
        longestStreak: me.longestStreak
      },
      assets: Demo.state.progress,
      achievements: Demo.state.unlocked.map((u) => {
        const a = Demo.state.achievements.find((x) => x.code === u.code);
        return {
          achievementId: a.code,
          code: a.code,
          name: a.name,
          description: a.description,
          unlockedAt: u.unlockedAt
        };
      }),
      portfolio: Demo.portfolio(),
      recentTrades: Demo.state.trades.slice(0, 5)
    };
  },

  /* ----- mutations ----- */
  startSession(assetId) {
    if (Demo.state.activeSession) throw new Error("User already has an active study session");
    const a = Demo.assetById(assetId);
    if (!a) throw new Error("Asset not found: " + assetId);
    const summary = {
      id: Demo.state.nextId++,
      assetId: a.id,
      assetSymbol: a.symbol,
      startedAt: new Date().toISOString(),
      status: "ACTIVE"
    };
    // live in both places: summary for the timer, sessions list for reloads
    Demo.state.activeSession = summary;
    Demo.state.sessions.unshift({ ...summary, endedAt: null, durationSeconds: null, xpEarned: null });
    save();
    return { ...summary };
  },

  stopSession() {
    const s = Demo.state.activeSession;
    if (!s) throw new Error("No active session");
    const seconds = Math.max(1, Math.round((Date.now() - Date.parse(s.startedAt)) / 1000));
    const minutes = Math.floor(seconds / 60);
    const xp = minutes * 2;
    const me = Demo.me();
    me.xp += xp;

    const entry = Demo.state.sessions.find((x) => x.id === s.id);
    if (entry) {
      entry.endedAt = new Date().toISOString();
      entry.durationSeconds = seconds;
      entry.status = "COMPLETED";
      entry.xpEarned = xp;
    } else {
      Demo.state.sessions.unshift({
        id: s.id,
        assetId: s.assetId,
        assetSymbol: s.assetSymbol,
        startedAt: s.startedAt,
        endedAt: new Date().toISOString(),
        durationSeconds: seconds,
        status: "COMPLETED",
        xpEarned: xp
      });
    }

    const prog = Demo.state.progress.find((p) => p.assetId === s.assetId);
    if (prog) prog.completedMinutes = Math.min(prog.targetMinutes, prog.completedMinutes + minutes);

    // bump today's market activity for this asset
    const act = Demo.state.activityToday.find((x) => x.assetId === s.assetId);
    if (act) {
      act.studyMinutes += minutes;
      act.studySessions += 1;
      act.activeStudents += 1;
    }

    Demo.state.activeSession = null;
    save();
    return { seconds, minutes, xp, symbol: s.assetSymbol };
  },

  buy(assetId, quantity) {
    const a = Demo.assetById(assetId);
    if (!a) throw new Error("Asset not found: " + assetId);
    if (!(quantity > 0)) throw new Error("Quantity must be greater than zero");
    // learning unlocks buying
    const eligibility = Demo.purchaseEligibility(a.id);
    if (!eligibility.unlocked) throw Demo.studyRequiredError(eligibility);
    const me = Demo.me();
    const cost = round4(quantity * a.currentPrice);
    if (cost > me.simulatedBtcBalance + 1e-9) throw new Error("Insufficient simulated BTC balance");
    me.simulatedBtcBalance = round4(me.simulatedBtcBalance - cost);

    let pos = Demo.state.positions.find((p) => p.assetId === a.id);
    if (pos) {
      const totalQty = pos.quantity + quantity;
      pos.averageBuyPrice = round4(
        (pos.quantity * pos.averageBuyPrice + quantity * a.currentPrice) / totalQty
      );
      pos.quantity = round4(totalQty);
    } else {
      pos = { assetId: a.id, symbol: a.symbol, name: a.name, quantity: round4(quantity), averageBuyPrice: a.currentPrice };
      Demo.state.positions.push(pos);
    }

    const trade = {
      tradeId: Demo.state.nextId++,
      assetId: a.id,
      symbol: a.symbol,
      side: "BUY",
      quantity: round4(quantity),
      price: a.currentPrice,
      totalValue: cost,
      createdAt: new Date().toISOString()
    };
    Demo.state.trades.unshift(trade);
    const act = Demo.state.activityToday.find((x) => x.assetId === a.id);
    if (act) {
      act.buyVolume = round4(act.buyVolume + cost);
      act.buyTransactions += 1;
    }
    save();
    return { trade, balance: me.simulatedBtcBalance, position: pos };
  },

  sell(assetId, quantity) {
    const a = Demo.assetById(assetId);
    if (!a) throw new Error("Asset not found: " + assetId);
    if (!(quantity > 0)) throw new Error("Quantity must be greater than zero");
    const me = Demo.me();
    const pos = Demo.state.positions.find((p) => p.assetId === a.id);
    if (!pos) throw new Error("Position not found for user and asset");
    if (quantity > pos.quantity + 1e-9) throw new Error("Cannot sell more than owned quantity");

    const asmt = Demo.state.assessments
      .filter((x) => x.assetId === a.id && x.remainingSellPercentage > 0)
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
    if (!asmt) throw new Error("No remaining assessment sell eligibility");

    const maxQty = (pos.quantity * asmt.remainingSellPercentage) / 100;
    if (quantity > maxQty + 1e-9) {
      throw new Error(
        "Cannot sell more than assessment-authorized quantity (max " +
          round4(maxQty) +
          " — score " +
          asmt.scorePercentage +
          "%)"
      );
    }

    const proceeds = round4(quantity * a.currentPrice);
    me.simulatedBtcBalance = round4(me.simulatedBtcBalance + proceeds);
    pos.quantity = round4(pos.quantity - quantity);
    const consumed = (quantity * 100) / (pos.quantity + quantity);
    asmt.remainingSellPercentage = Math.max(0, round2(asmt.remainingSellPercentage - consumed));

    if (pos.quantity <= 1e-8) {
      Demo.state.positions = Demo.state.positions.filter((p) => p.assetId !== a.id);
    }

    const trade = {
      tradeId: Demo.state.nextId++,
      assetId: a.id,
      symbol: a.symbol,
      side: "SELL",
      quantity: round4(quantity),
      price: a.currentPrice,
      totalValue: proceeds,
      createdAt: new Date().toISOString()
    };
    Demo.state.trades.unshift(trade);
    const act = Demo.state.activityToday.find((x) => x.assetId === a.id);
    if (act) {
      act.sellVolume = round4(act.sellVolume + proceeds);
      act.sellTransactions += 1;
    }
    save();
    return { trade, balance: me.simulatedBtcBalance, position: Demo.state.positions.find((p) => p.assetId === a.id) || null };
  },

  submitAssessment(assetId, score) {
    const a = Demo.assetById(assetId);
    if (!a) throw new Error("Asset not found: " + assetId);
    if (!(score >= 0 && score <= 100)) throw new Error("Score percentage must be between 0 and 100");
    let max = 0;
    if (score >= 95) max = 100;
    else if (score >= 85) max = 75;
    else if (score >= 70) max = 50;
    else if (score >= 50) max = 25;
    const asmt = {
      assessmentId: Demo.state.nextId++,
      userId: Demo.state.me,
      assetId: a.id,
      scorePercentage: score,
      maxSellPercentage: max,
      remainingSellPercentage: max,
      createdAt: new Date().toISOString()
    };
    Demo.state.assessments.unshift(asmt);
    save();
    return asmt;
  },

  claimChallenge(challengeId) {
    const uc = Demo.state.userChallenges.find((c) => c.challengeId === challengeId);
    const ch = Demo.state.challenges.find((c) => c.id === challengeId);
    if (!uc || !ch) throw new Error("Challenge not found");
    if (uc.progress >= ch.targetValue) uc.completed = true;
    if (!uc.completed) throw new Error("Challenge is not claimable yet");
    if (uc.claimed) return uc;
    uc.claimed = true;
    uc.completedAt = uc.completedAt || new Date().toISOString();
    Demo.me().xp += ch.xpReward;
    save();
    return uc;
  },

  acceptRequest(id) {
    const r = Demo.state.requests.find((x) => x.id === id);
    if (!r) throw new Error("Request not found");
    r.status = "ACCEPTED";
    if (!Demo.state.friends.some((f) => f.id === r.senderId)) {
      Demo.state.friends.push({ id: r.senderId, username: r.senderName });
    }
    save();
    return r;
  },

  rejectRequest(id) {
    const r = Demo.state.requests.find((x) => x.id === id);
    if (!r) throw new Error("Request not found");
    r.status = "REJECTED";
    save();
    return r;
  },

  sendRequest(receiverId, name) {
    const exists = Demo.state.requests.some(
      (r) => r.senderId === Demo.state.me && r.receiverId === receiverId && r.status === "PENDING"
    );
    if (exists) throw new Error("Friend request already sent");
    Demo.state.requests.push({
      id: Demo.state.nextId++,
      senderId: Demo.state.me,
      senderName: Demo.me().username,
      receiverId,
      receiverName: name,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      outgoing: true
    });
    save();
  },

  runMarket() {
    let moved = 0;
    Demo.state.assets.forEach((a) => {
      const act = Demo.state.activityToday.find((x) => x.assetId === a.id);
      const score = act
        ? Math.max(
            0,
            Math.min(
              10,
              (act.studyMinutes / 60) * 0.4 +
                (act.activeStudents / 10) * 0.25 +
                (act.completedGoals / 5) * 0.15 +
                (act.buyVolume / 0.1) * 0.2
            )
          )
        : 5;
      const change = Math.max(-5, Math.min(5, (score - 5) * 0.5));
      const next = Math.max(0.0001, Math.round(a.currentPrice * (1 + change / 100) * 10000) / 10000);
      if (next !== a.currentPrice) moved++;
      a.currentPrice = next;
    });
    save();
    return { updated: moved };
  },

  setDailyGoal(minutes) {
    const me = Demo.me();
    if (minutes <= 0) throw new Error("Daily goal must be greater than zero");
    me.dailyGoalMinutes = minutes;
    save();
    return me;
  },

  /* price history for sparklines (deterministic walk per asset) */
  priceHistory(assetId, points) {
    points = points || 30;
    const a = Demo.assetById(assetId);
    const r = rng(7000 + assetId * 31);
    const out = [];
    let p = a.openingPrice;
    for (let i = 0; i < points - 1; i++) {
      p = p * (1 + (r() - 0.48) * 0.035);
      out.push(round4(p));
    }
    out.push(a.currentPrice);
    return out;
  }
};

export default Demo;
