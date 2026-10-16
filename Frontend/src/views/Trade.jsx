import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import API from "../lib/api.js";
import Demo from "../lib/demo.js";
import useAsync from "../lib/useAsync.js";
import { changePct, rightsFor, studyRequired } from "../lib/domain.js";
import { cls, num, signed } from "../lib/format.js";
import { useApp } from "../state/AppContext.jsx";
import { DataView, Empty, OrderLine, VaultHead } from "../components/UI.jsx";

const QUICK = [0.25, 0.5, 0.75, 1];

export default function Trade() {
  const { userId, reloadUser, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [assetId, setAssetId] = useState(() => {
    const requested = Number(params.get("asset"));
    return requested > 0 ? requested : null;
  });
  const [side, setSide] = useState("BUY");
  const [qty, setQty] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useAsync(async () => {
    const [assets, portfolio, assessments, eligibility] = await Promise.all([
      API.get("/api/assets"),
      API.get("/api/users/" + userId + "/portfolio"),
      API.get("/api/users/" + userId + "/assessments").catch(() => []),
      API.get("/api/users/" + userId + "/purchase-eligibility").catch(() => [])
    ]);
    return {
      assets: assets || [],
      portfolio,
      assessments: assessments || [],
      eligibility: eligibility || []
    };
  }, [userId]);

  /* the purchase needs study first — send the student to that subject's study session */
  function sendToStudy(asset, remainingMinutes) {
    toast(
      "Study " + remainingMinutes + " more min of " + asset.symbol + " to unlock buying",
      "warn"
    );
    navigate("/study?asset=" + asset.id + "&intent=buy");
  }

  async function submit(currentAssetId, currentSide, reload) {
    const q = Number(qty);
    if (!(q > 0)) {
      setErr("enter a quantity greater than zero");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await API.post("/api/trades/" + (currentSide === "BUY" ? "buy" : "sell"), {
        userId,
        assetId: Number(currentAssetId),
        quantity: q
      });
      toast(
        (currentSide === "BUY" ? "Bought " : "Sold ") +
          num(q) +
          " " +
          Demo.assetById(currentAssetId).symbol +
          " @ " +
          num(res.price) +
          " · balance " +
          num(res.resultingBalance) +
          " BTC",
        "ok"
      );
      setQty("");
      await reloadUser();
      reload();
    } catch (e) {
      // the backend refuses the purchase when the subject is not studied yet
      const missing = studyRequired(e);
      if (missing) {
        sendToStudy({ id: missing.assetId, symbol: missing.symbol }, missing.remainingMinutes);
      } else {
        setErr(e.message);
      }
    }
    setBusy(false);
  }

  return (
    <DataView query={query}>
      {({ assets, portfolio, assessments, eligibility }, reload) => {
        if (!assets.length) return <Empty icon="⚠">No instruments listed.</Empty>;

        const currentAssetId = assetId != null ? assetId : assets[0].id;
        const asset = assets.find((a) => a.id === currentAssetId) || assets[0];
        const posBy = {};
        (portfolio.positions || []).forEach((p) => (posBy[p.assetId] = p));
        const pos = posBy[asset.id];
        const rights = rightsFor(assessments, asset.id);
        const bal = Number(portfolio.simulatedBtcBalance);
        const price = Number(asset.currentPrice);
        const eligibilityBy = {};
        (eligibility || []).forEach((e) => (eligibilityBy[e.assetId] = e));
        const purchase = eligibilityBy[asset.id] || { unlocked: true, remainingMinutes: 0 };

        const q = Number(qty) || 0;
        const value = q * price;
        const after = side === "BUY" ? bal - value : bal + value;

        function quickMax() {
          if (side === "BUY") return bal / price;
          const held = pos ? Number(pos.quantity) : 0;
          return Math.min(held, (held * rights) / 100);
        }

        return (
          <>
            <VaultHead
              title="⇅ Trading terminal"
              sub="study unlocks buying · assessments unlock selling · settlement in simulated BTC"
              right={
                <div className="mono small" style={{ color: "var(--d-muted)" }}>
                  balance <b style={{ color: "var(--neon)" }}>{num(bal)} BTC</b>
                </div>
              }
            />

            <div className="split">
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px 0" }}>
                  <h3 style={{ marginBottom: 10 }}>Instruments</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th className="num">Price</th>
                      <th className="num">24h</th>
                      <th className="num">Held</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => {
                      const c = changePct(a);
                      const held = posBy[a.id];
                      return (
                        <tr
                          key={a.id}
                          style={{
                            cursor: "pointer",
                            background: a.id === currentAssetId ? "rgba(56,225,255,0.06)" : undefined
                          }}
                          onClick={() => {
                            setAssetId(a.id);
                            setErr("");
                          }}
                        >
                          <td>
                            <div className="sym-cell">
                              <span className="sq">{a.symbol.slice(0, 4)}</span>
                              <span className="nm">
                                {a.name}
                                <small>
                                  {eligibilityBy[a.id] && !eligibilityBy[a.id].unlocked
                                    ? "🔒 study " + eligibilityBy[a.id].remainingMinutes + "m to unlock"
                                    : "✓ purchase unlocked"}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td className="num mono">{num(a.currentPrice)}</td>
                          <td className={"num mono " + cls(c)}>{signed(c)}%</td>
                          <td className="num mono">{held ? num(held.quantity) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="stack">
                <div className="ticket">
                  <div className="ticket-tabs">
                    <button
                      className={"buy" + (side === "BUY" ? " on" : "")}
                      onClick={() => {
                        setSide("BUY");
                        setErr("");
                      }}
                    >
                      Buy
                    </button>
                    <button
                      className={"sell" + (side === "SELL" ? " on" : "")}
                      onClick={() => {
                        setSide("SELL");
                        setErr("");
                      }}
                    >
                      Sell
                    </button>
                  </div>
                  <div className="ticket-body">
                    <div className="field">
                      <label>Instrument</label>
                      <select
                        value={asset.id}
                        onChange={(e) => {
                          setAssetId(Number(e.target.value));
                          setErr("");
                        }}
                      >
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.symbol} — {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.0"
                        value={qty}
                        onChange={(e) => {
                          setQty(e.target.value);
                          setErr("");
                        }}
                      />
                    </div>
                    <div className="quick">
                      {QUICK.map((f) => (
                        <button
                          key={f}
                          onClick={() => setQty((Math.max(0, quickMax()) * f).toFixed(4))}
                        >
                          {f === 1 ? "max" : Math.round(f * 100) + "%"}
                        </button>
                      ))}
                    </div>
                    <div className="push">
                      <OrderLine label="mark price">{num(price)} BTC</OrderLine>
                      <OrderLine label="position">
                        {pos ? num(pos.quantity) + " @ " + num(pos.averageBuyPrice) : "none"}
                      </OrderLine>
                      <OrderLine label="order value" total>
                        {num(value)} BTC
                      </OrderLine>
                      <OrderLine label="balance after">
                        <span className={after < 0 ? "neg" : ""}>{num(after)} BTC</span>
                      </OrderLine>
                    </div>
                    {side === "SELL" ? (
                      rights > 0 ? (
                        <div className="note ok">
                          assessment rights: {rights}% of position may be sold
                        </div>
                      ) : (
                        <div className="note err">
                          no sell rights — record an assessment first (Assessments →)
                        </div>
                      )
                    ) : purchase.unlocked ? (
                      <div className="note ok">
                        purchase unlocked — {purchase.studiedMinutes} of {purchase.requiredStudyMinutes} study
                        minutes done on {asset.symbol}
                      </div>
                    ) : (
                      <div className="note err">
                        study unlocks buying — {purchase.remainingMinutes} more minutes of {asset.symbol} to go
                        ({purchase.studiedMinutes}/{purchase.requiredStudyMinutes} done)
                      </div>
                    )}
                    {side === "BUY" && !purchase.unlocked ? (
                      <button
                        className="btn"
                        style={{ width: "100%", marginTop: 14 }}
                        onClick={() => sendToStudy(asset, purchase.remainingMinutes)}
                      >
                        ▶ Study {purchase.remainingMinutes} min to unlock
                      </button>
                    ) : (
                      <button
                        className="btn"
                        style={{ width: "100%", marginTop: 14 }}
                        disabled={(side === "SELL" && rights <= 0) || busy}
                        onClick={() => submit(asset.id, side, reload)}
                      >
                        {side === "BUY" ? "Buy " : "Sell "}
                        {asset.symbol}
                      </button>
                    )}
                    <div className="unlock-err">{err}</div>
                  </div>
                </div>

                <div className="card">
                  <h3>Recent fills</h3>
                  {Demo.state.trades.length ? (
                    Demo.state.trades.slice(0, 6).map((t) => (
                      <div className="order-line" key={t.tradeId}>
                        <span>
                          <b style={{ color: t.side === "BUY" ? "var(--neon)" : "var(--red)" }}>
                            {t.side}
                          </b>{" "}
                          {t.symbol} ×{num(t.quantity)}
                        </span>
                        <b>{num(t.totalValue)}</b>
                      </div>
                    ))
                  ) : (
                    <Empty>No trades yet.</Empty>
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3>Your positions</h3>
              {(portfolio.positions || []).length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th className="num">Qty</th>
                      <th className="num">Avg</th>
                      <th className="num">Mark</th>
                      <th className="num">uPnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((p) => (
                      <tr key={p.assetId}>
                        <td>
                          <b>{p.symbol}</b>
                        </td>
                        <td className="num mono">{num(p.quantity)}</td>
                        <td className="num mono">{num(p.averageBuyPrice)}</td>
                        <td className="num mono">{num(p.currentPrice)}</td>
                        <td className={"num mono " + cls(p.unrealizedPnl)}>{signed(p.unrealizedPnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty icon="💼">No open positions.</Empty>
              )}
            </div>
          </>
        );
      }}
    </DataView>
  );
}
