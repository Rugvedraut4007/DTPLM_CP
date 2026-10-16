import { Link } from "react-router-dom";

import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { useApp } from "../state/AppContext.jsx";
import { Bar, DataView } from "../components/UI.jsx";
import { Ring } from "../components/Charts.jsx";
import { FocusBar } from "../components/Session.jsx";

function medalFor(i) {
  return i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
}

export default function Dashboard() {
  const { userId } = useApp();

  const query = useAsync(async () => {
    const [d, lb] = await Promise.all([
      API.get("/api/users/" + userId + "/dashboard"),
      API.get("/api/leaderboard?limit=5").catch(() => [])
    ]);
    return { d, lb };
  }, [userId]);

  return (
    <DataView query={query}>
      {({ d, lb }, reload) => {
        const s = d.study;
        const hour = new Date().getHours();
        const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        const goalPct = Number(s.todayGoalProgressPercentage) || 0;

        const top3 = (lb || []).slice(0, 3).map((e, i) => (
          <div
            key={e.userId}
            className={"lb-row " + medalFor(i) + (e.userId === userId ? " me" : "")}
          >
            <div className="rank">{e.rank}</div>
            <div className="lb-name">
              <b>{e.username}</b>
              <small>{e.currentStreak} day streak</small>
            </div>
            <div className="lb-xp">{e.xp} XP</div>
            <div className="small muted">rank #{e.rank}</div>
          </div>
        ));

        const progressCards = (d.assets || []).slice(0, 6).map((p) => {
          const v = Number(p.progressPercentage) || 0;
          return (
            <div className="card" style={{ padding: 15 }} key={p.assetId}>
              <div className="row spread center" style={{ marginBottom: 9 }}>
                <b style={{ fontSize: 13.5 }}>{p.symbol}</b>
                <span className={"pill " + (v >= 100 ? "green" : "grey")}>{Math.round(v)}%</span>
              </div>
              <div className="small muted" style={{ marginBottom: 8 }}>
                {p.assetName}
              </div>
              <Bar value={v} green={v >= 100} />
              <div className="asset-meta">
                <span>
                  {p.completedMinutes} / {p.targetMinutes} min
                </span>
                <span>mastery</span>
              </div>
            </div>
          );
        });

        const achievements = (d.achievements || []).map((a) => (
          <div className="ach" key={a.code}>
            <span className="ico">🏆</span>
            <b>{a.name}</b>
            <small>{a.description}</small>
          </div>
        ));

        const locked = [
          { name: "Subject Master", description: "Reach 100% progress on any asset." },
          { name: "Goal Crusher", description: "Complete the daily goal on 7 different days." }
        ]
          .filter((l) => !(d.achievements || []).some((u) => u.name === l.name))
          .map((l) => (
            <div className="ach locked" key={l.name}>
              <span className="ico">🔒</span>
              <b>{l.name}</b>
              <small>{l.description}</small>
            </div>
          ));

        return (
          <>
            <div className="hero">
              <div>
                <h2>
                  {greet}, {d.user.username}
                </h2>
                <p>
                  {goalPct >= 100
                    ? "Daily goal crushed. Legendary. 🏅"
                    : "Keep the streak alive — " +
                      s.todayStudyMinutes +
                      " of " +
                      s.dailyGoalMinutes +
                      " minutes done today."}
                </p>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <b>{s.xp}</b>
                  <span>XP</span>
                </div>
                <div className="hero-stat">
                  <b>🔥 {s.currentStreak}</b>
                  <span>day streak</span>
                </div>
                <div className="hero-stat">
                  <b>
                    {s.todayStudyMinutes}'/{s.dailyGoalMinutes}
                  </b>
                  <span>min today</span>
                </div>
              </div>
            </div>

            <FocusBar onStopped={reload} />

            <div className="grid g3" style={{ marginTop: 16 }}>
              <div className="card column goal-card">
                <h3>Daily goal</h3>
                <div className="ring-wrap">
                  <div>
                    <Ring pctValue={goalPct} size={116} stroke={11} color={goalPct >= 100 ? "#0d9f6e" : "#4f46e5"} />
                  </div>
                  <div className="ring-label">
                    <b>{Math.round(goalPct)}%</b>
                    <span>
                      {s.todayStudyMinutes} of {s.dailyGoalMinutes} min
                    </span>
                    <div className="small muted" style={{ marginTop: 6 }}>
                      longest streak {s.longestStreak}d
                    </div>
                  </div>
                </div>
              </div>

              <div className="card column">
                <h3>
                  Study progress{" "}
                  <Link className="link pill" to="/study">
                    open →
                  </Link>
                </h3>
                <div className="grid fill-y spread-y" style={{ gap: 11 }}>
                  {(d.assets || []).slice(0, 4).map((p) => {
                    const v = Number(p.progressPercentage) || 0;
                    return (
                      <div key={p.assetId}>
                        <div className="row spread small" style={{ marginBottom: 4 }}>
                          <b>{p.symbol}</b>
                          <span className="muted">{Math.round(v)}%</span>
                        </div>
                        <Bar value={v} green={v >= 100} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <h3>
                  Leaderboard{" "}
                  <Link className="link pill" to="/leaderboard">
                    all →
                  </Link>
                </h3>
                {top3}
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3>
                Achievements{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {(d.achievements || []).length} unlocked
                </span>
              </h3>
              <div className="ach-grid">
                {achievements}
                {locked}
              </div>
            </div>
          </>
        );
      }}
    </DataView>
  );
}
