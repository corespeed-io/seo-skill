// Snapshots of SEO figures and a diff of two of them. Pure functions, no
// dependencies, no network: the figures come from tool results an agent
// already has, and the files live wherever the user keeps them.
//
// A snapshot is one observation of one kind of figure from one source, in
// one context (site, geography, device, engine, language). Two snapshots are
// compared only when that context matches: a live SERP position is never
// compared with an average position, a mobile figure never with a desktop
// one, and one vendor's metric never with another's.
//
// Missing is not zero. A row absent from a snapshot was not measured. A rank
// row with `position: null` was measured and does not rank within `depth`. A
// metric row with `value: null` was asked for and the source had no figure.

export const SNAPSHOT_SCHEMA = "seo-skill/snapshot/v1";

/** The context two snapshots must share to be compared. */
export const CONTEXT_KEYS = [
  "kind",
  "site",
  "source",
  "measurement",
  "geography",
  "device",
  "engine",
  "language",
  "depth",
];

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isPositiveInt = (v) => Number.isSafeInteger(v) && v > 0;

/** Check a parsed JSON value is a snapshot; answers the snapshot or every problem found. */
export function validateSnapshot(value) {
  const problems = [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, problems: ["(root): not an object"] };
  }
  const s = value;
  if (s.schema !== SNAPSHOT_SCHEMA) problems.push(`schema: must be "${SNAPSHOT_SCHEMA}"`);
  if (!isText(s.captured_at) || Number.isNaN(Date.parse(s.captured_at))) {
    problems.push("captured_at: an ISO 8601 time");
  }
  if (s.kind !== "rank" && s.kind !== "metric") problems.push('kind: "rank" or "metric"');
  for (const key of ["site", "source", "measurement", "geography", "device"]) {
    if (!isText(s[key])) problems.push(`${key}: a non-empty string`);
  }
  for (const key of ["engine", "language"]) {
    if (s[key] !== undefined && !isText(s[key])) problems.push(`${key}: a non-empty string when set`);
  }
  if (s.kind === "rank") {
    if (!isText(s.engine)) problems.push("engine: required for a rank snapshot");
    if (!isPositiveInt(s.depth)) problems.push("depth: a positive integer for a rank snapshot");
  }
  if (!Array.isArray(s.rows)) {
    problems.push("rows: an array");
    return { ok: false, problems };
  }
  const seen = new Set();
  s.rows.forEach((row, i) => {
    const at = `rows[${i}]`;
    if (row === null || typeof row !== "object") {
      problems.push(`${at}: not an object`);
      return;
    }
    const key = s.kind === "rank" ? row.keyword : row.metric;
    const keyName = s.kind === "rank" ? "keyword" : "metric";
    if (!isText(key)) {
      problems.push(`${at}.${keyName}: a non-empty string`);
      return;
    }
    const folded = key.trim().toLowerCase();
    if (seen.has(folded)) problems.push(`${at}.${keyName}: "${folded}" appears twice`);
    seen.add(folded);
    if (s.kind === "rank") {
      if (row.position !== null && !isPositiveInt(row.position)) {
        problems.push(`${at}.position: a positive integer, or null for "not ranking"`);
      }
      if (row.url !== undefined && row.url !== null && !isText(row.url)) {
        problems.push(`${at}.url: a string or null`);
      }
    } else {
      if (row.value !== null && !(typeof row.value === "number" && Number.isFinite(row.value))) {
        problems.push(`${at}.value: a number, or null for "no figure"`);
      }
      if (row.unit !== undefined && !isText(row.unit)) problems.push(`${at}.unit: a string`);
    }
  });
  return problems.length > 0 ? { ok: false, problems } : { ok: true, snapshot: s };
}

/** Why two snapshots measure different things; empty when they are comparable. */
export function incomparability(previous, current) {
  const reasons = [];
  for (const key of CONTEXT_KEYS) {
    const a = previous[key];
    const b = current[key];
    const norm = (v) => (typeof v === "string" ? v.trim().toLowerCase() : v);
    if (norm(a) !== norm(b)) reasons.push(`${key}: ${a ?? "(unset)"} vs ${b ?? "(unset)"}`);
  }
  return reasons;
}

