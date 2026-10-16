import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import API from "../lib/api.js";
import { sessionAsset } from "../lib/domain.js";
import { fmtDur } from "../lib/format.js";
import { useApp } from "../state/AppContext.jsx";
import { FocusTimer } from "./Charts.jsx";

/* the required study timer a purchase request sets: counts down the minutes
   still missing for the subject, then tells the student to bank the session */
export function RequiredTimer({ startedAt, requiredMinutes, unlocked = false }) {
  const [elapsed, setElapsed] = useState(() => (Date.now() - Date.parse(startedAt)) / 1000);

  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - Date.parse(startedAt)) / 1000), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const target = Math.max(0, Number(requiredMinutes) || 0) * 60;
  const left = Math.max(0, target - elapsed);
  const met = unlocked || left === 0;

  return (
    <div className={"note " + (met ? "ok" : "warn")}>
      {met ? (
        <>
          ✓ required study time complete — stop the session so the backend validates it
        </>
      ) : (
        <>
          required timer <b>{fmtDur(left)}</b> left of this subject's study requirement
        </>
      )}
    </div>
  );
}

/* stop the running session, bank the XP and refresh whoever is showing it */
export function StopSessionButton({ label = "■\u00a0 Stop session", onStopped }) {
  const { activeSession, setActiveSession, reloadUser, toast } = useApp();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await API.post("/api/study-sessions/" + activeSession.id + "/stop");
      setActiveSession(null);
      toast("Session stopped — XP banked. Nicely done.", "ok");
      await reloadUser();
      if (onStopped) onStopped();
    } catch (e) {
      toast(e.message, "err");
      setBusy(false);
    }
  }

  return (
    <button className="btn danger" onClick={stop} disabled={busy}>
      {label}
    </button>
  );
}

/* the dark strip above the dashboard / study grid */
export function FocusBar({ variant = "dashboard", onStopped }) {
  const { activeSession } = useApp();

  if (activeSession) {
    return (
      <div className="focus-bar">
        <div>
          <div className="who">
            Focusing on <b>{sessionAsset(activeSession).symbol}</b>
            {variant === "dashboard" ? " — session running" : ""}
          </div>
          <FocusTimer startedAt={activeSession.startedAt} />
        </div>
        <StopSessionButton
          label={variant === "study" ? "■\u00a0 Stop & earn XP" : undefined}
          onStopped={onStopped}
        />
      </div>
    );
  }

  if (variant === "study") return null;

  return (
    <div className="focus-bar">
      <div>
        <div className="who">Ready to focus? Pick a subject and start a session.</div>
        <div className="timer">00:00:00</div>
      </div>
      <Link className="btn" to="/study">
        ⏱&nbsp; Start focus
      </Link>
    </div>
  );
}
