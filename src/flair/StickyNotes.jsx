import { useEffect, useState } from "react";
import "./flair.css";

/**
 * Data-driven sticky note (adapted from the growth-agency design's floating
 * stat cards, restyled to the site palette). Intended to eventually show live
 * performance metrics — keep the props shape stable.
 */
const MVM_SUMMARY_URL = "https://mvm-dashboard.pages.dev/api/summary";

const usd = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Monkey vs Machine note with the real current standings, fetched from the
 * dashboard's public /api/summary. Falls back to static copy if the fetch
 * fails. NOTE: a 200 alone is NOT proof the endpoint ran (the Pages SPA
 * fallback returns 200 HTML) — require JSON content-type and a numeric field.
 */
export function MvmRaceNote({ tone = "c", rotate = 0, size }) {
  const [race, setRace] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(MVM_SUMMARY_URL, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok || !(res.headers.get("content-type") || "").includes("application/json")) {
          throw new Error("bad response");
        }
        return res.json();
      })
      .then((body) => {
        if (typeof body.ai_equity === "number" && typeof body.monkey_mean === "number") {
          setRace(body);
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  if (!race) {
    return (
      <StickyNote
        title="the race"
        value="ML vs 🐒"
        trend="ticks daily"
        tone={tone}
        rotate={rotate}
        size={size}
      />
    );
  }
  const leader = race.ai_equity >= race.monkey_mean ? "machine ahead" : "monkeys ahead";
  return (
    <StickyNote
      title="today"
      value={`ML ${usd(race.ai_equity)}`}
      label={`🐒 ${usd(race.monkey_mean)}`}
      trend={`${leader} · live`}
      tone={tone}
      rotate={rotate}
      size={size}
    />
  );
}

export function StickyNote({ title, value, label, trend, tone = "a", rotate = 0, size }) {
  return (
    <div
      className={`sticky-note sticky-note--${tone}${size === "sm" ? " sticky-note--sm" : ""}`}
      style={{ "--sn-rotate": `${rotate}deg` }}
    >
      {title ? <span className="sticky-note-chip mono">{title}</span> : null}
      <div className="sticky-note-value">{value}</div>
      {label ? <div className="sticky-note-label">{label}</div> : null}
      {trend ? <span className="sticky-note-trend mono">{trend}</span> : null}
    </div>
  );
}
