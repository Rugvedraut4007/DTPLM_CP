import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { useApp } from "../state/AppContext.jsx";
import { Bar, ChartBars, DataView, Kpi, VaultHead } from "../components/UI.jsx";
import { Donut } from "../components/Charts.jsx";

export default function Stats() {
  const { userId } = useApp();

  const query = useAsync(async () => {
    const [stats, sessions] = await Promise.all([
      API.get("/api/users/" + userId + "/stats"),
      API.get("/api/users/" + userId + "/study-sessions")
    ]);
    const progress = await API.get("/api/users/" + userId + "/study-progress");
    return { stats, sessions: sessions || [], progress: progress || [] };
  }, [userId]);

  return (
    <DataView query={query}>
      {({ stats, sessions, progress }) => {
        // last 14 days of completed minutes
        const days = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          days.push({
            key: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
            min: 0
          });
        }
        const byKey = {};
        days.forEach((d) => (byKey[d.key] = d));
        sessions
          .filter((s) => s.status === "COMPLETED" && s.endedAt)
          .forEach((s) => {
            const k = s.endedAt.slice(0, 10);
            if (byKey[k]) byKey[k].min += Math.floor((s.durationSeconds || 0) / 60);
          });
        const maxMin = Math.max(30, ...days.map((d) => d.min));
        const bars = days.map((d) => ({
          pct: (d.min / maxMin) * 100,
          title: d.min + " min",
          label: d.label
        }));

        return (
          <>
            <VaultHead
              title="▦ Stats // performance matrix"
              sub="study output & trading behaviour, correlated"
            />

            <div className="grid g4" style={{ gap: 12 }}>
              <Kpi
                label="Total study"
                value={stats.totalStudyMinutes}
                sub="minutes logged"
              />
              <Kpi
                tone="cyan"
                label="Sessions"
                value={stats.totalStudySessions}
                sub="completed focus blocks"
              />
              <Kpi
                tone="violet"
                label="XP"
                value={stats.totalXp}
                sub={"streak " + stats.currentStreak + "d · best " + stats.longestStreak + "d"}
              />
              <Kpi
                tone={stats.masteredAssets ? "" : "red"}
                label="Mastery"
                value={stats.masteredAssets}
                sub={"of " + stats.assetsStudied + " subjects studied"}
              />
            </div>

            <div className="split">
              <div className="card column">
                <h3>Study minutes — last 14 days</h3>
                <ChartBars items={bars} fillY />
              </div>

              <div className="card column">
                <h3>Trade split</h3>
                <div className="donut fill-y">
                  <Donut
                    segments={[
                      { value: stats.buyTrades || 0, color: "#00e58a" },
                      { value: stats.sellTrades || 0, color: "#ff4d6d" }
                    ]}
                    size={150}
                  />
                  <div className="donut-center">
                    <b>{stats.totalTrades}</b>
                    <small>TRADES</small>
                  </div>
                </div>
                <div className="legend pin">
                  <div className="lg">
                    <span className="dot" style={{ background: "#00e58a" }} />
                    buys<span className="val">{stats.buyTrades}</span>
                  </div>
                  <div className="lg">
                    <span className="dot" style={{ background: "#ff4d6d" }} />
                    sells<span className="val">{stats.sellTrades}</span>
                  </div>
                  <div className="lg">
                    <span className="dot" style={{ background: "#2b3d50" }} />
                    goals hit<span className="val">{stats.goalsCompleted}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3>
                Subject mastery{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  progress on your most studied subjects
                </span>
              </h3>
              <div className="bar-list">
                {progress.slice(0, 8).map((p) => {
                  const v = Number(p.progressPercentage) || 0;
                  return (
                    <div key={p.assetId}>
                      <div className="row spread small" style={{ marginBottom: 5 }}>
                        <b>{p.symbol}</b>
                        <span className="muted">
                          {p.completedMinutes}/{p.targetMinutes} min
                        </span>
                      </div>
                      <Bar value={v} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      }}
    </DataView>
  );
}
