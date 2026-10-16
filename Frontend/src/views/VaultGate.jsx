import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useApp } from "../state/AppContext.jsx";

const LINES = [
  <span className="dim" key="l0">
    $ studymarket --open-vault
  </span>,
  <>
    <span className="dim">&gt; establishing secure channel... </span>
    <span className="ok">OK</span>
  </>,
  <>
    <span className="dim">&gt; loading market feed... </span>
    <span className="ok">OK</span>
  </>,
  <>
    <span className="dim">&gt; awaiting passphrase</span>
    <span className="cur" />
  </>
];

export default function VaultGate() {
  const { unlock, toast } = useApp();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [step, setStep] = useState(1); // how many terminal lines are visible
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (granted) return undefined;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= LINES.length) {
          clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 550);
    const focus = setTimeout(() => inputRef.current && inputRef.current.focus(), 200);
    return () => {
      clearInterval(id);
      clearTimeout(focus);
    };
  }, [granted]);

  // while typing is still in progress the caret keeps blinking on the last line
  useEffect(() => {
    if (step >= LINES.length - 1 && inputRef.current) inputRef.current.focus();
  }, [step]);

  function tryUnlock() {
    if (!pass.trim()) {
      setError("passphrase required");
      return;
    }
    setError("");
    setGranted(true);
    unlock();
    setTimeout(() => {
      navigate("/market");
      toast("Vault unlocked — the terminal is yours", "ok");
    }, 700);
  }

  return (
    <div className="unlock">
      <div className="unlock-box">
        <div className="glyph">🔒</div>
        <h2>Restricted Zone</h2>
        <p>
          MARKET · PORTFOLIO · STATS · TRADING
          <br />
          authorized personnel only
        </p>
        <div className="term">
          {granted ? (
            <>
              <span className="dim">$ verify --passphrase ****</span>
              <br />
              <span className="ok">&gt; ACCESS GRANTED — welcome back, operator</span>
              <br />
              <span className="dim">&gt; vault unlocked for this session</span>
            </>
          ) : (
            LINES.slice(0, step).map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))
          )}
        </div>
        <input
          ref={inputRef}
          type="password"
          placeholder="passphrase"
          autoComplete="off"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") tryUnlock();
          }}
        />
        <div className="unlock-err">{error}</div>
        <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={tryUnlock}>
          Unlock vault
        </button>
        <div
          className="small muted"
          style={{ textAlign: "center", marginTop: 14, fontFamily: "var(--mono)", fontSize: 11 }}
        >
          hint: any passphrase opens the demo vault — or click through the nav
        </div>
      </div>
    </div>
  );
}
