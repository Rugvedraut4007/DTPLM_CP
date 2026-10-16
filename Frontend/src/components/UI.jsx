/* Small shared pieces built on the existing stylesheet classes. */

export function Bar({ value, green, amber }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={"bar" + (green ? " green" : amber ? " amber" : "")}>
      <i style={{ width: v + "%" }} />
    </div>
  );
}

export function Empty({ icon, children }) {
  return (
    <div className="empty">
      {icon ? <span className="big">{icon}</span> : null}
      {children}
    </div>
  );
}

export function Kpi({ tone = "", label, value, sub, valueClass = "", subClass = "" }) {
  return (
    <div className={"kpi" + (tone ? " " + tone : "")}>
      <div className="k-label">{label}</div>
      <div className={"k-value " + valueClass}>{value}</div>
      {sub ? <div className={"k-sub " + subClass}>{sub}</div> : null}
    </div>
  );
}

export function OrderLine({ label, children, total }) {
  return (
    <div className={"order-line" + (total ? " total" : "")}>
      <span>{label}</span>
      <b>{children}</b>
    </div>
  );
}

export function VaultHead({ title, sub, right }) {
  return (
    <div className="vault-head">
      <div>
        <div className="vh-title">{title}</div>
        {sub ? <div className="vh-sub">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

/* vertical bar chart — items: [{ value, title, label }] */
export function ChartBars({ items, height = 150, fillY = false }) {
  return (
    <div className={"chart-bars" + (fillY ? " fill-y" : "")} style={fillY ? undefined : { height }}>
      {items.map((it, i) => (
        <div className="cb" key={i}>
          <i style={{ height: Math.round(it.pct) + "%" }} title={it.title} />
          {it.label ? <small>{it.label}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function Loading() {
  return <Empty icon="⏳">Loading…</Empty>;
}

export function ErrorBox({ error, onRetry }) {
  return (
    <Empty icon="⚠">
      {(error && error.message) || "Something went wrong"}
      <br />
      <br />
      <button className="btn ghost sm" onClick={onRetry}>
        Retry
      </button>
    </Empty>
  );
}

/* renders one async view: loading → error (+retry) → children(data) */
export function DataView({ query, children, deps = [] }) {
  if (query.loading && !query.data) return <Loading />;
  if (query.error) return <ErrorBox error={query.error} onRetry={query.reload} />;
  return children(query.data, query.reload);
}
