import { useState } from "react";

import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { timeAgo } from "../lib/format.js";
import { useApp } from "../state/AppContext.jsx";
import { DataView, Empty } from "../components/UI.jsx";

const QUICK = [60, 75, 88, 97];

export default function Assessments() {
  const { userId, toast } = useApp();
  const [assetId, setAssetId] = useState(null);
  const [score, setScore] = useState(85);
  const [busy, setBusy] = useState(false);

  const query = useAsync(async () => {
    const [progress, list] = await Promise.all([
      API.get("/api/users/" + userId + "/study-progress"),
      API.get("/api/users/" + userId + "/assessments")
    ]);
    return { progress: progress || [], list: list || [] };
  }, [userId]);

  async function submit(currentAssetId, reload) {
    setBusy(true);
    const value = Number(score);
    try {
      const a = await API.post("/api/assessments", {
        userId,
        assetId: Number(currentAssetId),
        scorePercentage: value
      });
      toast("Score " + value + "% recorded → " + Number(a.maxSellPercentage) + "% sell rights", "ok");
      reload();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  return (
    <DataView query={query}>
      {({ progress, list }, reload) => {
        const byId = {};
        progress.forEach((p) => (byId[p.assetId] = p));
        const currentAssetId = assetId != null ? assetId : progress[0] && progress[0].assetId;

        return (
          <div className="split lead">
            <div className="card column">
              <h3>Submit a score</h3>
              <div className="field">
                <label>Subject</label>
                <select value={currentAssetId ?? ""} onChange={(e) => setAssetId(Number(e.target.value))}>
                  {progress.map((p) => (
                    <option key={p.assetId} value={p.assetId}>
                      {p.symbol} — {p.assetName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Score %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Quick set</label>
                <div className="quick">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => setScore(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="push">
                <button
                  className="btn"
                  style={{ width: "100%" }}
                  onClick={() => submit(currentAssetId, reload)}
                  disabled={busy || currentAssetId == null}
                >
                  ✓ Record assessment
                </button>
                <div className="small muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
                  Selling shares requires assessment rights:
                  <br />
                  &lt;50% → 0% &nbsp;·&nbsp; 50% → 25% &nbsp;·&nbsp; 70% → 50%
                  <br />
                  85% → 75% &nbsp;·&nbsp; 95% → 100%
                </div>
              </div>
            </div>

            <div className="card">
              <h3>
                Assessment history{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {list.length} records
                </span>
              </h3>
              {list.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th className="num">Score</th>
                      <th className="num">Sell rights</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((a) => {
                      const p = byId[a.assetId] || {};
                      const max = Number(a.maxSellPercentage) || 0;
                      return (
                        <tr key={a.assessmentId}>
                          <td>
                            <b>{p.symbol || a.assetId}</b>
                            <div className="small muted">{p.assetName || ""}</div>
                          </td>
                          <td className="num mono">{Number(a.scorePercentage)}%</td>
                          <td className="num">
                            <span
                              className={
                                "pill " +
                                (max >= 75 ? "green" : max >= 50 ? "" : max > 0 ? "amber" : "red")
                              }
                            >
                              {max}% sell rights
                            </span>
                          </td>
                          <td className="small muted">{timeAgo(a.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <Empty icon="📝">No assessments yet — record your first score.</Empty>
              )}
            </div>
          </div>
        );
      }}
    </DataView>
  );
}
