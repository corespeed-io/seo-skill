#!/usr/bin/env node
// seo-skill: offline helpers for the CoreSpeed for SEO skill. Node 18+, no
// dependencies, no network, nothing stored: it reads JSON files and prints.
//
//   validate <file.json>                         snapshot or budget ledger
//   diff <previous.json> <current.json>          compare two snapshots
//        [--json] [--large-move N] [--large-change-pct N] [--coverage-gap R]
//   budget summary <ledger.json> [--json]        what is charged, open, left
//   budget check <ledger.json> --tool T --cap N  may the next paid call start?
//        [--scraper ID] [--input input.json]
//   hash <input.json>                            the input hash a ledger keeps

import { readFileSync } from "node:fs";
import { checkNext, inputHash, LEDGER_SCHEMA, summarize, validateLedger } from "./lib/budget.mjs";
import { diffSnapshots, renderReport, SNAPSHOT_SCHEMA, validateSnapshot } from "./lib/snapshot.mjs";

export const USAGE = `Usage:
  seo-skill validate <file.json>
  seo-skill diff <previous.json> <current.json> [--json] [--large-move N] [--large-change-pct N] [--coverage-gap R]
  seo-skill budget summary <ledger.json> [--json]
  seo-skill budget check <ledger.json> --tool <tool> --cap <credits> [--scraper <id>] [--input <input.json>]
  seo-skill hash <input.json>
`;

function readJson(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { ok: false, error: `cannot read ${path}` };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: `${path} is not JSON` };
  }
}

function parseFlags(args) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") flags.set("json", "true");
    else if (arg.startsWith("--")) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) return null;
      flags.set(arg.slice(2), value);
      i++;
    } else positional.push(arg);
  }
  return { flags, positional };
}

const number = (raw) => {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Run one command; returns `{ code, stdout, stderr }` (exported for the tests). */
export function run(argv) {
  const [command, ...rest] = argv;
  const out = (stdout) => ({ code: 0, stdout, stderr: "" });
  const err = (stderr, code = 1) => ({ code, stdout: "", stderr });
  if (!command || command === "--help" || command === "-h") return out(USAGE);
  const parsed = parseFlags(command === "budget" ? rest.slice(1) : rest);
  if (parsed === null) return err(USAGE);
  const { flags, positional } = parsed;

  if (command === "validate") {
    if (positional.length !== 1) return err(USAGE);
    const read = readJson(positional[0]);
    if (!read.ok) return err(`Error: ${read.error}\n`);
    const schema = read.value?.schema;
    const checked =
      schema === LEDGER_SCHEMA ? validateLedger(read.value) : schema === SNAPSHOT_SCHEMA ? validateSnapshot(read.value) : null;
    if (checked === null) return err(`Error: unknown schema; expected ${SNAPSHOT_SCHEMA} or ${LEDGER_SCHEMA}\n`);
    return checked.ok ? out(`OK ${schema}\n`) : err(`Invalid ${schema}:\n${checked.problems.map((p) => `  ${p}`).join("\n")}\n`);
  }

  if (command === "diff") {
    if (positional.length !== 2) return err(USAGE);
    const snapshots = [];
    for (const path of positional) {
      const read = readJson(path);
      if (!read.ok) return err(`Error: ${read.error}\n`);
      const checked = validateSnapshot(read.value);
      if (!checked.ok) return err(`Error: ${path} is not a snapshot:\n${checked.problems.map((p) => `  ${p}`).join("\n")}\n`);
      snapshots.push(checked.snapshot);
    }
    const options = {
      largeMove: number(flags.get("large-move")),
      largeChangePct: number(flags.get("large-change-pct")),
      coverageGap: number(flags.get("coverage-gap")),
    };
    if (Object.values(options).includes(null)) return err(USAGE);
    for (const key of Object.keys(options)) if (options[key] === undefined) delete options[key];
    const diff = diffSnapshots(snapshots[0], snapshots[1], options);
    if (!diff.comparable) {
      return err(`Error: the snapshots measure different things, so they are not compared:\n${diff.reasons.map((r) => `  ${r}`).join("\n")}\n`);
    }
    return out(flags.has("json") ? `${JSON.stringify(diff, null, 2)}\n` : renderReport(diff));
  }

  if (command === "hash") {
    if (positional.length !== 1) return err(USAGE);
    const read = readJson(positional[0]);
    if (!read.ok) return err(`Error: ${read.error}\n`);
    return out(`${inputHash(read.value)}\n`);
  }

  if (command === "budget") {
    const sub = rest[0];
    if (positional.length !== 1) return err(USAGE);
    const read = readJson(positional[0]);
    if (!read.ok) return err(`Error: ${read.error}\n`);
    const checked = validateLedger(read.value);
    if (!checked.ok) return err(`Error: not a budget ledger:\n${checked.problems.map((p) => `  ${p}`).join("\n")}\n`);
    if (sub === "summary") {
      const totals = summarize(checked.ledger);
      if (flags.has("json")) return out(`${JSON.stringify(totals, null, 2)}\n`);
      const lines = [
        `Approved ${totals.approved_total_credits} · charged ${totals.charged_credits} · open caps ${totals.open_caps_credits} · remaining ${totals.remaining_credits} credits`,
        ...totals.unresolved.map((e) => `Unresolved: ${e.tool}${e.scraper ? ` ${e.scraper}` : ""} is ${e.status}${e.run_id ? ` (run ${e.run_id})` : ""}; check its status before any new paid call`),
      ];
      return out(`${lines.join("\n")}\n`);
    }
    if (sub === "check") {
      const tool = flags.get("tool");
      const cap = number(flags.get("cap"));
      if (!tool || cap === undefined || cap === null) return err(USAGE);
      let hash;
      const inputPath = flags.get("input");
      if (inputPath !== undefined) {
        const input = readJson(inputPath);
        if (!input.ok) return err(`Error: ${input.error}\n`);
        hash = inputHash(input.value);
      }
      const verdict = checkNext(checked.ledger, {
        tool,
        cap_credits: cap,
        ...(flags.has("scraper") && { scraper: flags.get("scraper") }),
        ...(hash !== undefined && { input_hash: hash }),
      });
      return verdict.ok
        ? out(`OK: start it with max_cost_credits ${cap}; ${verdict.remaining_after} credits remain after its cap\n`)
        : err(`Refused: ${verdict.reason}\n`);
    }
    return err(USAGE);
  }

  return err(`Unknown command: ${command}\n\n${USAGE}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = run(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code;
}
