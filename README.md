# CoreSpeed for SEO — agent skill

An agent skill that audits and grows a site's organic search through
CoreSpeed's MCP server. It covers:

- a technical and on-page audit from public pages;
- competitor and vendor metrics through approved, capped scraper runs;
- a prioritized action plan;
- user-approved fixes through a connected CMS, then a recheck;
- repeatable rank and metric reports.

**Status:** prepared for publication. No license has been chosen yet; until
one is added, all rights are reserved.

Repository: [corespeed-io/seo-skill](https://github.com/corespeed-io/seo-skill).

Maintained by CoreSpeed. Co-author: He (Milton) Yan
([@MiltonHeYan](https://github.com/MiltonHeYan)).

## Contents

| Path | What |
| --- | --- |
| `SKILL.md` | The skill an agent loads |
| `references/` | Tools and their status, budget rules, scraper notes, data meanings, report templates, remediation, snapshots |
| `scripts/seo-skill.mjs` | Offline helpers: validate, diff, budget ledger, input hash |
| `examples/` | Synthetic example.com snapshots, a ledger and a scraper input |
| `tests/` | Offline tests for the scripts and the documents |
| `PROVENANCE.md` | Where every file came from, and what was left out |

## Use

Install the skill in an agent that reads `SKILL.md` files, with CoreSpeed's
MCP server connected (`https://api.corespeed.io/mcp`).

The scripts need Node.js 18 or later, no packages and no network:

```bash
node scripts/seo-skill.mjs validate examples/rank-current.json
node scripts/seo-skill.mjs diff examples/rank-previous.json examples/rank-current.json
node scripts/seo-skill.mjs budget check examples/ledger.json --tool web__run_scraper --cap 10
npm test        # or: node --test tests/*.test.mjs
```

## What it needs and what it does not

- **Needs:**
  - a CoreSpeed account with the MCP server connected;
  - `web__scrape` / `web__search` (billed per call);
  - the scraper catalog: `web__list_scrapers`, `web__get_scraper`,
    `web__run_scraper`, `web__get_scraper_run`;
  - for fixes, a connected CMS.
- **Uses when present:** `seo__*` (managed SEO data), and
  `google-search-console__*` / `google-analytics__*` (the user's own site
  data). None of these are required.
- **Never:**
  - spends without an approved, capped call;
  - repeats a paid call to retry it;
  - writes to a site without approval of the exact change.
