# Budget rules for paid calls

## Before the first paid call

Agree two numbers with the user, in credits:

- **the total** for this task (`approved_total_credits`);
- **the most any one call may cost** (`per_call_max_credits`).

Start a ledger (`examples/ledger.json` shows the shape) and keep it with the
task's files.

## For each paid call

1. **Inspect** (free): `web__get_scraper` for a scraper; the tool's own
   description for any other paid tool. Read the current charges and the cap
   bounds. Do not reuse a price from memory or from these documents.
2. **Propose**: the tool, the scraper id, the exact input, the expected cost,
   and the cap you will pass as `max_cost_credits`. The cap is at least the
   smallest cap the scraper accepts and at most the per-call limit.
3. **Check**:

   ```bash
   node scripts/seo-skill.mjs budget check ledger.json \
     --tool web__run_scraper --scraper <author/name> --cap <credits> --input input.json
   ```

   - `OK` means the cap fits what remains, counting every open call at its
     full cap.
   - `Refused` means do not start it; tell the user why.
4. **Run once**, with `max_cost_credits` set. Add a ledger entry at once:
   - `status: "running"` and the `run_id`;
   - `input_hash`, from `node scripts/seo-skill.mjs hash input.json`.
5. **Settle the entry** when the run ends:
   - `settled`, with the `charged_credits` the run reports;
   - or `failed` / `released`.

## When something is unclear

- **The start timed out, or you lost the answer:** mark the entry `unknown`.
  Check `web__list_scraper_runs` or `web__get_scraper_run` before anything
  else. The ledger refuses an identical call while an earlier one is
  `running` or `unknown`.
- **A run failed:** it is not charged. Record it as `failed`. Ask the user
  before trying again: a new run is a new charge.
- **A run returned nothing:** a run that started may still charge its start
  fee. Record what it reports and say "no data", not 0.
- **A balance, spend-limit or cap refusal:** stop. Do not lower the input
  just to get under a limit without telling the user.

## What the cap promises

`max_cost_credits` is the most one run is charged; a run never bills above
it. It is not a budget for the task. The ledger's total is your own
accounting. The account-wide hard limits are the CoreSpeed wallet balance and
any spend limit on the API key.