const keyOf = (row, kind) => (kind === "rank" ? row.keyword : row.metric).trim().toLowerCase();

function indexRows(snapshot) {
  const map = new Map();
  for (const row of snapshot.rows) map.set(keyOf(row, snapshot.kind), row);
  return map;
}

export const RANK_DEFAULTS = { largeMove: 5, minChange: 1, coverageGap: 0.2, pageOne: 10 };
export const METRIC_DEFAULTS = { largeChangePct: 25, coverageGap: 0.2 };

function rankCell(row) {
  if (row === undefined) return "not_measured";
  return row.position === null ? "not_ranking" : row.position;
}

function diffRank(previous, current, options) {
  const o = { ...RANK_DEFAULTS, ...options };
  const before = indexRows(previous);
  const after = indexRows(current);
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes = [];
  const anomalies = [];
  for (const key of keys) {
    const was = before.get(key);
    const now = after.get(key);
    const prev = rankCell(was);
    const curr = rankCell(now);
    let status;
    let delta = null;
    if (prev === "not_measured") status = "not_measured_before";
    else if (curr === "not_measured") status = "not_measured_now";
    else if (prev === "not_ranking" && curr === "not_ranking") status = "not_ranking";
    else if (prev === "not_ranking") status = "entered";
    else if (curr === "not_ranking") status = "dropped_out";
    else {
      delta = curr - prev;
      status =
        Math.abs(delta) < o.minChange ? "unchanged" : delta < 0 ? "improved" : "declined";
    }
    const keyword = (now ?? was).keyword;
    changes.push({ keyword, previous: prev, current: curr, delta, status });
    if (status === "dropped_out") {
      anomalies.push({ kind: "dropped_out", severity: "high", keyword, detail: `${prev} → not in the top ${current.depth}` });
    }
    const wasOnPageOne = typeof prev === "number" && prev <= o.pageOne;
    // A keyword that left the depth entirely is reported once, as dropped out.
    const isOffPageOne = typeof curr === "number" && curr > o.pageOne;
    if (wasOnPageOne && isOffPageOne) {
      anomalies.push({ kind: "fell_off_page_one", severity: "high", keyword, detail: `${prev} → ${curr}` });
    }
    if (delta !== null && Math.abs(delta) >= o.largeMove) {
      anomalies.push({
        kind: delta > 0 ? "large_drop" : "large_gain",
        severity: delta > 0 ? "medium" : "info",
        keyword,
        detail: `${prev} → ${curr} (${delta > 0 ? "+" : ""}${delta})`,
      });
    }
    if (was?.url && now?.url && was.url !== now.url) {
      anomalies.push({
        kind: "url_changed",
        severity: "medium",
        keyword,
        detail: `${was.url} → ${now.url}`,
      });
    }
  }
  const measuredBefore = [...before.keys()].length;
  const lost = changes.filter((c) => c.status === "not_measured_now").length;
  if (measuredBefore > 0 && lost / measuredBefore >= o.coverageGap) {
    anomalies.unshift({
      kind: "coverage_gap",
      severity: "high",
      keyword: null,
      detail: `${lost} of ${measuredBefore} keywords were not measured this time; check the data before reading the moves`,
    });
  }
  return { changes, anomalies };
}

function metricCell(row) {
  if (row === undefined) return "not_measured";
  return row.value === null ? "no_figure" : row.value;
}

