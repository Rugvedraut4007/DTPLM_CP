/* Route metadata and the vault zone list — shared by the shell and the sidebar. */

export const TITLES = {
  "/": ["Dashboard", "your day at a glance"],
  "/study": ["Study", "focus sessions build market value"],
  "/assessments": ["Assessments", "prove your knowledge to unlock sell rights"],
  "/challenges": ["Challenges", "earn XP"],
  "/leaderboard": ["Leaderboard", "top students by XP"],
  "/friends": ["Friends", "study together"],
  "/vault": ["Restricted Zone", "classified terminal"],
  "/market": ["Market", "subject share prices"],
  "/trade": ["Trade", "buy & sell shares"],
  "/portfolio": ["Portfolio", "your positions & P&L"],
  "/stats": ["Stats", "study & trading analytics"]
};

export const VAULT_ROUTES = ["/vault", "/market", "/trade", "/portfolio", "/stats"];

export const isVaultPath = (pathname) => VAULT_ROUTES.includes(pathname);
