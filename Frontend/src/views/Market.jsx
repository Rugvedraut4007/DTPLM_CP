import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API from "../lib/api.js";
import Demo from "../lib/demo.js";
import useAsync from "../lib/useAsync.js";
import { changePct } from "../lib/domain.js";
import { cls, num, signed } from "../lib/format.js";
import { useApp } from "../state/AppContext.jsx";
import { ChartBars, DataView, Kpi, OrderLine, VaultHead } from "../components/UI.jsx";
import { Spark } from "../components/Charts.jsx";

function DetailPanel({ asset, detail }) {
  const boxRef = useRef(null);
  const hist = (detail.data || []).slice().sort((a, b) => String(a.activityDate).localeCompare(String(b.activityDate)));
  const max = Math.max(1, ...hist.map((d) => d.studyMinutes || 0));
  const bars = hist.map((d) => ({
    pct: ((d.studyMinutes || 0) / max) * 100,
    title: d.studyMinutes + " min",
    label: String(d.activityDate).slice(8)
  }));
  const buy = hist.reduce((s, d) => s + Number(d.buyVolume || 0), 0);
  const sell = hist.reduce((s, d) => s + Number(d.sellVolume || 0), 0);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <div
      ref={boxRef}
      style={{ borderTop: "1px dashed var(--d-border)", marginTop: 14, paddingTop: 16 }}
    >
      <div className="row wrap" style={{ gap: 14, alignItems: "flex-start" }}>
        <div className="grow">
          <div className="k-label" style={{ marginBottom: 10 }}>
            ◆ {asset ? asset.name : ""} — 30d study activity
          </div>
          <ChartBars items={bars} height={120} />
        </div>
        <div style={{ width: 250 }}>
          <OrderLine label="30d buy volume">
            <span style={{ color: "var(--neon)" }}>{num(buy)} BTC</span>
          </OrderLine>
          <OrderLine label="30d sell volume">
            <span style={{ color: "var(--red)" }}>{num(sell)} BTC</span>
          </OrderLine>
          <OrderLine label="opening → mark">
            {num(asset && asset.openingPrice)} → {num(asset && asset.currentPrice)}
          </OrderLine>
          <OrderLine label="importance">{asset ? asset.globalImportance : "—"}/10</OrderLine>
          <Link className="btn ghost sm" style={{ width: "100%", marginTop: 12 }} to="/trade">
            open in terminal →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Market() {
  const { toast, userId } = useApp();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null); // { assetId, data, error, loading }

  const query = useAsync(async () => {
    const [assets, today, eligibility] = await Promise.all([
      API.get("/api/assets"),
      API.get("/api/market-activity/today"),
      API.get("/api/users/" + userId + "/purchase-eligibility").catch(() => [])
    ]);
    return { assets: assets || [], today: today || [], eligibility: eligibility || [] };
  }, [userId]);

  /* learning unlocks buying: a locked subject is routed through Study first */
  function buy(asset, purchase) {
    if (purchase.unlocked) {
      navigate("/trade?asset=" + asset.id);
      return;
    }
    toast(
      "Study " + purchase.remainingMinutes + " min of " + asset.symbol + " to unlock buying",
      "warn"
    );
    navigate("/study?asset=" + asset.id + "&intent=buy");
  }

  async function openDetail(assetId) {
    setSelectedId(assetId);
    setDetail({ assetId, data: [], error: null, loading: true });
    try {
      const data = await API.get("/api/assets/" + assetId + "/market-activity");
      setDetail({ assetId, data: data || [], error: null, loading: false });
    } catch (e) {
      setDetail({ assetId, data: [], error: e.message, loading: false });
    }
  }

  async function runCycle(reload) {
    setRunning(true);
    try {
      const res = await API.post("/api/market/run");
      const n = Array.isArray(res) ? res.length : (res && res.updated) || 0;
      toast("Market cycle complete — " + n + " instruments repriced", "ok");
      await reload();
      if (selectedId) openDetail(selectedId);
    } catch (e) {
      toast(e.message, "err");
    }
    setRunning(false);
  }

  return (
    <DataView query={query}>
      {({ assets, today, eligibility }, reload) => {
        const actBy = {};
        const purchaseBy = {};
        (eligibility || []).forEach((e) => (purchaseBy[e.assetId] = e));
        today.forEach((a) => {
          const id = a.assetId || (a.asset && a.asset.id);
          actBy[id] = a;
        });

        const advancers = assets.filter((a) => changePct(a) > 0).length;
        const decliners = assets.filter((a) => changePct(a) < 0).length;
        const totalBuy = today.reduce((s, a) => s + Number(a.buyVolume || 0), 0);
        const mostActive = today
          .slice()
          .sort((a, b) => Number(b.studyMinutes || 0) - Number(a.studyMinutes || 0))[0];

        const ticker = assets.map((a) => {
          const c = changePct(a);
          return (
            <span key={a.id}>
              <b>{a.symbol}</b> {num(a.currentPrice)}{" "}
              <i style={{ fontStyle: "normal", color: c >= 0 ? "var(--neon)" : "var(--red)" }}>
                {signed(c)}%
              </i>
            </span>
          );
        });

        return (
          <>
            <VaultHead
              title="◆ Market // subject exchange"
              sub="prices move with study activity, goals & order flow · max swing ±5% per run"
              right={
                <button className="btn ghost sm" onClick={() => runCycle(reload)} disabled={running}>
                  {running ? "running…" : "▶ Run market cycle"}
                </button>
              }
            />

            <div className="row wrap" style={{ gap: 12, marginBottom: 16 }}>
              <Kpi
                tone="grow"
                label="Advancers"
                value={advancers}
                sub={"of " + assets.length + " subjects"}
                valueClass="pos"
              />
              <Kpi
                label="Decliners"
                value={decliners}
                sub="losing ground"
                valueClass=""
                tone="red grow"
              />
              <Kpi tone="cyan grow" label="Buy volume today" value={num(totalBuy)} sub="BTC deployed" />
              <Kpi
                tone="violet grow"
                label="Most studied"
                value={mostActive ? mostActive.symbol || (mostActive.asset && mostActive.asset.symbol) : "—"}
                sub={((mostActive && mostActive.studyMinutes) || 0) + " min today"}
              />
            </div>

            <div className="ticker">
              {ticker}
              {ticker}
            </div>

            <div className="card">                <h3>
                Live board{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  click a row for activity · buy needs the subject studied first
                </span>
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th className="num">Price</th>
                    <th className="num">Change</th>
                    <th>30d</th>
                    <th className="num">Study min</th>
                    <th className="num">Buy vol</th>
                    <th className="num">Sell vol</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => {
                    const c = changePct(a);
                    const act = actBy[a.id] || {};
                    const hist = Demo.priceHistory(a.id, 24);
                    const color = c >= 0 ? "#00e58a" : "#ff4d6d";
                    const purchase = purchaseBy[a.id] || { unlocked: true, remainingMinutes: 0 };
                    return (
                      <tr
                        key={a.id}
                        style={{ cursor: "pointer", background: selectedId === a.id ? "rgba(56,225,255,0.06)" : undefined }}
                        onClick={(e) => {
                          if (e.target.closest("a,button")) return;
                          openDetail(a.id);
                        }}
                      >
                        <td>
                          <div className="sym-cell">
                            <span className="sq">{a.symbol.slice(0, 4)}</span>
                            <span className="nm">
                              {a.name}
                              <small>
                                {a.category} · imp {a.globalImportance}
                                {purchase.unlocked
                                  ? " · ✓ purchase unlocked"
                                  : " · 🔒 study " + purchase.remainingMinutes + "m"}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td className="num mono">
                          <b>{num(a.currentPrice)}</b>
                        </td>
                        <td className={"num mono " + cls(c)}>{signed(c)}%</td>
                        <td>
                          <Spark values={hist} w={104} h={30} color={color} fill />
                        </td>
                        <td className="num mono">{act.studyMinutes || 0}</td>
                        <td className="num mono" style={{ color: "var(--cyan)" }}>
                          {num(act.buyVolume || 0)}
                        </td>
                        <td className="num mono" style={{ color: "var(--red)" }}>
                          {num(act.sellVolume || 0)}
                        </td>
                        <td className="num">
                          <button
                            className={"pill" + (purchase.unlocked ? "" : " grey")}
                            onClick={() => buy(a, purchase)}
                            title={
                              purchase.unlocked
                                ? "buy " + a.symbol + " in the trading terminal"
                                : "study unlocks buying"
                            }
                          >
                            {purchase.unlocked ? "buy →" : "🔒 study " + purchase.remainingMinutes + "m"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {detail ? (
                detail.loading ? (
                  <div className="empty">⏳ loading activity…</div>
                ) : detail.error ? (
                  <div className="empty">{detail.error}</div>
                ) : (
                  <DetailPanel asset={Demo.assetById(detail.assetId)} detail={detail} />
                )
              ) : null}
            </div>
          </>
        );
      }}
    </DataView>
  );
}
