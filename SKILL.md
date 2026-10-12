---
name: corespeed-seo
description: Audit and grow a site's organic search with CoreSpeed — technical and on-page audit from public pages, competitor and vendor metrics through approved, capped scraper runs, keyword and backlink comparison, a prioritized action plan, user-approved fixes through a connected CMS with a recheck, and repeatable rank or metric reports. Use when the user asks for an SEO audit, "why did traffic drop", keyword, competitor or backlink research, rank tracking, or to fix SEO issues on their site.
metadata:
  version: "1"
---

# CoreSpeed for SEO

You work through CoreSpeed's MCP server (`https://api.corespeed.io/mcp`). If
it is not connected, follow the CoreSpeed setup skill
(https://corespeed.io/SKILL.md) first.

Three rules come before everything else:

1. **Say where every number came from**: source, date, geography, device.
2. **Spend only what the user approved**, one capped call at a time.
3. **Change nothing on the site** without the user's explicit approval of
   that change.

## 1. Check what is available

Read `tools/list`. Map what you find onto the roles in
[references/tools.md](references/tools.md). Never assume a tool exists
because a document mentions it.

- **Available today on CoreSpeed:**
  - `web__scrape` / `web__search` for public pages;
  - the scraper catalog: `web__list_scrapers`, `web__get_scraper`,
    `web__run_scraper`, `web__get_scraper_run`, `web__list_scraper_runs`;
  - CMS connectors such as `webflow__*` and `contentful__*` once the user
    connects them.
- **Optional upgrades, only if listed:**
  - `seo__*` (managed SEO data);
  - `google-search-console__*` and `google-analytics__*` (the user's own site
    data on their Google sign-in).
  If they are not in `tools/list`, say they are not available and continue
  without them. Do not ask the user to buy a vendor key.

## 2. Read the price before you spend

- **Free first.** Use free page retrieval where it exists: your own client's
  fetch or browser tool, or a connected tool whose description says it is
  free. `web__list_scrapers` and `web__get_scraper` are free.
- **CoreSpeed's `web__scrape` and `web__search` are billed.** Read the cost
  line in their descriptions and include them in the budget. Never call web
  scraping free unless the tool's own description says so.
- **Scraper runs are billed per run.** Before any run:
  1. Call `web__get_scraper` for its current input schema, charges and the
     smallest and largest cap. Prices change; never reuse an old figure.
  2. Show the user the scraper id, the exact input, the expected cost and the
     cap (`max_cost_credits`), and get approval for that cap and the running
     total.
  3. Check the ledger: `node scripts/seo-skill.mjs budget check ledger.json
     --tool web__run_scraper --scraper <id> --cap <n> --input input.json`.
  4. Run it once with `max_cost_credits`. Record it in the ledger.
- **Never repeat a paid call to retry it.** If a start's outcome is unclear,
  check `web__get_scraper_run` / `web__list_scraper_runs` first. A failed run
  is not charged and says so.
- **On a balance or limit refusal, stop** and tell the user.

The full rules are in [references/budget.md](references/budget.md).

## 3. Keep every number honest

- **Source, date, geography and device** go with every figure.
- **Different measures never add up or stand in for one another:**
  - a scraped vendor estimate is not analytics;
  - one vendor's Domain Rating is not another's Domain Authority;
  - a Search Console click is not a GA4 session.
- **Missing is not zero.** "No data", "not measured", an empty result, or a
  keyword missing from a snapshot is missing. Write it that way.
- **Label low confidence:** a small site's estimate, one live check, a field
  that conflicts with its own history, or a figure you cannot verify.
- **Scraped is not licensed.** Scrapers read vendors' public pages; they are
  not the vendors' official APIs.

See [references/data-sources.md](references/data-sources.md) and
[references/scrapers.md](references/scrapers.md).

## 4. Diagnose → recommend (the one-prompt audit)

For "audit example.com", run these phases. Write the report with
[references/templates.md](references/templates.md).

1. **Technical and on-page.**
   - Read the robots.txt and sitemap.xml, and fetch the key pages.
   - Check the status, redirects, title, meta description, H1, canonical,
     robots and noindex, hreflang, structured data and internal links.
   - Count issues by type, with example URLs.
2. **Search presence.** With approval, run a SERP scraper for the user's key
   queries in one country, device and language. Record the positions as a
   rank snapshot.
3. **Competitors and content gaps.** List who ranks for those queries.
   Compare the topics they cover against the site's pages.
4. **Vendor metrics** (optional, approved and capped):
   - Domain Rating, Domain Authority, traffic and backlink estimates from
     scrapers of vendors' public pages;
   - one vendor per comparison, recorded as a metric snapshot.
5. **Owned-site data** (only if the Google connectors are listed): Search
   Console clicks and queries, GA4 sessions by channel, over equal windows.
6. **Action plan.** Rank actions by impact × confidence ÷ effort. Each action
   names its evidence and says whether the connected CMS can apply it.

## 5. Remediate only with explicit approval, then recheck

Follow [references/remediation.md](references/remediation.md):

1. **Propose** an exact change set: page, field, current value, new value,
   why.
2. **Ask** for approval of named items. Only an explicit "yes" counts.
3. **Apply** only those items through the connected CMS, as drafts where the
   CMS allows. If CoreSpeed holds a write for approval, wait for it.
4. **Recheck** the live page, and note which effects take weeks to show.

## 6. Repeatable reports

Save each observation as a snapshot. Compare two snapshots offline, at no
cost and with no network:

```bash
node scripts/seo-skill.mjs validate current.json
node scripts/seo-skill.mjs diff previous.json current.json   # Markdown; --json for data
```

The diff refuses to compare snapshots that measure different things (another
source, measurement, site, geography, device, engine, language or depth). See
[references/rank-tracking.md](references/rank-tracking.md) for the snapshot
format and a per-run prompt for a scheduler the user already has. Do not
create a recurring job unless the user asks for one.
