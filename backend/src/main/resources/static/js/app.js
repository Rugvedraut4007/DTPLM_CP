/* ============================================================
   StudyMarket SPA — router, views, charts, interactions
   Light zone : dashboard, study, assessments, challenges,
                leaderboard, friends
   Vault zone : unlock, market, trade, portfolio, stats
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const LIGHT_ROUTES = ["#/", "#/study", "#/assessments", "#/challenges", "#/leaderboard", "#/friends"];
  const VAULT_ROUTES = ["#/vault", "#/market", "#/trade", "#/portfolio", "#/stats"];

  const TITLES = {
    "#/": ["Dashboard", "your day at a glance"],
    "#/study": ["Study", "focus sessions build market value"],
    "#/assessments": ["Assessments", "prove your knowledge to unlock sell rights"],
    "#/challenges": ["Challenges", "earn XP"],
    "#/leaderboard": ["Leaderboard", "top students by XP"],
    "#/friends": ["Friends", "study together"],
    "#/vault": ["Restricted Zone", "classified terminal"],
    "#/market": ["Market", "subject share prices"],
    "#/trade": ["Trade", "buy & sell shares"],
    "#/portfolio": ["Portfolio", "your positions & P&L"],
    "#/stats": ["Stats", "study & trading analytics"]
  };

  const App = {
    route: "#/",
    userId: Number(localStorage.getItem("studymarket.userId")) || 1,
    mode: "unknown",
    activeSession: null,
    timerId: null,
    unlocked: sessionStorage.getItem("sm_vault") === "1",
    // learning unlocks buying: which subject the student still has to study
    studyIntent: null,
    _requiredTargetSec: 0
  };

  /* ---------------- utils ---------------- */
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  const num = (n, d) => Number(n || 0).toFixed(d == null ? 4 : d);
  const signed = (n, d) => (n > 0 ? "+" : "") + Number(n || 0).toFixed(d == null ? 2 : d);
  const cls = (n) => (Number(n) >= 0 ? "pos" : "neg");
  const btc = (n) => num(n, 4) + " BTC";
  const pct = (n) => signed(n, 2) + "%";

  function fmtDur(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function timeAgo(iso) {
    if (!iso) return "—";
    const diff = Date.now() - Date.parse(iso);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    const d = Math.floor(hr / 24);
    if (d < 30) return d + "d ago";
    return new Date(iso).toLocaleDateString();
  }

  function initials(name) {
    return String(name || "?")
      .split(/[_\s]+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function toast(msg, type) {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.innerHTML = "<span>" + esc(msg) + "</span>";
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 350);
    }, 3600);
  }

  /* ---------------- charts ---------------- */
  function sparkSVG(values, w, h, color, fill) {
    if (!values || values.length < 2) return "";
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    const line = "M" + pts.join(" L");
    const area = line + " L" + w + "," + h + " L0," + h + " Z";
    return (
      '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
      (fill ? '<path d="' + area + '" fill="' + color + '" opacity="0.14"/>' : "") +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function ringSVG(pctValue, size, stroke, color, track) {
    const p = Math.max(0, Math.min(100, Number(pctValue) || 0));
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (c * p) / 100;
    return (
      '<svg width="' + size + '" height="' + size + '" style="transform:rotate(-90deg)">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (track || "#e8ebf7") + '" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + " " + (c - dash).toFixed(1) + '"/>' +
      "</svg>"
    );
  }

  function donutSVG(segments, size) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const stroke = size * 0.16;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;
    const circles = segments
      .map((seg) => {
        const len = (c * seg.value) / total;
        const el =
          '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + seg.color +
          '" stroke-width="' + stroke + '" stroke-dasharray="' + (len - 1.5).toFixed(2) + " " + (c - len + 1.5).toFixed(2) +
          '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
        offset += len;
        return el;
      })
      .join("");
    return (
      '<svg width="' + size + '" height="' + size + '" style="transform:rotate(-90deg)">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#101b27" stroke-width="' + stroke + '"/>' +
      circles +
      "</svg>"
    );
  }

  /* ---------------- data helpers ---------------- */
  function sessionAsset(s) {
    if (s.asset && s.asset.symbol) return s.asset;
    return { id: s.assetId, symbol: s.assetSymbol || "?" };
  }

  function changePct(a) {
    if (!a.openingPrice) return 0;
    return ((a.currentPrice - a.openingPrice) / a.openingPrice) * 100;
  }

  // remaining sell rights: demo returns remainingSellPercentage, the live
  // AssessmentResponse only carries maxSellPercentage (server enforces the rest)
  function rightsOf(a) {
    if (a && a.remainingSellPercentage != null && a.remainingSellPercentage !== "") {
      return Number(a.remainingSellPercentage);
    }
    return Number((a && a.maxSellPercentage) || 0);
  }

  async function loadActiveSession() {
    try {
      const sessions = await API.get("/api/users/" + App.userId + "/study-sessions");
      App.activeSession = (sessions || []).find((s) => s.status === "ACTIVE") || null;
    } catch (e) {
      App.activeSession = window.Demo.state.activeSession || null;
    }
    return App.activeSession;
  }

  function startTimerLoop() {
    if (App.timerId) clearInterval(App.timerId);
    App.timerId = setInterval(() => {
      const t = $("#focusTimer");
      if (t && App.activeSession) {
        const sec = (Date.now() - Date.parse(App.activeSession.startedAt)) / 1000;
        t.textContent = fmtDur(sec);
      }
      // the required study timer a purchase request sets
      const req = $("#reqTimer");
      if (req && App.activeSession && App._requiredTargetSec) {
        const elapsed = (Date.now() - Date.parse(App.activeSession.startedAt)) / 1000;
        req.textContent = fmtDur(Math.max(0, App._requiredTargetSec - elapsed));
      }
    }, 1000);
  }

  /* a locked subject is routed through Study World first */
  function goStudyForBuy(assetId) {
    App.studyIntent = { assetId: Number(assetId) };
    if (App.route === "#/study") render();
    else location.hash = "#/study";
  }

  /* ---------------- chrome ---------------- */
  function setChrome(route) {
    const t = TITLES[route] || ["StudyMarket", ""];
    $("#pageTitle").textContent = t[0];
    $("#pageCrumb").textContent = t[1];
    document.title = t[0] + " · StudyMarket";

    const vault = VAULT_ROUTES.indexOf(route) !== -1;
    document.body.dataset.zone = vault ? "vault" : "light";

    $$(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === route);
    });

    $("#vaultGroup").hidden = !App.unlocked;

    const chip = $("#modeChip");
    chip.hidden = false;
    if (App.mode === "live") {
      chip.textContent = "● LIVE API";
      chip.classList.add("live");
    } else {
      chip.textContent = "◆ DEMO DATA";
      chip.classList.remove("live");
    }
    $("#connDot").className = "conn-dot " + (App.mode === "live" ? "live" : "demo");
    $("#connLabel").textContent = App.mode === "live" ? "backend online" : "demo mode";
  }

  async function loadUser() {
    try {
      const u = await API.get("/api/users/" + App.userId);
      App.user = u;
    } catch (e) {
      App.user = window.Demo.me();
    }
    const u = App.user;
    $("#userName").textContent = u.username;
    $("#userSub").textContent = u.xp + " XP · " + u.currentStreak + "d streak";
    $("#userAvatar").textContent = initials(u.username);
  }

  /* ============================================================
     LIGHT VIEWS
     ============================================================ */

  async function viewDashboard() {
    const d = await API.get("/api/users/" + App.userId + "/dashboard");
    const lb = await API.get("/api/leaderboard?limit=5").catch(() => []);
    const s = d.study;
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const goalPct = Number(s.todayGoalProgressPercentage) || 0;

    const active = App.activeSession;
    const focusHTML = active
      ? '<div class="focus-bar"><div><div class="who">Focusing on <b>' + esc(sessionAsset(active).symbol) +
        '</b> — session running</div><div class="timer" id="focusTimer">' +
        fmtDur((Date.now() - Date.parse(active.startedAt)) / 1000) +
        '</div></div><button class="btn danger" id="stopBtn">&#9632;&nbsp; Stop session</button></div>'
      : '<div class="focus-bar"><div><div class="who">Ready to focus? Pick a subject and start a session.</div>' +
        '<div class="timer">00:00:00</div></div><a class="btn" href="#/study">&#9201;&nbsp; Start focus</a></div>';

    const top3 = (lb || []).slice(0, 3).map((e, i) => {
      const medal = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      return (
        '<div class="lb-row ' + medal + (e.userId === App.userId ? " me" : "") + '">' +
        '<div class="rank">' + e.rank + "</div>" +
        '<div class="lb-name"><b>' + esc(e.username) + "</b><small>" + e.currentStreak + " day streak</small></div>" +
        '<div class="lb-xp">' + e.xp + ' XP</div><div class="small muted">rank #' + e.rank + "</div></div>"
      );
    }).join("");

    const progressCards = (d.assets || []).slice(0, 6).map((p) => {
      const pctv = Number(p.progressPercentage) || 0;
      return (
        '<div class="card" style="padding:15px">' +
        '<div class="row spread center" style="margin-bottom:9px">' +
        '<b style="font-size:13.5px">' + esc(p.symbol) + '</b>' +
        '<span class="pill ' + (pctv >= 100 ? "green" : "grey") + '">' + Math.round(pctv) + "%</span></div>" +
        '<div class="small muted" style="margin-bottom:8px">' + esc(p.assetName) + "</div>" +
        '<div class="bar ' + (pctv >= 100 ? "green" : "") + '"><i style="width:' + pctv + '%"></i></div>' +
        '<div class="asset-meta"><span>' + p.completedMinutes + " / " + p.targetMinutes + ' min</span><span>mastery</span></div>' +
        "</div>"
      );
    }).join("");

    const achievements = (d.achievements || []).map((a) =>
      '<div class="ach"><span class="ico">&#127942;</span><b>' + esc(a.name) + "</b><small>" + esc(a.description) + "</small></div>"
    ).join("");
    const locked = [
      { name: "Subject Master", description: "Reach 100% progress on any asset." },
      { name: "Goal Crusher", description: "Complete the daily goal on 7 different days." }
    ]
      .filter((l) => !(d.achievements || []).some((u) => u.name === l.name))
      .map((l) => '<div class="ach locked"><span class="ico">&#128274;</span><b>' + esc(l.name) + "</b><small>" + esc(l.description) + "</small></div>")
      .join("");

    return (
      '<div class="hero">' +
      "<div><h2>" + greet + ", " + esc(d.user.username) + "</h2>" +
      "<p>" + (goalPct >= 100 ? "Daily goal crushed. Legendary. &#128292;" : "Keep the streak alive — " + s.todayStudyMinutes + " of " + s.dailyGoalMinutes + " minutes done today.") + "</p></div>" +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><b>' + s.xp + "</b><span>XP</span></div>" +
      '<div class="hero-stat"><b>&#128293; ' + s.currentStreak + "</b><span>day streak</span></div>" +
      '<div class="hero-stat"><b>' + s.todayStudyMinutes + "'/" + s.dailyGoalMinutes + "</b><span>min today</span></div>" +
      "</div></div>" +

      focusHTML +

      '<div class="grid g3" style="margin-top:16px">' +
      '<div class="card column goal-card"><h3>Daily goal</h3><div class="ring-wrap">' +
      "<div>" + ringSVG(goalPct, 116, 11, goalPct >= 100 ? "#0d9f6e" : "#4f46e5") + "</div>" +
      '<div class="ring-label"><b>' + Math.round(goalPct) + '%</b><span>' + s.todayStudyMinutes + " of " + s.dailyGoalMinutes +
      ' min</span><div class="small muted" style="margin-top:6px">longest streak ' + s.longestStreak + "d</div></div></div></div>" +

      '<div class="card column"><h3>Study progress <a class="link pill" href="#/study">open &#8594;</a></h3>' +
      '<div class="grid fill-y spread-y" style="gap:11px">' +
      (d.assets || []).slice(0, 4).map((p) => {
        const v = Number(p.progressPercentage) || 0;
        return (
          '<div><div class="row spread small" style="margin-bottom:4px"><b>' + esc(p.symbol) +
          "</b><span class=\"muted\">" + Math.round(v) + "%</span></div>" +
          '<div class="bar ' + (v >= 100 ? "green" : "") + '"><i style="width:' + v + '%"></i></div></div>'
        );
      }).join("") +
      "</div></div>" +

      '<div class="card"><h3>Leaderboard <a class="link pill" href="#/leaderboard">all &#8594;</a></h3>' +
      top3 +
      "</div></div>" +

      '<div class="card" style="margin-top:16px"><h3>Achievements <span class="muted" style="text-transform:none;letter-spacing:0">' +
      (d.achievements || []).length + " unlocked</span></h3>" +
      '<div class="ach-grid">' + achievements + locked + "</div></div>"
    );
  }

  async function viewStudy() {
    const [progress, today, assessments, eligibility] = await Promise.all([
      API.get("/api/users/" + App.userId + "/study-progress"),
      API.get("/api/users/" + App.userId + "/study-progress/today"),
      API.get("/api/users/" + App.userId + "/assessments").catch(() => []),
      API.get("/api/users/" + App.userId + "/purchase-eligibility").catch(() => [])
    ]);
    const goalPct = today.dailyGoalMinutes ? Math.round((today.completedMinutes * 100) / today.dailyGoalMinutes) : 0;
    const active = App.activeSession;
    const assessed = new Set((assessments || []).map((a) => a.assetId));
    const purchaseBy = {};
    (eligibility || []).forEach((e) => (purchaseBy[e.assetId] = e));

    // learning unlocks buying: a purchase request opened from Market shows its required timer
    const intent = App.studyIntent;
    const intentPurchase = intent ? purchaseBy[intent.assetId] : null;
    const intentAsset = intentPurchase || intent ? (intentPurchase || Demo.assetById(intent.assetId)) : null;
    const runningHere = intent && active && Number(sessionAsset(active).id) === Number(intent.assetId);
    const runningElsewhere = intent && active && !runningHere;
    App._requiredTargetSec =
      runningHere && intentPurchase && !intentPurchase.unlocked ? intentPurchase.remainingMinutes * 60 : 0;

    let requestHTML = "";
    if (intent && intentAsset) {
      const p = intentPurchase || { requiredStudyMinutes: 0, studiedMinutes: 0, remainingMinutes: 0, unlocked: false };
      const v = p.requiredStudyMinutes ? Math.min(100, (p.studiedMinutes * 100) / p.requiredStudyMinutes) : 100;
      requestHTML =
        '<div class="card column" style="margin-top:16px"><h3>Purchase request <span class="muted" style="text-transform:none;letter-spacing:0">learning unlocks buying</span></h3>' +
        '<div class="row wrap center" style="gap:22px"><div class="grow">' +
        '<div class="small muted" style="margin-bottom:10px">To buy <b>' + esc(intentAsset.symbol) + "</b> — " + esc(intentAsset.name || "") +
        " — you must complete <b>" + p.requiredStudyMinutes + " minutes</b> of study on this subject. The timer below is validated by the backend before the purchase is allowed.</div>" +
        '<div class="bar ' + (p.unlocked ? "green" : "") + '"><i style="width:' + v + '%"></i></div>' +
        '<div class="row spread small muted" style="margin-top:7px"><span>' + p.studiedMinutes + " / " + p.requiredStudyMinutes +
        ' min studied</span><span>' + (p.unlocked ? "requirement met" : p.remainingMinutes + " min to go") + "</span></div>" +
        (runningHere
          ? '<div class="note ' + (p.unlocked ? "ok" : "warn") + '" style="margin-top:12px">' +
            (p.unlocked
              ? "&#10003; required study time complete — stop the session so the backend validates it"
              : 'required timer <b id="reqTimer">' + fmtDur(p.remainingMinutes * 60) + "</b> left of this subject&#39;s study requirement") +
            "</div>"
          : "") +
        (runningElsewhere
          ? '<div class="note warn" style="margin-top:12px">a session for ' + esc(sessionAsset(active).symbol) + " is running — stop it to start this one</div>"
          : "") +
        "</div>" +
        '<div style="width:250px">' +
        (p.unlocked
          ? '<div class="note ok">&#10003; purchase unlocked — the terminal will accept your order</div>' +
            '<button class="btn" style="width:100%;margin-top:12px" id="intentBuy">Buy ' + esc(intentAsset.symbol) + " in terminal &#8594;</button>"
          : runningHere
          ? '<div class="small muted" style="margin-bottom:10px">Requirement reached? Stop the session so the backend can validate it.</div>' +
            '<button class="btn danger" style="width:100%" id="intentStop">&#9632;&nbsp; Finish required session</button>'
          : '<div class="small muted" style="margin-bottom:10px">A required study timer starts with the session.</div>' +
            '<button class="btn" style="width:100%" id="intentStart"' + (active ? " disabled" : "") + ">&#9654; Start required session</button>") +
        "</div></div></div>";
    }

    const cards = (progress || [])
      .map((p) => {
        const v = Number(p.progressPercentage) || 0;
        const selected = App.selectedAssetId === p.assetId;
        const purchase = purchaseBy[p.assetId];
        return (
          '<div class="asset-card' + (selected ? " selected" : "") + '" data-asset="' + p.assetId + '">' +
          '<div class="asset-top"><span class="sym">' + esc(p.symbol) + "</span>" +
          (v >= 100 ? '<span class="pill green">mastered</span>' : assessed.has(p.assetId) ? '<span class="pill">tested</span>' : '<span class="pill grey">untested</span>') +
          "</div>" +
          '<div class="name">' + esc(p.assetName) + "</div>" +
          '<div class="bar ' + (v >= 100 ? "green" : "") + '"><i style="width:' + v + '%"></i></div>' +
          '<div class="asset-meta"><span>' + p.completedMinutes + " / " + p.targetMinutes + ' min</span><b style="color:var(--primary)">' + Math.round(v) + "%</b></div>" +
          (purchase
            ? '<div class="asset-meta" style="margin-top:4px">' +
              (purchase.unlocked
                ? '<span style="color:#0d9f6e">&#10003; buying unlocked</span>'
                : "<span>&#128274; study " + purchase.remainingMinutes + "m to buy</span>") +
              "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="split">' +
      '<div class="card column goal-card"><h3>Today <span class="muted" style="text-transform:none;letter-spacing:0">daily focus goal</span></h3>' +
      '<div class="row center fill-y" style="gap:26px">' +
      '<div class="ring-wrap">' +
      "<div>" + ringSVG(goalPct, 104, 10, today.goalCompleted ? "#0d9f6e" : "#4f46e5") + "</div>" +
      '<div class="ring-label"><b>' + today.completedMinutes + " min</b><span>of " + today.dailyGoalMinutes +
      ' minute goal</span><div class="small muted" style="margin-top:6px">' +
      (today.goalCompleted ? "&#10003; goal complete" : today.remainingMinutes + " min to go") + "</div></div></div>" +
      '<div class="grow"><label>Set today&#39;s goal</label><div class="goal-chips">' +
      '<button data-goal="30">30 min</button><button data-goal="45">45 min</button><button data-goal="60">60 min</button><button data-goal="90">90 min</button>' +
      '</div><div class="small muted" style="margin-top:10px">Your goal sets the daily bar and feeds the streak.</div></div>' +
      "</div></div>" +
      '<div class="card column"><h3>Streak</h3>' +
      '<div style="font-size:44px;line-height:1">&#128293;</div>' +
      '<div style="font-size:30px;font-weight:800;letter-spacing:-1px">' + today.currentStreak + " days</div>" +
      '<div class="small muted">personal best: ' + today.longestStreak + ' days</div>' +
      '<div class="note ok push">Study every day to keep it burning.</div></div>' +
      "</div>" +
      focusHTML +
      requestHTML +
      '<div class="card" style="margin-top:16px"><h3>Subjects <span class="muted" style="text-transform:none;letter-spacing:0">click a card to select, then start a session</span></h3>' +
      '<div class="asset-grid">' + cards + "</div>" +
      '<div class="row wrap center" style="margin-top:16px">' +
      '<button class="btn" id="startBtn"' + (active ? " disabled" : "") + ">&#9654; Start session" +
      (App.selectedAssetId ? " on " + esc((progress.find((p) => p.assetId === App.selectedAssetId) || {}).symbol || "") : "") + "</button>" +
      '<a class="btn ghost" href="#/assessments">&#10003; Take an assessment</a>' +
      '<span class="small muted">XP earned: 2 per focused minute</span>' +
      "</div></div>"
    );
  }

  async function viewAssessments() {
    const [progress, list] = await Promise.all([
      API.get("/api/users/" + App.userId + "/study-progress"),
      API.get("/api/users/" + App.userId + "/assessments")
    ]);
    const byId = {};
    (progress || []).forEach((p) => (byId[p.assetId] = p));

    const rows = (list || [])
      .map((a) => {
        const p = byId[a.assetId] || {};
        const max = Number(a.maxSellPercentage) || 0;
        return (
          "<tr><td><b>" + esc(p.symbol || a.assetId) + "</b><div class=\"small muted\">" + esc(p.assetName || "") + "</div></td>" +
          '<td class="num mono">' + Number(a.scorePercentage) + "%</td>" +
          '<td class="num"><span class="pill ' + (max >= 75 ? "green" : max >= 50 ? "" : max > 0 ? "amber" : "red") + '">' +
          max + "% sell rights</span></td>" +
          '<td class="small muted">' + timeAgo(a.createdAt) + "</td></tr>"
        );
      })
      .join("");

    const options = (progress || [])
      .map((p) => '<option value="' + p.assetId + '">' + esc(p.symbol) + " — " + esc(p.assetName) + "</option>")
      .join("");

    return (
      '<div class="split lead">' +
      '<div class="card column"><h3>Submit a score</h3>' +
      '<div class="field"><label>Subject</label><select id="asmtAsset">' + options + "</select></div>" +
      '<div class="field"><label>Score %</label>' +
      '<input id="asmtScore" type="number" min="0" max="100" step="1" value="85" /></div>' +
      '<div class="field" style="margin-bottom:0"><label>Quick set</label><div class="quick">' +
      '<button data-score="60">60</button><button data-score="75">75</button><button data-score="88">88</button><button data-score="97">97</button>' +
      "</div></div>" +
      '<div class="push"><button class="btn" id="asmtSubmit" style="width:100%">&#10003; Record assessment</button>' +
      '<div class="small muted" style="margin-top:12px;line-height:1.7">Selling shares requires assessment rights:<br/>' +
      "&lt;50% → 0% &nbsp;·&nbsp; 50% → 25% &nbsp;·&nbsp; 70% → 50%<br/>85% → 75% &nbsp;·&nbsp; 95% → 100%</div></div></div>" +

      '<div class="card"><h3>Assessment history <span class="muted" style="text-transform:none;letter-spacing:0">' +
      (list || []).length + " records</span></h3>" +
      (rows
        ? "<table><thead><tr><th>Subject</th><th class=\"num\">Score</th><th class=\"num\">Sell rights</th><th>When</th></tr></thead><tbody>" + rows + "</tbody></table>"
        : '<div class="empty"><span class="big">&#128221;</span>No assessments yet — record your first score.</div>') +
      "</div></div>"
    );
  }

  async function viewChallenges() {
    const [challenges, mine, catalog, unlocked] = await Promise.all([
      API.get("/api/challenges"),
      API.get("/api/users/" + App.userId + "/challenges"),
      API.get("/api/achievements"),
      API.get("/api/users/" + App.userId + "/achievements")
    ]);
    const mineBy = {};
    (mine || []).forEach((c) => (mineBy[c.challengeId || (c.challenge && c.challenge.id)] = c));
    const unlockedCodes = new Set((unlocked || []).map((u) => u.code));

    const cards = (challenges || [])
      .map((c) => {
        const uc = mineBy[c.id] || { progress: 0, completed: false };
        const prog = uc.progress || 0;
        const done = uc.completed || prog >= c.targetValue;
        const claimed = uc.claimed || uc.completed;
        const v = Math.min(100, Math.round((prog / c.targetValue) * 100));
        return (
          '<div class="card" style="display:flex;flex-direction:column;gap:11px">' +
          '<div class="row spread center"><span class="pill ' + (done ? "green" : "grey") + '">' + (done ? "complete" : "in progress") + "</span>" +
          '<b class="mono" style="color:var(--primary)">+' + c.xpReward + " XP</b></div>" +
          "<div><b>" + esc(c.name) + '</b><div class="small muted">' + esc(c.description) + "</div></div>" +
          '<div class="bar ' + (done ? "green" : "") + '"><i style="width:' + v + '%"></i></div>' +
          '<div class="row spread small muted"><span>' + prog + " / " + c.targetValue + "</span><span>" + v + "%</span></div>" +
          '<button class="btn ' + (claimed ? "done" : done ? "success" : "ghost") + ' sm" style="margin-top:auto" data-claim="' + c.id + '"' + (done && !claimed ? "" : " disabled") + ">" +
          (claimed ? "&#10003; claimed" : done ? "Claim reward" : "keep going") + "</button>" +
          "</div>"
        );
      })
      .join("");

    const ach = (catalog || [])
      .map((a) => {
        const on = unlockedCodes.has(a.code);
        return (
          '<div class="ach' + (on ? "" : " locked") + '"><span class="ico">' + (on ? "&#127942;" : "&#128274;") + "</span>" +
          "<b>" + esc(a.name) + "</b><small>" + esc(a.description) + "</small></div>"
        );
      })
      .join("");

    return (
      '<div class="grid g3">' + cards + "</div>" +
      '<div class="card" style="margin-top:16px"><h3>Achievements</h3><div class="ach-grid">' + ach + "</div></div>"
    );
  }

  async function viewLeaderboard() {
    const entries = await API.get("/api/leaderboard?limit=20");
    const rows = (entries || [])
      .map((e, i) => {
        const medal = e.rank === 1 ? "gold" : e.rank === 2 ? "silver" : e.rank === 3 ? "bronze" : "";
        return (
          '<div class="lb-row ' + medal + (e.userId === App.userId ? " me" : "") + '">' +
          '<div class="rank">' + e.rank + "</div>" +
          '<div class="lb-name"><b>' + esc(e.username) + (e.userId === App.userId ? " (you)" : "") + "</b>" +
          "<small>&#128293; " + e.currentStreak + " day streak</small></div>" +
          '<div class="lb-xp">' + e.xp + " XP</div>" +
          '<div><span class="pill ' + (i === 0 ? "amber" : "grey") + '">' +
          (i === 0 ? "champion" : i < 3 ? "elite" : "student") + "</span></div></div>"
        );
      })
      .join("");
    return (
      '<div class="card"><h3>Top students <span class="muted" style="text-transform:none;letter-spacing:0">by XP</span></h3>' +
      (rows || '<div class="empty"><span class="big">&#127942;</span>No students yet.</div>') +
      "</div>"
    );
  }

  async function viewFriends() {
    const [friends, requests, lb] = await Promise.all([
      API.get("/api/users/" + App.userId + "/friends"),
      API.get("/api/users/" + App.userId + "/friend-requests"),
      API.get("/api/leaderboard?limit=50").catch(() => [])
    ]);
    const friendIds = new Set((friends || []).map((f) => f.id || f.userId));
    friendIds.add(App.userId);

    const incoming = (requests || [])
      .filter((r) => (r.sender && r.sender.id ? r.sender.id !== App.userId : !r.outgoing))
      .map((r) => {
        const name = r.senderName || (r.sender && r.sender.username) || "student";
        return (
          '<div class="friend-row"><div class="friend-who"><span class="avatar">' + initials(name) + "</span>" +
          '<div><b>' + esc(name) + '</b><div class="small muted">wants to be friends · ' + timeAgo(r.createdAt) + "</div></div></div>" +
          '<div class="row" style="gap:8px"><button class="btn sm success" data-accept="' + (r.id || r.requestId) + '">Accept</button>' +
          '<button class="btn sm ghost" data-reject="' + (r.id || r.requestId) + '">Decline</button></div></div>'
        );
      })
      .join("");

    const friendRows = (friends || [])
      .map((f) => {
        const name = f.username || f.name;
        return (
          '<div class="friend-row"><div class="friend-who"><span class="avatar">' + initials(name) + "</span>" +
          '<div><b>' + esc(name) + '</b><div class="small muted">studying together</div></div></div>' +
          '<span class="pill green">&#10003; friends</span></div>'
        );
      })
      .join("");

    const candidates = (lb || []).filter((e) => !friendIds.has(e.userId));
    const options = candidates
      .map((e) => '<option value="' + e.userId + '">' + esc(e.username) + " · " + e.xp + " XP</option>")
      .join("");

    return (
      '<div class="split">' +
      '<div class="card"><h3>Friends <span class="muted" style="text-transform:none;letter-spacing:0">' +
      (friends || []).length + " friends</span></h3>" +
      (friendRows || '<div class="empty"><span class="big">&#128101;</span>No friends yet.</div>') + "</div>" +

      '<div class="card column"><h3>Pending requests</h3>' +
      (incoming || '<div class="empty" style="padding:16px 0"><span class="big">&#9993;</span>No pending requests.</div>') +
      '<div class="push"><div class="field" style="margin-bottom:10px"><label>Add a student</label>' +
      '<select id="friendPick">' + (options || '<option value="">— nobody left to add —</option>') + "</select></div>" +
      '<button class="btn" id="friendAdd" style="width:100%"' + (options ? "" : " disabled") + ">+ Send request</button>" +
      '<div class="small muted" style="margin-top:10px">Find classmates from the leaderboard.</div></div>' +
      "</div></div>"
    );
  }

  /* ============================================================
     VAULT VIEWS
     ============================================================ */

  function viewVaultGate() {
    return (
      '<div class="unlock"><div class="unlock-box">' +
      '<div class="glyph">&#128274;</div>' +
      "<h2>Restricted Zone</h2>" +
      "<p>MARKET · PORTFOLIO · STATS · TRADING<br/>authorized personnel only</p>" +
      '<div class="term" id="term"><span class="dim">$ studymarket --open-vault</span><br/>' +
      '<span class="dim">&gt; establishing secure channel...</span><br/>' +
      '<span class="dim">&gt; awaiting passphrase<span class="cur"></span></span></div>' +
      '<input id="passInput" type="password" placeholder="passphrase" autocomplete="off" />' +
      '<div class="unlock-err" id="unlockErr"></div>' +
      '<button class="btn" id="unlockBtn" style="width:100%;margin-top:8px">Unlock vault</button>' +
      '<div class="small muted" style="text-align:center;margin-top:14px;font-family:var(--mono);font-size:11px">' +
      "hint: any passphrase opens the demo vault — or click through the nav</div>" +
      "</div></div>"
    );
  }

  function bindVaultGate() {
    const input = $("#passInput");
    const err = $("#unlockErr");
    const term = $("#term");
    const lines = [
      '<span class="dim">$ studymarket --open-vault</span><br/>',
      '<span class="dim">&gt; establishing secure channel... </span><span class="ok">OK</span><br/>',
      '<span class="dim">&gt; loading market feed... </span><span class="ok">OK</span><br/>',
      '<span class="dim">&gt; awaiting passphrase<span class="cur"></span></span>'
    ];
    let i = 1;
    const tick = setInterval(() => {
      if (i >= lines.length) return clearInterval(tick);
      term.innerHTML = lines.slice(0, ++i).join("");
      if (i >= lines.length && input) input.focus();
    }, 550);

    function tryUnlock() {
      const val = (input.value || "").trim();
      if (!val) {
        err.textContent = "passphrase required";
        return;
      }
      clearInterval(tick);
      term.innerHTML =
        '<span class="dim">$ verify --passphrase ****</span><br/>' +
        '<span class="ok">&gt; ACCESS GRANTED — welcome back, operator</span><br/>' +
        '<span class="dim">&gt; vault unlocked for this session</span>';
      err.textContent = "";
      App.unlocked = true;
      sessionStorage.setItem("sm_vault", "1");
      $("#vaultGroup").hidden = false;
      setTimeout(() => {
        location.hash = "#/market";
        toast("Vault unlocked — the terminal is yours", "ok");
      }, 700);
    }

    $("#unlockBtn").addEventListener("click", tryUnlock);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryUnlock();
    });
    setTimeout(() => input.focus(), 200);
  }

  async function viewMarket() {
    const [assets, today, eligibility] = await Promise.all([
      API.get("/api/assets"),
      API.get("/api/market-activity/today"),
      API.get("/api/users/" + App.userId + "/purchase-eligibility").catch(() => [])
    ]);
    const purchaseBy = {};
    (eligibility || []).forEach((e) => (purchaseBy[e.assetId] = e));
    App._purchaseBy = purchaseBy;
    const actBy = {};
    (today || []).forEach((a) => {
      const id = a.assetId || (a.asset && a.asset.id);
      actBy[id] = a;
    });

    const advancers = assets.filter((a) => changePct(a) > 0).length;
    const decliners = assets.filter((a) => changePct(a) < 0).length;
    const totalBuy = (today || []).reduce((s, a) => s + Number(a.buyVolume || 0), 0);
    const mostActive = (today || [])
      .slice()
      .sort((a, b) => Number(b.studyMinutes || 0) - Number(a.studyMinutes || 0))[0];

    const ticker = assets
      .map((a) => {
        const c = changePct(a);
        return (
          "<span><b>" + a.symbol + "</b> " + num(a.currentPrice) +
          ' <i style="font-style:normal;color:' + (c >= 0 ? "var(--neon)" : "var(--red)") + '">' + signed(c) + "%</i></span>"
        );
      })
      .join("");
    const tickerHTML = '<div class="ticker">' + ticker + ticker + "</div>";

    const rows = assets
      .map((a) => {
        const c = changePct(a);
        const act = actBy[a.id] || {};
        const hist = Demo.priceHistory(a.id, 24);
        const color = c >= 0 ? "#00e58a" : "#ff4d6d";
        const purchase = purchaseBy[a.id] || { unlocked: true, remainingMinutes: 0 };
        return (
          '<tr data-market-asset="' + a.id + '" style="cursor:pointer">' +
          '<td><div class="sym-cell"><span class="sq">' + a.symbol.slice(0, 4) + "</span>" +
          '<span class="nm">' + esc(a.name) + "<small>" + esc(a.category) + " · imp " + a.globalImportance +
          (purchase.unlocked ? " · &#10003; purchase unlocked" : " · &#128274; study " + purchase.remainingMinutes + "m") +
          "</small></span></div></td>" +
          '<td class="num mono"><b>' + num(a.currentPrice) + "</b></td>" +
          '<td class="num mono ' + cls(c) + '">' + signed(c) + "%</td>" +
          "<td>" + sparkSVG(hist, 104, 30, color, true) + "</td>" +
          '<td class="num mono">' + (act.studyMinutes || 0) + "</td>" +
          '<td class="num mono" style="color:var(--cyan)">' + num(act.buyVolume || 0) + "</td>" +
          '<td class="num mono" style="color:var(--red)">' + num(act.sellVolume || 0) + "</td>" +
          '<td class="num"><button class="pill' + (purchase.unlocked ? "" : " grey") + '" data-buy="' + a.id + '"' +
          ' title="' + (purchase.unlocked ? "buy " + esc(a.symbol) + " in the trading terminal" : "study unlocks buying") + '">' +
          (purchase.unlocked ? "buy &#8594;" : "&#128274; study " + purchase.remainingMinutes + "m") + "</button></td></tr>"
        );
      })
      .join("");

    return (
      '<div class="vault-head"><div><div class="vh-title">&#9670; Market // subject exchange</div>' +
      '<div class="vh-sub">prices move with study activity, goals &amp; order flow · max swing ±5% per run</div></div>' +
      '<button class="btn ghost sm" id="runMarket">&#9654; Run market cycle</button></div>' +

      '<div class="row wrap" style="gap:12px;margin-bottom:16px">' +
      '<div class="kpi grow"><div class="k-label">Advancers</div><div class="k-value pos">' + advancers + '</div><div class="k-sub">of ' + assets.length + " subjects</div></div>" +
      '<div class="kpi red grow"><div class="k-label">Decliners</div><div class="k-value" style="color:var(--red)">' + decliners + "</div><div class=\"k-sub\">losing ground</div></div>" +
      '<div class="kpi cyan grow"><div class="k-label">Buy volume today</div><div class="k-value">' + num(totalBuy) + '</div><div class="k-sub">BTC deployed</div></div>' +
      '<div class="kpi violet grow"><div class="k-label">Most studied</div><div class="k-value">' + esc((mostActive && (mostActive.symbol || (mostActive.asset && mostActive.asset.symbol))) || "—") +
      '</div><div class="k-sub">' + ((mostActive && mostActive.studyMinutes) || 0) + " min today</div></div>" +
      "</div>" +

      tickerHTML +

      '<div class="card"><h3>Live board <span class="muted" style="text-transform:none;letter-spacing:0">click a row for activity · buy needs the subject studied first</span></h3>' +
      "<table><thead><tr><th>Subject</th><th class=\"num\">Price</th><th class=\"num\">Change</th><th>30d</th>" +
      "<th class=\"num\">Study min</th><th class=\"num\">Buy vol</th><th class=\"num\">Sell vol</th><th></th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table>" +
      '<div id="marketDetail"></div></div>'
    );
  }

  async function viewTrade() {
    const [assets, portfolio, assessments, eligibility] = await Promise.all([
      API.get("/api/assets"),
      API.get("/api/users/" + App.userId + "/portfolio"),
      API.get("/api/users/" + App.userId + "/assessments").catch(() => []),
      API.get("/api/users/" + App.userId + "/purchase-eligibility").catch(() => [])
    ]);
    const purchaseBy = {};
    (eligibility || []).forEach((e) => (purchaseBy[e.assetId] = e));
    App._purchaseBy = purchaseBy;
    App.tradeAssetId = App.tradeAssetId || assets[0].id;
    const side = App.tradeSide || "BUY";

    const posBy = {};
    (portfolio.positions || []).forEach((p) => (posBy[p.assetId] = p));
    const rightFor = (id) => {
      const usable = (assessments || []).filter((a) => a.assetId === id && rightsOf(a) > 0);
      return usable.length ? rightsOf(usable[0]) : 0;
    };

    const assetRows = assets
      .map((a) => {
        const c = changePct(a);
        const pos = posBy[a.id];
        const locked = purchaseBy[a.id] && !purchaseBy[a.id].unlocked;
        return (
          '<tr data-pick="' + a.id + '" style="cursor:pointer;' + (a.id === App.tradeAssetId ? "background:rgba(56,225,255,0.06)" : "") + '">' +
          '<td><div class="sym-cell"><span class="sq">' + a.symbol.slice(0, 4) + "</span><span class=\"nm\">" + esc(a.name) +
          (locked ? " <small>&#128274; study " + purchaseBy[a.id].remainingMinutes + "m</small>" : "") + "</span></div></td>" +
          '<td class="num mono">' + num(a.currentPrice) + "</td>" +
          '<td class="num mono ' + cls(c) + '">' + signed(c) + "%</td>" +
          '<td class="num mono">' + (pos ? num(pos.quantity) : "—") + "</td></tr>"
        );
      })
      .join("");

    const asset = assets.find((a) => a.id === App.tradeAssetId) || assets[0];
    const pos = posBy[asset.id];
    const rights = rightFor(asset.id);
    const bal = Number(portfolio.simulatedBtcBalance);
    const purchase = purchaseBy[asset.id] || { unlocked: true, remainingMinutes: 0 };

    const posRows = (portfolio.positions || [])
      .map((p) =>
        "<tr><td><b>" + p.symbol + "</b></td>" +
        '<td class="num mono">' + num(p.quantity) + "</td>" +
        '<td class="num mono">' + num(p.averageBuyPrice) + "</td>" +
        '<td class="num mono">' + num(p.currentPrice) + "</td>" +
        '<td class="num mono ' + cls(p.unrealizedPnl) + '">' + signed(p.unrealizedPnl) + "</td></tr>"
      )
      .join("");

    return (
      '<div class="vault-head"><div><div class="vh-title">&#8645; Trading terminal</div>' +
      '<div class="vh-sub">settlement in simulated BTC · sells gated by assessment rights</div></div>' +
      '<div class="mono small" style="color:var(--d-muted)">balance <b style="color:var(--neon)">' + num(bal) + " BTC</b></div></div>" +

      '<div class="split">' +
      '<div class="card" style="padding:0;overflow:hidden"><div style="padding:16px 18px 0"><h3 style="margin-bottom:10px">Instruments</h3></div>' +
      "<table><thead><tr><th>Subject</th><th class=\"num\">Price</th><th class=\"num\">24h</th><th class=\"num\">Held</th></tr></thead>" +
      "<tbody>" + assetRows + "</tbody></table></div>" +

      '<div class="stack">' +
      '<div class="ticket">' +
      '<div class="ticket-tabs">' +
      '<button class="buy' + (side === "BUY" ? " on" : "") + '" data-side="BUY">Buy</button>' +
      '<button class="sell' + (side === "SELL" ? " on" : "") + '" data-side="SELL">Sell</button></div>' +
      '<div class="ticket-body">' +
      '<div class="field"><label>Instrument</label><select id="tAsset">' +
      assets.map((a) => '<option value="' + a.id + '"' + (a.id === asset.id ? " selected" : "") + ">" + a.symbol + " — " + esc(a.name) + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label>Quantity</label><input id="tQty" type="number" min="0" step="any" placeholder="0.0" value="" /></div>' +
      '<div class="quick" id="tQuick">' +
      '<button data-q="0.25">25%</button><button data-q="0.5">50%</button><button data-q="0.75">75%</button><button data-q="1">max</button></div>' +
      '<div class="push">' +
      '<div class="order-line"><span>mark price</span><b>' + num(asset.currentPrice) + " BTC</b></div>" +
      '<div class="order-line"><span>position</span><b>' + (pos ? num(pos.quantity) + " @ " + num(pos.averageBuyPrice) : "none") + "</b></div>" +
      '<div class="order-line total"><span>order value</span><b id="tValue">0.0000 BTC</b></div>' +
      '<div class="order-line"><span>balance after</span><b id="tAfter">' + num(bal) + " BTC</b></div>" +
      "</div>" +
      (side === "SELL"
        ? rights > 0
          ? '<div class="note ok">assessment rights: ' + rights + "% of position may be sold</div>"
          : '<div class="note err">no sell rights — record an assessment first (Assessments &#8594;)</div>'
        : purchase.unlocked
          ? '<div class="note warn">study requirement met · prices settle instantly at mark</div>'
          : '<div class="note err">study unlocks buying — ' + purchase.remainingMinutes + " more minutes of " +
            esc(asset.symbol) + " to go (" + purchase.studiedMinutes + "/" + purchase.requiredStudyMinutes + " done)</div>") +
      '<button class="btn" id="tSubmit" style="width:100%;margin-top:14px"' +
      (side === "SELL" && rights <= 0 ? " disabled" : "") + ">" +
      (side === "BUY" && !purchase.unlocked
        ? "&#9654; Study " + purchase.remainingMinutes + " min to unlock"
        : (side === "BUY" ? "Buy " : "Sell ") + asset.symbol) + "</button>" +
      '<div class="unlock-err" id="tErr"></div>' +
      "</div></div>" +

      '<div class="card"><h3>Recent fills</h3>' +
      (Demo.state.trades.slice(0, 6).map((t) =>
        '<div class="order-line"><span><b style="color:' + (t.side === "BUY" ? "var(--neon)" : "var(--red)") + '">' + t.side +
        "</b> " + t.symbol + " ×" + num(t.quantity) + '</span><b>' + num(t.totalValue) + "</b></div>"
      ).join("") || '<div class="empty">No trades yet.</div>') +
      "</div></div></div>" +

      '<div class="card" style="margin-top:16px"><h3>Your positions</h3>' +
      (posRows
        ? "<table><thead><tr><th>Subject</th><th class=\"num\">Qty</th><th class=\"num\">Avg</th><th class=\"num\">Mark</th><th class=\"num\">uPnL</th></tr></thead><tbody>" + posRows + "</tbody></table>"
        : '<div class="empty"><span class="big">&#128188;</span>No open positions.</div>') +
      "</div>"
    );
  }

  async function viewPortfolio() {
    const p = await API.get("/api/users/" + App.userId + "/portfolio");
    const positions = p.positions || [];
    const palette = ["#00e58a", "#38e1ff", "#8b5cf6", "#fbbf24", "#ff4d6d", "#64a8ff"];
    const segs = positions.map((x, i) => ({ value: Number(x.currentValue) || 0, color: palette[i % palette.length] }));
    const pnl = Number(p.totalUnrealizedPnl) || 0;
    const pnlPct = Number(p.totalUnrealizedPnlPercentage) || 0;

    const rows = positions
      .map((x, i) => {
        const c = changePct(Demo.assetById(x.assetId) || {});
        return (
          "<tr><td><div class=\"sym-cell\"><span class=\"sq\" style=\"border-color:" + palette[i % palette.length] + "55;color:" + palette[i % palette.length] + "\">" +
          x.symbol.slice(0, 4) + "</span><span class=\"nm\">" + esc(x.name) + "</span></div></td>" +
          '<td class="num mono">' + num(x.quantity) + "</td>" +
          '<td class="num mono">' + num(x.averageBuyPrice) + "</td>" +
          '<td class="num mono">' + num(x.currentPrice) + "</td>" +
          '<td class="num mono">' + num(x.investedValue) + "</td>" +
          '<td class="num mono">' + num(x.currentValue) + "</td>" +
          '<td class="num mono ' + cls(x.unrealizedPnl) + '">' + signed(x.unrealizedPnl) + "</td>" +
          '<td class="num mono ' + cls(x.unrealizedPnlPercentage) + '">' + signed(x.unrealizedPnlPercentage) + "%</td>" +
          '<td class="num mono ' + cls(c) + '">' + signed(c) + "%</td></tr>"
        );
      })
      .join("");

    const legend = positions
      .map((x, i) =>
        '<div class="lg"><span class="dot" style="background:' + palette[i % palette.length] + '"></span>' +
        x.symbol + '<span class="val">' + Math.round((Number(x.currentValue) / (Number(p.totalCurrentValue) || 1)) * 100) + "%</span></div>"
      )
      .join("") +
      '<div class="lg"><span class="dot" style="background:#2b3d50"></span>cash<span class="val">' +
      Math.round((Number(p.simulatedBtcBalance) / (Number(p.totalPortfolioValue) || 1)) * 100) + "%</span></div>";

    return (
      '<div class="vault-head"><div><div class="vh-title">&#128188; Portfolio // account ' +
      String(App.userId).padStart(4, "0") + "</div>" +
      '<div class="vh-sub">unrealized P&amp;L settles at current mark</div></div>' +
      '<div class="mono small" style="color:var(--d-muted)">equity <b style="color:var(--neon)">' + num(p.totalPortfolioValue) + " BTC</b></div></div>" +

      '<div class="grid g4" style="gap:12px">' +
      '<div class="kpi"><div class="k-label">Total value</div><div class="k-value">' + num(p.totalPortfolioValue) + '</div><div class="k-sub">BTC equity</div></div>' +
      '<div class="kpi cyan"><div class="k-label">Cash balance</div><div class="k-value">' + num(p.simulatedBtcBalance) + '</div><div class="k-sub">free BTC</div></div>' +
      '<div class="kpi violet"><div class="k-label">Invested</div><div class="k-value">' + num(p.totalCurrentValue) + '</div><div class="k-sub">cost basis ' + num(p.totalInvestedValue) + "</div></div>" +
      '<div class="kpi ' + (pnl >= 0 ? "" : "red") + '"><div class="k-label">Unrealized P&amp;L</div><div class="k-value ' + cls(pnl) + '">' +
      signed(pnl) + '</div><div class="k-sub ' + cls(pnlPct) + '">' + signed(pnlPct) + "%</div></div>" +
      "</div>" +

      '<div class="split">' +
      '<div class="card" style="padding:0;overflow:hidden"><div style="padding:16px 18px 0"><h3>Positions</h3></div>' +
      (rows
        ? "<table><thead><tr><th>Subject</th><th class=\"num\">Qty</th><th class=\"num\">Avg</th><th class=\"num\">Mark</th><th class=\"num\">Invested</th><th class=\"num\">Value</th><th class=\"num\">uPnL</th><th class=\"num\">%</th><th class=\"num\">24h</th></tr></thead><tbody>" + rows + "</tbody></table>"
        : '<div class="empty"><span class="big">&#128179;</span>Flat — no open positions. Head to <a href="#/trade" style="color:var(--cyan)">Trade</a>.</div>') +
      "</div>" +

      '<div class="card column"><h3>Allocation</h3>' +
      '<div class="donut fill-y">' +
      donutSVG(segs.concat([{ value: Number(p.simulatedBtcBalance) || 0, color: "#2b3d50" }]), 170) +
      '<div class="donut-center"><b>' + num(p.totalPortfolioValue, 3) + "</b><small>BTC</small></div></div>" +
      '<div class="legend pin">' + (legend || '<div class="muted small">nothing allocated</div>') + "</div>" +
      "</div></div>"
    );
  }

  async function viewStats() {
    const [stats, sessions, portfolio] = await Promise.all([
      API.get("/api/users/" + App.userId + "/stats"),
      API.get("/api/users/" + App.userId + "/study-sessions"),
      API.get("/api/users/" + App.userId + "/portfolio")
    ]);

    // last 14 days of completed minutes
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: "narrow" }), min: 0 });
    }
    const byKey = {};
    days.forEach((d) => (byKey[d.key] = d));
    (sessions || [])
      .filter((s) => s.status === "COMPLETED" && s.endedAt)
      .forEach((s) => {
        const k = s.endedAt.slice(0, 10);
        if (byKey[k]) byKey[k].min += Math.floor((s.durationSeconds || 0) / 60);
      });
    const maxMin = Math.max(30, ...days.map((d) => d.min));
    const bars = days
      .map((d) =>
        '<div class="cb"><i style="height:' + Math.round((d.min / maxMin) * 100) + '%" title="' + d.min + ' min"></i><small>' +
        d.label + "</small></div>"
      )
      .join("");

    const donut = donutSVG(
      [
        { value: stats.buyTrades || 0, color: "#00e58a" },
        { value: stats.sellTrades || 0, color: "#ff4d6d" }
      ],
      150
    );

    const progress = await API.get("/api/users/" + App.userId + "/study-progress");
    const mastery = (progress || [])
      .slice(0, 8)
      .map((p) => {
        const v = Number(p.progressPercentage) || 0;
        return (
          '<div><div class="row spread small" style="margin-bottom:5px"><b>' + esc(p.symbol) +
          '</b><span class="muted">' + p.completedMinutes + "/" + p.targetMinutes + ' min</span></div>' +
          '<div class="bar"><i style="width:' + v + '%"></i></div></div>'
        );
      })
      .join("");

    return (
      '<div class="vault-head"><div><div class="vh-title">&#9638; Stats // performance matrix</div>' +
      '<div class="vh-sub">study output &amp; trading behaviour, correlated</div></div></div>' +

      '<div class="grid g4" style="gap:12px">' +
      '<div class="kpi"><div class="k-label">Total study</div><div class="k-value">' + stats.totalStudyMinutes + '</div><div class="k-sub">minutes logged</div></div>' +
      '<div class="kpi cyan"><div class="k-label">Sessions</div><div class="k-value">' + stats.totalStudySessions + '</div><div class="k-sub">completed focus blocks</div></div>' +
      '<div class="kpi violet"><div class="k-label">XP</div><div class="k-value">' + stats.totalXp + '</div><div class="k-sub">streak ' + stats.currentStreak + "d · best " + stats.longestStreak + 'd</div></div>' +
      '<div class="kpi ' + (stats.masteredAssets ? "" : "red") + '"><div class="k-label">Mastery</div><div class="k-value">' + stats.masteredAssets +
      '</div><div class="k-sub">of ' + stats.assetsStudied + " subjects studied</div></div>" +
      "</div>" +

      '<div class="split">' +
      '<div class="card column"><h3>Study minutes — last 14 days</h3><div class="chart-bars fill-y">' + bars + "</div></div>" +

      '<div class="card column"><h3>Trade split</h3>' +
      '<div class="donut fill-y">' + donut +
      '<div class="donut-center"><b>' + stats.totalTrades + "</b><small>TRADES</small></div></div>" +
      '<div class="legend pin">' +
      '<div class="lg"><span class="dot" style="background:#00e58a"></span>buys<span class="val">' + stats.buyTrades + "</span></div>" +
      '<div class="lg"><span class="dot" style="background:#ff4d6d"></span>sells<span class="val">' + stats.sellTrades + "</span></div>" +
      '<div class="lg"><span class="dot" style="background:#2b3d50"></span>goals hit<span class="val">' + stats.goalsCompleted + "</span></div>" +
      "</div></div>" +
      "</div>" +

      '<div class="card" style="margin-top:16px"><h3>Subject mastery <span class="muted" style="text-transform:none;letter-spacing:0">progress on your most studied subjects</span></h3>' +
      '<div class="bar-list">' + mastery + "</div></div>"
    );
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  const VIEWS = {
    "#/": viewDashboard,
    "#/study": viewStudy,
    "#/assessments": viewAssessments,
    "#/challenges": viewChallenges,
    "#/leaderboard": viewLeaderboard,
    "#/friends": viewFriends,
    "#/vault": viewVaultGate,
    "#/market": viewMarket,
    "#/trade": viewTrade,
    "#/portfolio": viewPortfolio,
    "#/stats": viewStats
  };

  async function render() {
    const route = App.route;
    const isVault = VAULT_ROUTES.indexOf(route) !== -1;

    // gate the vault
    if (isVault && route !== "#/vault" && !App.unlocked) {
      location.replace("#/vault");
      App.route = "#/vault";
    }

    setChrome(App.route);
    const view = $("#view");
    view.innerHTML = '<div class="empty"><span class="big">&#8987;</span>Loading&hellip;</div>';

    try {
      if (App.route !== "#/vault") await loadActiveSession();
      const html = await VIEWS[App.route]();
      if (App.route !== route) return; // navigated away mid-load
      view.innerHTML = html;
      bindView(App.route);
      startTimerLoop();
    } catch (err) {
      if (App.route !== route) return;
      view.innerHTML =
        '<div class="empty"><span class="big">&#9888;</span>' + esc(err.message || "Something went wrong") +
        '<br/><br/><button class="btn ghost sm" onclick="location.reload()">Retry</button></div>';
      console.error(err);
    }
  }

  function bindView(route) {
    if (route === "#/vault") return bindVaultGate();

    // stop session buttons (dashboard + study)
    const stop = $("#stopBtn");
    if (stop) {
      stop.addEventListener("click", async () => {
        stop.disabled = true;
        try {
          const s = App.activeSession;
          await API.post("/api/study-sessions/" + s.id + "/stop");
          App.activeSession = null;
          toast("Session stopped — XP banked. Nicely done.", "ok");
          await loadUser();
          render();
        } catch (e) {
          toast(e.message, "err");
          stop.disabled = false;
        }
      });
    }

    if (route === "#/study") bindStudy();
    if (route === "#/assessments") bindAssessments();
    if (route === "#/challenges") bindChallenges();
    if (route === "#/friends") bindFriends();
    if (route === "#/market") bindMarket();
    if (route === "#/trade") bindTrade();
  }

  function bindStudy() {
    $$(".asset-card").forEach((card) => {
      card.addEventListener("click", () => {
        App.selectedAssetId = Number(card.dataset.asset);
        App.studyIntent = null;
        render();
      });
    });

    // purchase request: the required study session before buying a subject
    const iStart = $("#intentStart");
    if (iStart) {
      iStart.addEventListener("click", async () => {
        const assetId = App.studyIntent && App.studyIntent.assetId;
        if (!assetId) return;
        App.selectedAssetId = assetId;
        try {
          const s = await API.post("/api/study-sessions/start", { userId: App.userId, assetId });
          App.activeSession = s;
          toast("Required study timer started — complete it to unlock the purchase.", "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }
    const iStop = $("#intentStop");
    if (iStop) {
      iStop.addEventListener("click", async () => {
        iStop.disabled = true;
        try {
          const s = App.activeSession;
          await API.post("/api/study-sessions/" + s.id + "/stop");
          App.activeSession = null;
          toast("Session stopped — requirement validated.", "ok");
          await loadUser();
          render();
        } catch (e) {
          toast(e.message, "err");
          iStop.disabled = false;
        }
      });
    }
    const iBuy = $("#intentBuy");
    if (iBuy) {
      iBuy.addEventListener("click", () => {
        const assetId = App.studyIntent && App.studyIntent.assetId;
        App.studyIntent = null;
        App.tradeAssetId = assetId;
        App.tradeSide = "BUY";
        location.hash = "#/trade";
      });
    }

    const start = $("#startBtn");
    if (start) {
      start.addEventListener("click", async () => {
        if (!App.selectedAssetId) {
          toast("Pick a subject card first", "warn");
          return;
        }
        try {
          const s = await API.post("/api/study-sessions/start", {
            userId: App.userId,
            assetId: App.selectedAssetId
          });
          App.activeSession = s;
          toast("Focus session started — go deep!", "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }
    $$("[data-goal]").forEach((b) => {
      b.addEventListener("click", async () => {
        try {
          await API.patch("/api/users/" + App.userId + "/daily-goal", { dailyGoalMinutes: Number(b.dataset.goal) });
          toast("Daily goal set to " + b.dataset.goal + " minutes", "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      });
    });
  }

  function bindAssessments() {
    $$("[data-score]").forEach((b) =>
      b.addEventListener("click", () => ($("#asmtScore").value = b.dataset.score))
    );
    const submit = $("#asmtSubmit");
    if (submit) {
      submit.addEventListener("click", async () => {
        const assetId = Number($("#asmtAsset").value);
        const score = Number($("#asmtScore").value);
        try {
          const a = await API.post("/api/assessments", {
            userId: App.userId,
            assetId,
            scorePercentage: score
          });
          toast("Score " + score + "% recorded → " + Number(a.maxSellPercentage) + "% sell rights", "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }
  }

  function bindChallenges() {
    $$("[data-claim]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await API.post("/api/users/" + App.userId + "/challenges/" + b.dataset.claim + "/claim");
          toast("Reward claimed — XP added!", "ok");
          await loadUser();
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      })
    );
  }

  function bindFriends() {
    $$("[data-accept]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await API.post("/api/friends/requests/" + b.dataset.accept + "/accept?userId=" + App.userId);
          toast("Friend added", "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      })
    );
    $$("[data-reject]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await API.post("/api/friends/requests/" + b.dataset.reject + "/reject?userId=" + App.userId);
          toast("Request declined", "warn");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      })
    );
    const add = $("#friendAdd");
    if (add) {
      add.addEventListener("click", async () => {
        const sel = $("#friendPick");
        const id = Number(sel.value);
        if (!id) return;
        const name = sel.options[sel.selectedIndex].text.split(" · ")[0];
        try {
          await API.post("/api/friends/requests", {
            senderUserId: App.userId,
            receiverUserId: id,
            receiverName: name
          });
          toast("Friend request sent to " + name, "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }
  }

  function bindMarket() {
    const run = $("#runMarket");
    if (run) {
      run.addEventListener("click", async () => {
        run.disabled = true;
        run.textContent = "running…";
        try {
          const res = await API.post("/api/market/run");
          const n = Array.isArray(res) ? res.length : (res && res.updated) || 0;
          toast("Market cycle complete — " + n + " instruments repriced", "ok");
          render();
        } catch (e) {
          toast(e.message, "err");
          run.disabled = false;
          run.innerHTML = "&#9654; Run market cycle";
        }
      });
    }
    $$("[data-market-asset]").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("[data-trade]")) return;
        showMarketDetail(Number(row.dataset.marketAsset));
      });
    });
    // learning unlocks buying: locked subjects are routed through Study World
    $$("[data-buy]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const assetId = Number(b.dataset.buy);
        const purchase = (App._purchaseBy || {})[assetId];
        if (purchase && !purchase.unlocked) {
          toast("Study " + purchase.remainingMinutes + " min of " + purchase.symbol + " to unlock buying", "warn");
          goStudyForBuy(assetId);
          return;
        }
        App.tradeAssetId = assetId;
        App.tradeSide = "BUY";
        location.hash = "#/trade";
      });
    });
  }

  async function showMarketDetail(assetId) {
    const box = $("#marketDetail");
    if (!box) return;
    const a = Demo.assetById(assetId) || {};
    box.innerHTML = '<div class="empty">&#8987; loading activity&hellip;</div>';
    try {
      const hist = (await API.get("/api/assets/" + assetId + "/market-activity"))
        .slice()
        .sort((a, b) => String(a.activityDate).localeCompare(String(b.activityDate)));
      const max = Math.max(1, ...hist.map((d) => d.studyMinutes || 0));
      const bars = hist
        .map((d) =>
          '<div class="cb"><i style="height:' + Math.round(((d.studyMinutes || 0) / max) * 100) + '%" title="' +
          d.studyMinutes + ' min"></i><small>' + d.activityDate.slice(8) + "</small></div>"
        )
        .join("");
      const buy = (hist || []).reduce((s, d) => s + Number(d.buyVolume || 0), 0);
      const sell = (hist || []).reduce((s, d) => s + Number(d.sellVolume || 0), 0);
      box.innerHTML =
        '<div style="border-top:1px dashed var(--d-border);margin-top:14px;padding-top:16px">' +
        '<div class="row wrap" style="gap:14px;align-items:flex-start">' +
        '<div class="grow"><div class="k-label" style="margin-bottom:10px">&#9670; ' + esc(a.name) + " — 30d study activity</div>" +
        '<div class="chart-bars" style="height:120px">' + bars + "</div></div>" +
        '<div style="width:250px">' +
        '<div class="order-line"><span>30d buy volume</span><b style="color:var(--neon)">' + num(buy) + " BTC</b></div>" +
        '<div class="order-line"><span>30d sell volume</span><b style="color:var(--red)">' + num(sell) + " BTC</b></div>" +
        '<div class="order-line"><span>opening → mark</span><b>' + num(a.openingPrice) + " → " + num(a.currentPrice) + "</b></div>" +
        '<div class="order-line"><span>importance</span><b>' + a.globalImportance + "/10</b></div>" +
        '<a class="btn ghost sm" style="width:100%;margin-top:12px" href="#/trade">open in terminal &#8594;</a>' +
        "</div></div></div>";
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }

  function bindTrade() {
    $$("[data-pick]").forEach((r) =>
      r.addEventListener("click", () => {
        App.tradeAssetId = Number(r.dataset.pick);
        render();
      })
    );
    const sel = $("#tAsset");
    if (sel) {
      sel.addEventListener("change", () => {
        App.tradeAssetId = Number(sel.value);
        render();
      });
    }
    $$("[data-side]").forEach((b) =>
      b.addEventListener("click", () => {
        App.tradeSide = b.dataset.side;
        render();
      })
    );

    const qty = $("#tQty");
    const err = $("#tErr");
    if (!qty) return;

    const assetId = App.tradeAssetId;
    const side = App.tradeSide || "BUY";
    const price = Demo.assetById(assetId).currentPrice;

    // async position/rights info for value preview
    API.get("/api/users/" + App.userId + "/portfolio").then((p) => {
      const pos = (p.positions || []).find((x) => x.assetId === assetId);
      return API.get("/api/users/" + App.userId + "/assessments")
        .catch(() => [])
        .then((as) => {
          App._tradeCtx = { price, balance: Number(p.simulatedBtcBalance), pos, side, assetId, assessments: as };
          updateTicket();
        });
    });

    function updateTicket() {
      const ctx = App._tradeCtx;
      if (!ctx) return;
      const q = Number(qty.value) || 0;
      const value = q * ctx.price;
      $("#tValue").textContent = num(value) + " BTC";
      const after = ctx.side === "BUY" ? ctx.balance - value : ctx.balance + value;
      $("#tAfter").textContent = num(after) + " BTC";
      $("#tAfter").className = after < 0 ? "neg" : "";
    }

    qty.addEventListener("input", () => {
      err.textContent = "";
      updateTicket();
    });

    $$("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        const ctx = App._tradeCtx;
        if (!ctx) return;
        const f = Number(b.dataset.q);
        let maxQty;
        if (ctx.side === "BUY") maxQty = ctx.balance / ctx.price;
        else {
          const rights = (ctx.assessments || [])
            .filter((a) => a.assetId === ctx.assetId && rightsOf(a) > 0)
            .map(rightsOf)[0] || 0;
          const held = ctx.pos ? ctx.pos.quantity : 0;
          maxQty = Math.min(held, (held * rights) / 100);
        }
        qty.value = (Math.max(0, maxQty) * f).toFixed(4);
        updateTicket();
      })
    );

    $("#tSubmit").addEventListener("click", async () => {
      const ctx = App._tradeCtx;
      const q = Number(qty.value);
      if (!ctx || !(q > 0)) {
        err.textContent = "enter a quantity greater than zero";
        return;
      }
      const purchase = (App._purchaseBy || {})[assetId];
      if (side === "BUY" && purchase && !purchase.unlocked) {
        toast("Study " + purchase.remainingMinutes + " min of " + purchase.symbol + " to unlock buying", "warn");
        goStudyForBuy(assetId);
        return;
      }
      const btn = $("#tSubmit");
      btn.disabled = true;
      try {
        const res = await API.post("/api/trades/" + (side === "BUY" ? "buy" : "sell"), {
          userId: App.userId,
          assetId,
          quantity: q
        });
        toast(
          (side === "BUY" ? "Bought " : "Sold ") + num(q) + " " + Demo.assetById(assetId).symbol +
            " @ " + num(res.price) + " · balance " + num(res.resultingBalance) + " BTC",
          "ok"
        );
        await loadUser();
        render();
      } catch (e) {
        // the backend answers 409 STUDY_REQUIRED when the subject is not studied enough
        if (e.payload && e.payload.code === "STUDY_REQUIRED") {
          toast(e.message, "warn");
          goStudyForBuy(e.payload.assetId || assetId);
          return;
        }
        err.textContent = e.message;
        btn.disabled = false;
      }
    });
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    App.mode = await API.detect();
    await loadUser();
    await loadActiveSession();

    $("#vaultEntry").addEventListener("click", () => {
      location.hash = "#/vault";
    });
    $("#relockBtn").addEventListener("click", () => {
      App.unlocked = false;
      sessionStorage.removeItem("sm_vault");
      $("#vaultGroup").hidden = true;
      location.hash = "#/";
      toast("Vault relocked", "warn");
    });
    document.addEventListener("sm:mode", () => setChrome(App.route));

    window.addEventListener("hashchange", () => {
      App.route = location.hash || "#/";
      render();
      window.scrollTo(0, 0);
    });

    App.route = location.hash || "#/";
    if (VAULT_ROUTES.indexOf(App.route) === -1 && !VIEWS[App.route]) App.route = "#/";
    render();
  }

  boot();
})();
