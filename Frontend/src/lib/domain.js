/* Shared derivations over the API payloads. */

export function sessionAsset(s) {
  if (s.asset && s.asset.symbol) return s.asset;
  return { id: s.assetId, symbol: s.assetSymbol || "?" };
}

export function changePct(a) {
  if (!a || !a.openingPrice) return 0;
  return ((a.currentPrice - a.openingPrice) / a.openingPrice) * 100;
}

/* remaining sell rights: the demo/detail payload returns
   remainingSellPercentage, the live AssessmentResponse only carries
   maxSellPercentage (the server enforces the rest) */
export function rightsOf(a) {
  if (a && a.remainingSellPercentage != null && a.remainingSellPercentage !== "") {
    return Number(a.remainingSellPercentage);
  }
  return Number((a && a.maxSellPercentage) || 0);
}

/* learning unlocks buying: when a purchase is refused for lack of study,
   the API answers 409 with {code: "STUDY_REQUIRED", assetId, remainingMinutes…}.
   Returns that body, or null when the error was something else. */
export function studyRequired(err) {
  const payload = err && (err.payload || (err.code === "STUDY_REQUIRED" ? err : null));
  return payload && payload.code === "STUDY_REQUIRED" ? payload : null;
}

/* highest sell right the user still holds for an asset */
export function rightsFor(assessments, assetId) {
  const usable = (assessments || []).filter((a) => a.assetId === assetId && rightsOf(a) > 0);
  return usable.length ? rightsOf(usable[0]) : 0;
}
