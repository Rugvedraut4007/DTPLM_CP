import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { useApp } from "../state/AppContext.jsx";
import { DataView, Empty } from "../components/UI.jsx";

export default function Leaderboard() {
  const { userId } = useApp();
  const query = useAsync(() => API.get("/api/leaderboard?limit=20"), [userId]);

  return (
    <DataView query={query}>
      {(entries) => {
        const rows = (entries || []).map((e, i) => {
          const medal = e.rank === 1 ? "gold" : e.rank === 2 ? "silver" : e.rank === 3 ? "bronze" : "";
          return (
            <div className={"lb-row " + medal + (e.userId === userId ? " me" : "")} key={e.userId}>
              <div className="rank">{e.rank}</div>
              <div className="lb-name">
                <b>
                  {e.username}
                  {e.userId === userId ? " (you)" : ""}
                </b>
                <small>🔥 {e.currentStreak} day streak</small>
              </div>
              <div className="lb-xp">{e.xp} XP</div>
              <div>
                <span className={"pill " + (i === 0 ? "amber" : "grey")}>
                  {i === 0 ? "champion" : i < 3 ? "elite" : "student"}
                </span>
              </div>
            </div>
          );
        });

        return (
          <div className="card">
            <h3>
              Top students{" "}
              <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                by XP
              </span>
            </h3>
            {rows.length ? rows : <Empty icon="🏆">No students yet.</Empty>}
          </div>
        );
      }}
    </DataView>
  );
}