function diffMetric(previous, current, options) {
  const o = { ...METRIC_DEFAULTS, ...options };
  const before = indexRows(previous);
  const after = indexRows(current);
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes = [];
  const anomalies = [];
  for (const key of keys) {
    const was = before.get(key);
    const now = after.get(key);
    const prev = metricCell(was);
    const curr = metricCell(now);
    let delta = null;
    let pct = null;
    if (typeof prev === "number" && typeof curr === "number") {
      delta = Number((curr - prev).toFixed(6));
      pct = prev === 0 ? null : Number(((delta / Math.abs(prev)) * 100).toFixed(1));
    }
    const metric = (now ?? was).metric;
    const unit = (now ?? was).unit;
    changes.push({ metric, ...(unit !== undefined && { unit }), previous: prev, current: curr, delta, pct });
    if (pct !== null && Math.abs(pct) >= o.largeChangePct) {
      anomalies.push({ kind: "large_change", severity: "medium", metric, detail: `${prev} → ${curr} (${pct > 0 ? "+" : ""}${pct}%)` });
    }
    if (typeof prev === "number" && typeof curr !== "number") {
      anomalies.push({ kind: "lost_figure", severity: "high", metric, detail: `${prev} → ${curr}` });
    }
  }
  const measuredBefore = before.size;
  const lost = changes.filter((c) => c.current === "not_measured").length;
  if (measuredBefore > 0 && lost / measuredBefore >= o.coverageGap) {
    anomalies.unshift({ kind: "coverage_gap", severity: "high", metric: null, detail: `${lost} of ${measuredBefore} metrics were not measured this time` });
  }
  return { changes, anomalies };
}

/** Diff two validated snapshots, or say why they cannot be compared. */
export function diffSnapshots(previous, current, options = {}) {
  const reasons = incomparability(previous, current);
  if (reasons.length > 0) return { comparable: false, reasons };
  const body = previous.kind === "rank" ? diffRank(previous, current, options) : diffMetric(previous, current, options);
  const context = Object.fromEntries(CONTEXT_KEYS.filter((k) => current[k] !== undefined).map((k) => [k, current[k]]));
  return {
    comparable: true,
    context,
    previous_captured_at: previous.captured_at,
    current_captured_at: current.captured_at,
    ...body,
  };
}

const show = (v) => (typeof v === "number" ? String(v) : v.replaceAll("_", " "));

/** A short Markdown report of a comparable diff; missing is never printed as 0. */
export function renderReport(diff) {
  const c = diff.context;
  const lines = [
    `# ${c.kind === "rank" ? "Rank" : "Metric"} report — ${c.site}`,
    "",
    `Source: ${c.source} · ${c.measurement} · Geography: ${c.geography} · Device: ${c.device}${c.engine ? ` · Engine: ${c.engine}` : ""}${c.language ? ` · Language: ${c.language}` : ""}${c.depth ? ` · Depth: ${c.depth}` : ""}`,
    `Previous: ${diff.previous_captured_at} · Current: ${diff.current_captured_at}`,
    "",
    'Missing is not zero: "not measured" means no data, "not ranking" means checked and absent, "no figure" means the source gave none.',
    "",
    `## Anomalies (${diff.anomalies.length})`,
    "",
  ];
  if (diff.anomalies.length === 0) lines.push("None.");
  for (const a of diff.anomalies) {
    lines.push(`- **${a.severity}** ${a.kind.replaceAll("_", " ")}${a.keyword || a.metric ? ` — ${a.keyword ?? a.metric}` : ""}: ${a.detail}`);
  }
  lines.push("", "## Changes", "");
  if (c.kind === "rank") {
    lines.push("| Keyword | Previous | Current | Δ | Status |", "| --- | --- | --- | --- | --- |");
    for (const ch of diff.changes) {
      lines.push(`| ${ch.keyword} | ${show(ch.previous)} | ${show(ch.current)} | ${ch.delta ?? "—"} | ${ch.status.replaceAll("_", " ")} |`);
    }
  } else {
    lines.push("| Metric | Previous | Current | Δ | Δ % |", "| --- | --- | --- | --- | --- |");
    for (const ch of diff.changes) {
      lines.push(`| ${ch.metric}${ch.unit ? ` (${ch.unit})` : ""} | ${show(ch.previous)} | ${show(ch.current)} | ${ch.delta ?? "—"} | ${ch.pct ?? "—"} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}
