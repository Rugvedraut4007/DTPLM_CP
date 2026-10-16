import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import API, { onModeChange } from "../lib/api.js";
import Demo from "../lib/demo.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [mode, setMode] = useState(API.state.checked ? API.state.mode : "unknown");
  const [userId] = useState(() => Number(localStorage.getItem("studymarket.userId")) || 1);
  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("sm_vault") === "1");
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const toast = useCallback((msg, type) => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, msg, type, out: false }]);
    // mark it leaving slightly before it unmounts so the fade-out plays
    setTimeout(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)));
    }, 3250);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  useEffect(() => {
    let alive = true;
    API.detect().then((m) => alive && setMode(m));
    onModeChange((m) => alive && setMode(m));
    return () => {
      alive = false;
    };
  }, []);

  const reloadUser = useCallback(async () => {
    let u;
    try {
      u = await API.get("/api/users/" + userId);
    } catch (e) {
      u = Demo.me();
    }
    setUser(u);
    return u;
  }, [userId]);

  const reloadActiveSession = useCallback(async () => {
    let s = null;
    try {
      const sessions = await API.get("/api/users/" + userId + "/study-sessions");
      s = (sessions || []).find((x) => x.status === "ACTIVE") || null;
    } catch (e) {
      s = Demo.state.activeSession || null;
    }
    setActiveSession(s);
    return s;
  }, [userId]);

  useEffect(() => {
    reloadUser();
    reloadActiveSession();
  }, [reloadUser, reloadActiveSession]);

  const unlock = useCallback(() => {
    sessionStorage.setItem("sm_vault", "1");
    setUnlocked(true);
  }, []);

  const relock = useCallback(() => {
    sessionStorage.removeItem("sm_vault");
    setUnlocked(false);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      userId,
      user,
      reloadUser,
      activeSession,
      setActiveSession,
      reloadActiveSession,
      unlocked,
      unlock,
      relock,
      toast,
      toasts
    }),
    [mode, userId, user, reloadUser, activeSession, reloadActiveSession, unlocked, unlock, relock, toast, toasts]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
