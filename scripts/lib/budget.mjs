// A budget ledger for paid tool calls: what the user approved, what each call
// was capped at, and what it was charged. Pure functions, no dependencies.
//
// The rules it enforces before the next paid call:
//   - every call has a positive cap (`max_cost_credits`), at most the
//     per-call limit the user approved;
//   - committed spend = charged credits of finished calls + the full cap of
//     every call that is approved, running or whose outcome is unknown. The
//     next call's cap must fit in what remains of the approved total;
//   - a call whose earlier identical run (same tool, scraper and input) is
//     still running or unknown is refused: check that run's status first,
//     never start it again blindly.

import { createHash } from "node:crypto";

export const LEDGER_SCHEMA = "seo-skill/budget/v1";

/** Statuses whose cost is not final: counted at their full cap. */
const OPEN = new Set(["approved", "running", "unknown"]);
const ALL = new Set(["approved", "running", "unknown", "settled", "failed", "released"]);

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isAmount = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Integer thousandths of a credit, so sums do not drift. */
const milli = (credits) => Math.round(credits * 1_000);
const credits = (m) => m / 1_000;

/** JSON with keys sorted at every depth: one text per input. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** A short, stable hash of a call's input, to recognise the same request again. */
export function inputHash(input) {
  return createHash("sha256").update(canonicalJson(input)).digest("hex").slice(0, 16);
}

export function validateLedger(value) {
  const problems = [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, problems: ["(root): not an object"] };
  }
  const l = value;
  if (l.schema !== LEDGER_SCHEMA) problems.push(`schema: must be "${LEDGER_SCHEMA}"`);
  if (!(isAmount(l.approved_total_credits) && l.approved_total_credits > 0)) {
    problems.push("approved_total_credits: a positive number");
  }
  if (l.per_call_max_credits !== undefined && !(isAmount(l.per_call_max_credits) && l.per_call_max_credits > 0)) {
    problems.push("per_call_max_credits: a positive number when set");
  }
  if (!Array.isArray(l.entries)) {
    problems.push("entries: an array");
    return { ok: false, problems };
  }
  l.entries.forEach((e, i) => {
    const at = `entries[${i}]`;
    if (e === null || typeof e !== "object") {
      problems.push(`${at}: not an object`);
      return;
    }
    if (!isText(e.tool)) problems.push(`${at}.tool: a non-empty string`);
    if (!(isAmount(e.cap_credits) && e.cap_credits > 0)) problems.push(`${at}.cap_credits: a positive number`);
    if (!ALL.has(e.status)) problems.push(`${at}.status: one of ${[...ALL].join(", ")}`);
    if (e.status === "settled" && !isAmount(e.charged_credits)) {
      problems.push(`${at}.charged_credits: required once settled`);
    }
    if (e.charged_credits !== undefined && !isAmount(e.charged_credits)) {
      problems.push(`${at}.charged_credits: a non-negative number`);
    }
    if (isAmount(e.charged_credits) && isAmount(e.cap_credits) && e.charged_credits > e.cap_credits) {
      problems.push(`${at}.charged_credits: above its cap — report it, the cap was promised`);
    }
  });
  return problems.length > 0 ? { ok: false, problems } : { ok: true, ledger: l };
}

/** Totals of a validated ledger, in credits. */
export function summarize(ledger) {
  let charged = 0;
  let open = 0;
  const unresolved = [];
  for (const e of ledger.entries) {
    if (OPEN.has(e.status)) {
      open += milli(e.cap_credits);
      if (e.status !== "approved") unresolved.push(e);
    } else {
      charged += milli(e.charged_credits ?? 0);
    }
  }
  const committed = charged + open;
  return {
    approved_total_credits: ledger.approved_total_credits,
    charged_credits: credits(charged),
    open_caps_credits: credits(open),
    committed_credits: credits(committed),
    remaining_credits: credits(milli(ledger.approved_total_credits) - committed),
    unresolved,
  };
}

/**
 * May the next paid call start? `next` is `{ tool, cap_credits, scraper?, input_hash? }`.
 * Answers `{ ok: true, remaining_after }` or `{ ok: false, reason }`.
 */
export function checkNext(ledger, next) {
  if (!(isAmount(next.cap_credits) && next.cap_credits > 0)) {
    return { ok: false, reason: "every paid call needs a positive max_cost_credits" };
  }
  if (ledger.per_call_max_credits !== undefined && next.cap_credits > ledger.per_call_max_credits) {
    return {
      ok: false,
      reason: `cap ${next.cap_credits} is above the approved per-call limit ${ledger.per_call_max_credits}`,
    };
  }
  const twin = ledger.entries.find(
    (e) =>
      (e.status === "running" || e.status === "unknown") &&
      e.tool === next.tool &&
      (e.scraper ?? null) === (next.scraper ?? null) &&
      next.input_hash !== undefined &&
      e.input_hash === next.input_hash,
  );
  if (twin) {
    return {
      ok: false,
      reason: `an identical earlier call is ${twin.status}${twin.run_id ? ` (run ${twin.run_id})` : ""}: check its status first (web__get_scraper_run or web__list_scraper_runs) and never start it again blindly`,
    };
  }
  const totals = summarize(ledger);
  const remaining = milli(totals.remaining_credits) - milli(next.cap_credits);
  if (remaining < 0) {
    return {
      ok: false,
      reason: `cap ${next.cap_credits} does not fit: ${totals.remaining_credits} of ${ledger.approved_total_credits} approved credits remain (open caps count in full until settled)`,
    };
  }
  return { ok: true, remaining_after: credits(remaining) };
}
