/* Number / date formatting shared by every view (same output as the
   original vanilla client). React escapes text for us, so there is no
   escaping helper here. */

export const num = (n, d) => Number(n || 0).toFixed(d == null ? 4 : d);

export const signed = (n, d) => (n > 0 ? "+" : "") + Number(n || 0).toFixed(d == null ? 2 : d);

export const cls = (n) => (Number(n) >= 0 ? "pos" : "neg");

export function fmtDur(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return hh + ":" + mm + ":" + ss;
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - Date.parse(iso);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return min + "m ago";
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + "h ago";
  const d = Math.floor(hr / 24);
  if (d < 30) return d + "d ago";
  return new Date(iso).toLocaleDateString();
}

export function initials(name) {
  return String(name || "?")
    .split(/[_\s]+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
