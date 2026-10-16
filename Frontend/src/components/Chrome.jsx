import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { initials } from "../lib/format.js";
import { isVaultPath } from "../lib/routes.js";
import { useApp } from "../state/AppContext.jsx";

const LIGHT_NAV = [
  { to: "/", label: "Dashboard", ico: "■" },
  { to: "/study", label: "Study", ico: "⏱" },
  { to: "/assessments", label: "Assessments", ico: "✓" },
  { to: "/challenges", label: "Challenges", ico: "⚑" },
  { to: "/leaderboard", label: "Leaderboard", ico: "🏆" },
  { to: "/friends", label: "Friends", ico: "♡" }
];

const VAULT_NAV = [
  { to: "/market", label: "Market", ico: "◆" },
  { to: "/trade", label: "Trade", ico: "⇅" },
  { to: "/portfolio", label: "Portfolio", ico: "💼" },
  { to: "/stats", label: "Stats", ico: "▦" }
];

function navClass({ isActive }, extra = "") {
  return "nav-item" + extra + (isActive ? " active" : "");
}

export function Sidebar() {
  const { unlocked, relock, mode, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [relockPending, setRelockPending] = useState(false);

  /* Relocking from inside the vault has to leave the vault zone first: the
     vault guard redirects to /vault whenever a vault route renders while
     locked, so the lock is only dropped once the dashboard has taken over. */
  useEffect(() => {
    if (!relockPending || isVaultPath(location.pathname)) return;
    setRelockPending(false);
    relock();
    toast("Vault relocked", "warn");
  }, [relockPending, location.pathname, relock, toast]);

  function handleRelock() {
    if (location.pathname === "/") {
      relock();
      toast("Vault relocked", "warn");
      return;
    }
    setRelockPending(true);
    navigate("/");
  }

  return (
    <aside className="sidebar">
      <div className="brand" title="StudyMarket">
        <span className="brand-mark">📚</span>
        <span className="brand-name">
          Study<strong>Market</strong>
        </span>
      </div>

      <nav className="nav" aria-label="Main">
        {LIGHT_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navClass}>
            <span className="nav-ico">{item.ico}</span> {item.label}
          </NavLink>
        ))}
      </nav>

      {unlocked ? (
        <div className="vault-group">
          <div className="vault-group-label">// classified terminal</div>
          {VAULT_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={(s) => navClass(s, " vault-item")}>
              <span className="nav-ico">{item.ico}</span> {item.label}
            </NavLink>
          ))}
          <button className="nav-item vault-item vault-relock" onClick={handleRelock}>
            <span className="nav-ico">🔒</span> Relock vault
          </button>
        </div>
      ) : null}

      <div className="side-foot">
        <button className="vault-entry" title="Classified access" onClick={() => navigate("/vault")}>
          <span className="vault-entry-ico">◇</span>
          <span className="vault-entry-txt">restricted zone</span>
        </button>
        <div className="conn" title="Backend connection">
          <span className={"conn-dot " + (mode === "live" ? "live" : "demo")} />
          <span className="conn-label">{mode === "live" ? "backend online" : "demo mode"}</span>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, crumb }) {
  const { mode, user } = useApp();
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="crumb">{crumb}</div>
      </div>
      <div className="topbar-right">
        {mode !== "unknown" ? (
          <div className={"mode-chip" + (mode === "live" ? " live" : "")}>
            {mode === "live" ? "● LIVE API" : "◆ DEMO DATA"}
          </div>
        ) : null}
        <div className="user-chip">
          <span className="avatar">{initials(user ? user.username : "?")}</span>
          <span className="user-meta">
            <b>{user ? user.username : "…"}</b>
            <small>{user ? user.xp + " XP · " + user.currentStreak + "d streak" : ""}</small>
          </span>
        </div>
      </div>
    </header>
  );
}

export function ToastHost() {
  const { toasts } = useApp();
  return (
    <div id="toasts" className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={"toast " + (t.type || "") + (t.out ? " out" : "")}>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
