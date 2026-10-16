import { useState } from "react";

import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { useApp } from "../state/AppContext.jsx";
import { Bar, DataView } from "../components/UI.jsx";

export default function Challenges() {
  const { userId, reloadUser, toast } = useApp();
  const [busyId, setBusyId] = useState(null);

  const query = useAsync(async () => {
    const [challenges, mine, catalog, unlocked] = await Promise.all([
      API.get("/api/challenges"),
      API.get("/api/users/" + userId + "/challenges"),
      API.get("/api/achievements"),
      API.get("/api/users/" + userId + "/achievements")
    ]);
    return { challenges: challenges || [], mine: mine || [], catalog: catalog || [], unlocked: unlocked || [] };
  }, [userId]);

  async function claim(challengeId, reload) {
    setBusyId(challengeId);
    try {
      await API.post("/api/users/" + userId + "/challenges/" + challengeId + "/claim");
      toast("Reward claimed — XP added!", "ok");
      await reloadUser();
      reload();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusyId(null);
  }

  return (
    <DataView query={query}>
      {({ challenges, mine, catalog, unlocked }, reload) => {
        const mineBy = {};
        mine.forEach((c) => {
          mineBy[c.challengeId || (c.challenge && c.challenge.id)] = c;
        });
        const unlockedCodes = new Set(unlocked.map((u) => u.code));

        return (
          <>
            <div className="grid g3">
              {challenges.map((c) => {
                const uc = mineBy[c.id] || { progress: 0, completed: false };
                const prog = uc.progress || 0;
                const done = uc.completed || prog >= c.targetValue;
                const claimed = uc.claimed || uc.completed;
                const v = Math.min(100, Math.round((prog / c.targetValue) * 100));
                return (
                  <div
                    className="card"
                    style={{ display: "flex", flexDirection: "column", gap: 11 }}
                    key={c.id}
                  >
                    <div className="row spread center">
                      <span className={"pill " + (done ? "green" : "grey")}>
                        {done ? "complete" : "in progress"}
                      </span>
                      <b className="mono" style={{ color: "var(--primary)" }}>
                        +{c.xpReward} XP
                      </b>
                    </div>
                    <div>
                      <b>{c.name}</b>
                      <div className="small muted">{c.description}</div>
                    </div>
                    <Bar value={v} green={done} />
                    <div className="row spread small muted">
                      <span>
                        {prog} / {c.targetValue}
                      </span>
                      <span>{v}%</span>
                    </div>
                    <button
                      className={"btn " + (claimed ? "done" : done ? "success" : "ghost") + " sm"}
                      style={{ marginTop: "auto" }}
                      disabled={!(done && !claimed) || busyId === c.id}
                      onClick={() => claim(c.id, reload)}
                    >
                      {claimed ? "✓ claimed" : done ? "Claim reward" : "keep going"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3>Achievements</h3>
              <div className="ach-grid">
                {catalog.map((a) => {
                  const on = unlockedCodes.has(a.code);
                  return (
                    <div className={"ach" + (on ? "" : " locked")} key={a.code}>
                      <span className="ico">{on ? "🏆" : "🔒"}</span>
                      <b>{a.name}</b>
                      <small>{a.description}</small>
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
