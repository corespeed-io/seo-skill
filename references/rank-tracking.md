# Snapshots and repeatable reports

## The snapshot file (`seo-skill/snapshot/v1`)

A rank snapshot (`examples/rank-current.json`):

```json
{
  "schema": "seo-skill/snapshot/v1",
  "kind": "rank",
  "captured_at": "2026-10-12T08:00:00Z",
  "site": "example.com",
  "source": "web__run_scraper:<author/name>",
  "measurement": "live_serp_position",
  "geography": "US",
  "device": "desktop",
  "engine": "google",
  "language": "en",
  "depth": 20,
  "rows": [
    { "keyword": "seo audit checklist", "position": 9, "url": "https://www.example.com/blog/audit-checklist/" },
    { "keyword": "technical seo audit", "position": null, "url": null }
  ]
}
```

A metric snapshot (`examples/metric-current.json`) has `"kind": "metric"` and
rows like `{ "metric": "domain_rating", "value": 32, "unit": "0-100" }`.

- `position: null` means checked and not ranking within `depth`. A keyword left
  out of `rows` was not measured.
- `value: null` means the source was asked and had no figure.
- `source` names the tool and, for a scraper, its id. Two snapshots compare
  only when `kind`, `site`, `source`, `measurement`, `geography`, `device`,
  `engine`, `language` and `depth` all match.

Commands (Node 18+, no dependencies, offline):

```bash
node scripts/seo-skill.mjs validate current.json
node scripts/seo-skill.mjs diff previous.json current.json [--json] [--large-move 5] [--large-change-pct 25] [--coverage-gap 0.2]
```

The diff flags drop-outs, page-one exits, large moves, ranking-URL changes,
lost figures, large metric changes and coverage gaps.

## The per-run prompt (schedule-ready)

Use this as the prompt of a recurring job in a scheduler the user already
has (a scheduled agent routine, Claude Code `/schedule`, or cron calling an
agent). Create the job only when the user asks.

> Report for {site}. Read the previous snapshot and the ledger from {store}.
> For {queries or metrics}, inspect {scraper} with web__get_scraper; if its
> price or cap bounds changed, stop and ask. Check the ledger
> (`budget check`), then run it once with max_cost_credits {call_cap}, in
> {geography}, {device}, {language}. If a start is unclear, check
> web__list_scraper_runs instead of starting again. Write the new snapshot
> with the same settings and run `diff`. Save the snapshot and the updated
> ledger to {store}. Post the report to {destination}, high-severity
> anomalies first. If the diff refuses the comparison, report why. Do not
> change the site.

Agree with the user:
- `site` and the queries or metrics;
- the scraper, `geography`, `device`, `language` and the cadence;
- `call_cap` and the ledger's total for the period;
- `store`: where snapshots and the ledger live between runs, such as a
  Drive file or a repository;
- `destination`: chat, email or a channel.
