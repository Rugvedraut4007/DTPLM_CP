import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AppProvider, useApp } from "./state/AppContext.jsx";
import { Sidebar, ToastHost, Topbar } from "./components/Chrome.jsx";
import { TITLES, isVaultPath } from "./lib/routes.js";

import Dashboard from "./views/Dashboard.jsx";
import Study from "./views/Study.jsx";
import Assessments from "./views/Assessments.jsx";
import Challenges from "./views/Challenges.jsx";
import Leaderboard from "./views/Leaderboard.jsx";
import Friends from "./views/Friends.jsx";
import VaultGate from "./views/VaultGate.jsx";
import Market from "./views/Market.jsx";
import Trade from "./views/Trade.jsx";
import Portfolio from "./views/Portfolio.jsx";
import Stats from "./views/Stats.jsx";

function VaultRoute({ children }) {
  const { unlocked } = useApp();
  if (!unlocked) return <Navigate to="/vault" replace />;
  return children;
}

function Shell() {
  const location = useLocation();
  const route = location.pathname;
  const [title, crumb] = TITLES[route] || ["StudyMarket", ""];
  const isVault = isVaultPath(route);

  useEffect(() => {
    document.title = title + " · StudyMarket";
  }, [title]);

  useEffect(() => {
    document.body.dataset.zone = isVault ? "vault" : "light";
  }, [isVault]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <div id="app">
      <Sidebar />
      <div className="main">
        <Topbar title={title} crumb={crumb} />
        <main id="view" className="view" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/study" element={<Study />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/vault" element={<VaultGate />} />
            <Route
              path="/market"
              element={
                <VaultRoute>
                  <Market />
                </VaultRoute>
              }
            />
            <Route
              path="/trade"
              element={
                <VaultRoute>
                  <Trade />
                </VaultRoute>
              }
            />
            <Route
              path="/portfolio"
              element={
                <VaultRoute>
                  <Portfolio />
                </VaultRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <VaultRoute>
                  <Stats />
                </VaultRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  );
}
