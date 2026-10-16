import { Link } from "react-router-dom";

import API from "../lib/api.js";
import Demo from "../lib/demo.js";
import useAsync from "../lib/useAsync.js";
import { changePct } from "../lib/domain.js";
import { cls, num, signed } from "../lib/format.js";
import { useApp } from "../state/AppContext.jsx";
import { DataView, Empty, Kpi, VaultHead } from "../components/UI.jsx";
import { Donut } from "../components/Charts.jsx";

const PALETTE = ["#00e58a", "#38e1ff", "#8b5cf6", "#fbbf24", "#ff4d6d", "#64a8ff"];

export default function Portfolio() {
  const { userId } = useApp();
  const query = useAsync(() => API.get("/api/users/" + userId + "/portfolio"), [userId]);

  return (
    <DataView query={query}>
      {(p) => {
        const positions = p.positions || [];
        const segs = positions.map((x, i) => ({
          value: Number(x.currentValue) || 0,
          color: PALETTE[i % PALETTE.length]
        }));
        const pnl = Number(p.totalUnrealizedPnl) || 0;
        const pnlPct = Number(p.totalUnrealizedPnlPercentage) || 0;

        return (
          <>
            <VaultHead
              title={"💼 Portfolio // account " + String(userId).padStart(4, "0")}
              sub="unrealized P&L settles at current mark"
              right={
                <div className="mono small" style={{ color: "var(--d-muted)" }}>
                  equity <b style={{ color: "var(--neon)" }}>{num(p.totalPortfolioValue)} BTC</b>
                </div>
              }
            />

            <div className="grid g4" style={{ gap: 12 }}>
              <Kpi label="Total value" value={num(p.totalPortfolioValue)} sub="BTC equity" />
              <Kpi tone="cyan" label="Cash balance" value={num(p.simulatedBtcBalance)} sub="free BTC" />
              <Kpi
                tone="violet"
                label="Invested"
                value={num(p.totalCurrentValue)}
                sub={"cost basis " + num(p.totalInvestedValue)}
              />
              <Kpi
                tone={pnl >= 0 ? "" : "red"}
                label="Unrealized P&L"
                value={signed(pnl)}
                valueClass={cls(pnl)}
                sub={signed(pnlPct) + "%"}
                subClass={cls(pnlPct)}
              />
            </div>

            <div className="split">
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px 0" }}>
                  <h3>Positions</h3>
                </div>
                {positions.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th className="num">Qty</th>
                        <th className="num">Avg</th>
                        <th className="num">Mark</th>
                        <th className="num">Invested</th>
                        <th className="num">Value</th>
                        <th className="num">uPnL</th>
                        <th className="num">%</th>
                        <th className="num">24h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((x, i) => {
                        const c = changePct(Demo.assetById(x.assetId) || {});
                        return (
                          <tr key={x.assetId}>
                            <td>
                              <div className="sym-cell">
                                <span
                                  className="sq"
                                  style={{
                                    borderColor: PALETTE[i % PALETTE.length] + "55",
                                    color: PALETTE[i % PALETTE.length]
                                  }}
                                >
                                  {x.symbol.slice(0, 4)}
                                </span>
                                <span className="nm">{x.name}</span>
                              </div>
                            </td>
                            <td className="num mono">{num(x.quantity)}</td>
                            <td className="num mono">{num(x.averageBuyPrice)}</td>
                            <td className="num mono">{num(x.currentPrice)}</td>
                            <td className="num mono">{num(x.investedValue)}</td>
                            <td className="num mono">{num(x.currentValue)}</td>
                            <td className={"num mono " + cls(x.unrealizedPnl)}>{signed(x.unrealizedPnl)}</td>
                            <td className={"num mono " + cls(x.unrealizedPnlPercentage)}>
                              {signed(x.unrealizedPnlPercentage)}%
                            </td>
                            <td className={"num mono " + cls(c)}>{signed(c)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <Empty icon="💳">
                    Flat — no open positions. Head to{" "}
                    <Link to="/trade" style={{ color: "var(--cyan)" }}>
                      Trade
                    </Link>
                    .
                  </Empty>
                )}
              </div>

              <div className="card column">
                <h3>Allocation</h3>
                <div className="donut fill-y">
                  <Donut
                    segments={segs.concat([
                      { value: Number(p.simulatedBtcBalance) || 0, color: "#2b3d50" }
                    ])}
                    size={170}
                  />
                  <div className="donut-center">
                    <b>{num(p.totalPortfolioValue, 3)}</b>
                    <small>BTC</small>
                  </div>
                </div>
                <div className="legend pin">
                  {positions.length ? (
                    positions.map((x, i) => (
                      <div className="lg" key={x.assetId}>
                        <span className="dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                        {x.symbol}
                        <span className="val">
                          {Math.round(
                            (Number(x.currentValue) / (Number(p.totalCurrentValue) || 1)) * 100
                          )}
                          %
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="muted small">nothing allocated</div>
                  )}
                  <div className="lg">
                    <span className="dot" style={{ background: "#2b3d50" }} />
                    cash
                    <span className="val">
                      {Math.round(
                        (Number(p.simulatedBtcBalance) / (Number(p.totalPortfolioValue) || 1)) * 100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      }}
    </DataView>
  );
}
