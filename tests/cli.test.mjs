import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const cli = fileURLToPath(new URL("../scripts/seo-skill.mjs", import.meta.url));
const example = (name) => fileURLToPath(new URL(`../examples/${name}`, import.meta.url));
const runCli = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

test("validate accepts a snapshot and a ledger", () => {
  assert.equal(runCli("validate", example("rank-previous.json")).stdout, "OK seo-skill/snapshot/v1\n");
  assert.equal(runCli("validate", example("ledger.json")).stdout, "OK seo-skill/budget/v1\n");
});

test("diff prints a Markdown report, or refuses incomparable snapshots with exit 1", () => {
  const ok = runCli("diff", example("rank-previous.json"), example("rank-current.json"));
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^# Rank report — example\.com/);
  const refused = runCli("diff", example("rank-previous.json"), example("rank-current-mobile.json"));
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, "");
  assert.match(refused.stderr, /device: desktop vs mobile/);
});

test("budget check answers OK or Refused with the exit code a script can branch on", () => {
  const ok = runCli("budget", "check", example("ledger.json"), "--tool", "web__run_scraper", "--cap", "10", "--input", example("scraper-input.json"));
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^OK: start it with max_cost_credits 10; 29\.25 credits remain/);
  const refused = runCli("budget", "check", example("ledger.json"), "--tool", "web__run_scraper", "--cap", "45");
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^Refused: cap 45 is above the approved per-call limit 40/);
});

test("budget summary names the unresolved run to check", () => {
  const summary = runCli("budget", "summary", example("ledger.json"));
  assert.equal(summary.status, 0);
  assert.match(summary.stdout, /remaining 39\.25 credits/);
  assert.match(summary.stdout, /Unresolved: web__run_scraper example-author\/site-overview-scraper is unknown \(run example-run-2\)/);
});

test("usage errors exit 1", () => {
  assert.equal(runCli("diff", example("rank-previous.json")).status, 1);
  assert.equal(runCli("nope").status, 1);
});
