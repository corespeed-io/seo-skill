import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { diffSnapshots, renderReport, validateSnapshot } from "../scripts/lib/snapshot.mjs";

const example = (name) =>
  JSON.parse(readFileSync(new URL(`../examples/${name}`, import.meta.url), "utf8"));

test("the examples are valid snapshots", () => {
  for (const name of [
    "rank-previous.json",
    "rank-current.json",
    "rank-current-mobile.json",
    "metric-previous.json",
    "metric-current.json",
  ]) {
    const checked = validateSnapshot(example(name));
    assert.equal(checked.ok, true, `${name}: ${checked.problems?.join("; ")}`);
  }
});

test("validation names every problem, including a zero position and a duplicate", () => {
  const bad = {
    ...example("rank-previous.json"),
    depth: 0,
    rows: [
      { keyword: "a", position: 0 },
      { keyword: "A", position: 2 },
    ],
  };
  const checked = validateSnapshot(bad);
  assert.equal(checked.ok, false);
  assert.deepEqual(checked.problems, [
    "depth: a positive integer for a rank snapshot",
    'rows[0].position: a positive integer, or null for "not ranking"',
    'rows[1].keyword: "a" appears twice',
  ]);
});

test("a rank diff keeps not measured, not ranking and positions apart", () => {
  const diff = diffSnapshots(example("rank-previous.json"), example("rank-current.json"));
  assert.equal(diff.comparable, true);
  const byKeyword = Object.fromEntries(diff.changes.map((c) => [c.keyword, [c.previous, c.current, c.status]]));
  assert.deepEqual(byKeyword, {
    "free seo audit": ["not_ranking", 18, "entered"],
    "seo audit checklist": [3, 9, "declined"],
    "seo audit software": ["not_measured", 19, "not_measured_before"],
    "seo audit template": [6, "not_measured", "not_measured_now"],
    "site audit tool": [14, 11, "improved"],
    "technical seo audit": [8, "not_ranking", "dropped_out"],
  });
});

test("a rank diff flags drop-outs, large drops, URL changes and a coverage gap", () => {
  const diff = diffSnapshots(example("rank-previous.json"), example("rank-current.json"));
  assert.deepEqual(
    diff.anomalies.map((a) => [a.kind, a.keyword]),
    [
      ["coverage_gap", null],
      ["large_drop", "seo audit checklist"],
      ["url_changed", "seo audit checklist"],
      ["dropped_out", "technical seo audit"],
    ],
  );
  assert.equal(diff.anomalies[0].detail, "1 of 5 keywords were not measured this time; check the data before reading the moves");
});

test("a mobile snapshot is never compared with a desktop one", () => {
  const diff = diffSnapshots(example("rank-previous.json"), example("rank-current-mobile.json"));
  assert.deepEqual(diff, { comparable: false, reasons: ["device: desktop vs mobile"] });
});

test("one vendor's metric is never compared with another's", () => {
  const other = { ...example("metric-current.json"), source: "web__run_scraper:example-author/moz-like-scraper" };
  const diff = diffSnapshots(example("metric-previous.json"), other);
  assert.equal(diff.comparable, false);
  assert.match(diff.reasons[0], /^source: /);
});

test("a metric diff gives deltas and flags a lost figure as missing, not zero", () => {
  const diff = diffSnapshots(example("metric-previous.json"), example("metric-current.json"));
  assert.deepEqual(
    diff.changes.map((c) => [c.metric, c.previous, c.current, c.delta, c.pct]),
    [
      ["backlinks", 400, "no_figure", null, null],
      ["domain_rating", 30, 32, 2, 6.7],
      ["referring_domains", 120, 160, 40, 33.3],
    ],
  );
  assert.deepEqual(
    diff.anomalies.map((a) => a.kind),
    ["lost_figure", "large_change"],
  );
});

test("the report leads with its context and never prints missing as 0", () => {
  const report = renderReport(diffSnapshots(example("rank-previous.json"), example("rank-current.json")));
  assert.match(report, /^# Rank report — example\.com/);
  assert.match(report, /Geography: US · Device: desktop · Engine: google · Language: en · Depth: 20/);
  assert.match(report, /Missing is not zero/);
  assert.match(report, /\| seo audit template \| 6 \| not measured \| — \| not measured now \|/);
  assert.doesNotMatch(report, /\| 0 \|/);
});
