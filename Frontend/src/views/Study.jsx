import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { sessionAsset } from "../lib/domain.js";
import { useApp } from "../state/AppContext.jsx";
import { Bar, DataView } from "../components/UI.jsx";
import { Ring } from "../components/Charts.jsx";
import { FocusBar, RequiredTimer, StopSessionButton } from "../components/Session.jsx";

const GOALS = [30, 45, 60, 90];

/* "I want to buy this subject" — the required study session before the purchase */
function PurchaseRequest({ asset, purchase, activeSession, busy, onStart, onChanged }) {
  const runningHere = activeSession && Number(sessionAsset(activeSession).id) === Number(asset.id);
  const runningElsewhere = activeSession && !runningHere;
  const pct = purchase.requiredStudyMinutes
    ? Math.min(100, (purchase.studiedMinutes * 100) / purchase.requiredStudyMinutes)
    : 100;

  return (
    <div className="card column" style={{ marginTop: 16 }}>
      <h3>
        Purchase request{" "}
        <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
          learning unlocks buying
        </span>
      </h3>
      <div className="row wrap center" style={{ gap: 22 }}>
        <div className="grow">
          <div className="small muted" style={{ marginBottom: 10 }}>
            To buy <b>{asset.symbol}</b> — {asset.name} — you must complete{" "}
            <b>{purchase.requiredStudyMinutes} minutes</b> of study on this subject. The timer below is
            validated by the backend before the purchase is allowed.
          </div>
          <Bar value={pct} green={purchase.unlocked} />
          <div className="row spread small muted" style={{ marginTop: 7 }}>
            <span>
              {purchase.studiedMinutes} / {purchase.requiredStudyMinutes} min studied
            </span>
            <span>
              {purchase.unlocked ? "requirement met" : purchase.remainingMinutes + " min to go"}
            </span>
          </div>
          {runningHere ? (
            <RequiredTimer
              startedAt={activeSession.startedAt}
              requiredMinutes={purchase.remainingMinutes}
              unlocked={purchase.unlocked}
            />
          ) : null}
          {runningElsewhere ? (
            <div className="note warn">
              a session for {sessionAsset(activeSession).symbol} is running — stop it to start this one
            </div>
          ) : null}
        </div>
        <div style={{ width: 250 }}>
          {purchase.unlocked ? (
            <>
              <div className="note ok">✓ purchase unlocked — the terminal will accept your order</div>
              <Link className="btn" to={"/trade?asset=" + asset.id} style={{ width: "100%", marginTop: 12 }}>
                Buy {asset.symbol} in terminal →
              </Link>
            </>
          ) : runningHere ? (
            <>
              <div className="small muted" style={{ marginBottom: 10 }}>
                Requirement reached? Stop the session so the backend can validate it.
              </div>
              <StopSessionButton label="■&nbsp; Finish required session" onStopped={onChanged} />
            </>
          ) : (
            <>
              <div className="small muted" style={{ marginBottom: 10 }}>
                A required study timer starts with the session.
              </div>
              <button
                className="btn"
                style={{ width: "100%" }}
                disabled={busy || !!activeSession}
                onClick={() => onStart(asset.id)}
              >
                ▶ Start required session
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Study() {
  const { userId, activeSession, setActiveSession, reloadUser, reloadActiveSession, toast } = useApp();
  const [params] = useSearchParams();
  const requestedAssetId = Number(params.get("asset")) || null;
  const buyIntent = params.get("intent") === "buy" && requestedAssetId !== null;
  const [pickedAssetId, setPickedAssetId] = useState(null);
  const [busy, setBusy] = useState(false);

  const selectedAssetId = pickedAssetId !== null ? pickedAssetId : requestedAssetId;

  const query = useAsync(async () => {
    const [progress, today, assessments, eligibility] = await Promise.all([
      API.get("/api/users/" + userId + "/study-progress"),
      API.get("/api/users/" + userId + "/study-progress/today"),
      API.get("/api/users/" + userId + "/assessments").catch(() => []),
      API.get("/api/users/" + userId + "/purchase-eligibility").catch(() => [])
    ]);
    return {
      progress: progress || [],
      today,
      assessments: assessments || [],
      eligibility: eligibility || []
    };
  }, [userId]);

  async function startSession(assetId, reload) {
    if (!assetId) {
      toast("Pick a subject card first", "warn");
      return;
    }
    setBusy(true);
    try {
      const s = await API.post("/api/study-sessions/start", { userId, assetId: Number(assetId) });
      setActiveSession(s);
      await reloadActiveSession();
      toast("Focus session started — go deep!", "ok");
      if (reload) reload();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  async function setGoal(minutes, reload) {
    try {
      await API.patch("/api/users/" + userId + "/daily-goal", { dailyGoalMinutes: Number(minutes) });
      toast("Daily goal set to " + minutes + " minutes", "ok");
      await reloadUser();
      reload();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <DataView query={query}>
      {({ progress, today, assessments, eligibility }, reload) => {
        const goalPct = today.dailyGoalMinutes
          ? Math.round((today.completedMinutes * 100) / today.dailyGoalMinutes)
          : 0;
        const assessed = new Set((assessments || []).map((a) => a.assetId));
        const selected = progress.find((p) => p.assetId === selectedAssetId);
        const purchaseBy = {};
        eligibility.forEach((e) => (purchaseBy[e.assetId] = e));
        const requested = purchaseBy[requestedAssetId];
        const requestedAsset = requested
          ? { id: requested.assetId, symbol: requested.symbol, name: requested.name }
          : null;

        return (
          <>
            <div className="split">
              <div className="card column goal-card">
                <h3>
                  Today{" "}
                  <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                    daily focus goal
                  </span>
                </h3>
                <div className="row center fill-y" style={{ gap: 26 }}>
                  <div className="ring-wrap">
                    <div>
                      <Ring
                        pctValue={goalPct}
                        size={104}
                        stroke={10}
                        color={today.goalCompleted ? "#0d9f6e" : "#4f46e5"}
                      />
                    </div>
                    <div className="ring-label">
                      <b>{today.completedMinutes} min</b>
                      <span>of {today.dailyGoalMinutes} minute goal</span>
                      <div className="small muted" style={{ marginTop: 6 }}>
                        {today.goalCompleted ? "✓ goal complete" : today.remainingMinutes + " min to go"}
                      </div>
                    </div>
                  </div>
                  <div className="grow">
                    <label>Set today's goal</label>
                    <div className="goal-chips">
                      {GOALS.map((g) => (
                        <button key={g} onClick={() => setGoal(g, reload)}>
                          {g} min
                        </button>
                      ))}
                    </div>
                    <div className="small muted" style={{ marginTop: 10 }}>
                      Your goal sets the daily bar and feeds the streak.
                    </div>
                  </div>
                </div>
              </div>

              <div className="card column">
                <h3>Streak</h3>
                <div style={{ fontSize: 44, lineHeight: 1 }}>🔥</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
                  {today.currentStreak} days
                </div>
                <div className="small muted">personal best: {today.longestStreak} days</div>
                <div className="note ok push">Study every day to keep it burning.</div>
              </div>
            </div>

            {buyIntent && requestedAsset ? (
              <PurchaseRequest
                asset={requestedAsset}
                purchase={requested}
                activeSession={activeSession}
                busy={busy}
                onStart={(assetId) => startSession(assetId, reload)}
                onChanged={reload}
              />
            ) : null}

            <FocusBar variant="study" onStopped={reload} />

            <div className="card" style={{ marginTop: 16 }}>
              <h3>
                Subjects{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  click a card to select, then start a session
                </span>
              </h3>
              <div className="asset-grid">
                {progress.map((p) => {
                  const v = Number(p.progressPercentage) || 0;
                  const purchase = purchaseBy[p.assetId];
                  return (
                    <div
                      key={p.assetId}
                      className={"asset-card" + (selectedAssetId === p.assetId ? " selected" : "")}
                      onClick={() => setPickedAssetId(p.assetId)}
                    >
                      <div className="asset-top">
                        <span className="sym">{p.symbol}</span>
                        {v >= 100 ? (
                          <span className="pill green">mastered</span>
                        ) : assessed.has(p.assetId) ? (
                          <span className="pill">tested</span>
                        ) : (
                          <span className="pill grey">untested</span>
                        )}
                      </div>
                      <div className="name">{p.assetName}</div>
                      <Bar value={v} green={v >= 100} />
                      <div className="asset-meta">
                        <span>
                          {p.completedMinutes} / {p.targetMinutes} min
                        </span>
                        <b style={{ color: "var(--primary)" }}>{Math.round(v)}%</b>
                      </div>
                      {purchase ? (
                        <div className="asset-meta" style={{ marginTop: 4 }}>
                          {purchase.unlocked ? (
                            <span style={{ color: "var(--success)" }}>✓ buying unlocked</span>
                          ) : (
                            <span>🔒 study {purchase.remainingMinutes}m to buy</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="row wrap center" style={{ marginTop: 16 }}>
                <button
                  className="btn"
                  onClick={() => startSession(selectedAssetId, reload)}
                  disabled={!!activeSession || busy}
                >
                  ▶ Start session{selected ? " on " + selected.symbol : ""}
                </button>
                <Link className="btn ghost" to="/assessments">
                  ✓ Take an assessment
                </Link>
                <span className="small muted">XP earned: 2 per focused minute</span>
              </div>
            </div>
          </>
        );
      }}
    </DataView>
  );
}
