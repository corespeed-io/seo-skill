import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkNext, inputHash, summarize, validateLedger } from "../scripts/lib/budget.mjs";

const ledger = () =>
  JSON.parse(readFileSync(new URL("../examples/ledger.json", import.meta.url), "utf8"));

test("the example ledger is valid", () => {
  assert.equal(validateLedger(ledger()).ok, true);
});

test("open caps count in full until a call settles", () => {
  const totals = summarize(ledger());
  assert.equal(totals.charged_credits, 0.75);
  assert.equal(totals.open_caps_credits, 20);
  assert.equal(totals.committed_credits, 20.75);
  assert.equal(totals.remaining_credits, 39.25);
  assert.deepEqual(
    totals.unresolved.map((e) => e.run_id),
    ["example-run-2"],
  );
});

test("a call that fits the remaining budget and the per-call limit may start", () => {
  assert.deepEqual(checkNext(ledger(), { tool: "web__run_scraper", cap_credits: 30 }), {
    ok: true,
    remaining_after: 9.25,
  });
});

test("a cap above what remains, or above the per-call limit, is refused", () => {
  assert.equal(checkNext(ledger(), { tool: "web__run_scraper", cap_credits: 40 }).ok, false);
  const big = { ...ledger(), approved_total_credits: 1000 };
  assert.match(checkNext(big, { tool: "web__run_scraper", cap_credits: 41 }).reason, /per-call limit 40/);
});

test("an identical call whose earlier run is unresolved is refused: check its status first", () => {
  const verdict = checkNext(ledger(), {
    tool: "web__run_scraper",
    scraper: "example-author/site-overview-scraper",
    input_hash: "0000000000000002",
    cap_credits: 5,
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /is unknown \(run example-run-2\): check its status first/);
});

test("a call without a positive cap is refused", () => {
  assert.equal(checkNext(ledger(), { tool: "web__run_scraper", cap_credits: 0 }).ok, false);
});

test("a charge above its cap fails validation, because the cap was promised", () => {
  const l = ledger();
  l.entries[0].charged_credits = 3;
  const checked = validateLedger(l);
  assert.equal(checked.ok, false);
  assert.match(checked.problems[0], /above its cap/);
});

test("the input hash is stable across key order", () => {
  assert.equal(inputHash({ a: 1, b: [2, { c: 3, d: 4 }] }), inputHash({ b: [2, { d: 4, c: 3 }], a: 1 }));
  assert.notEqual(inputHash({ a: 1 }), inputHash({ a: 2 }));
});
