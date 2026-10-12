# Tools: roles and the current adapter

The skill names **roles**; this table maps each role to the tool that plays it
today. To use another provider, change this table, not the skill. Always
confirm a tool against `tools/list` before you rely on it.

| Role | CoreSpeed tool today | Status | Cost |
| --- | --- | --- | --- |
| Read one public page | your client's own fetch tool, or `web__scrape` | live | client fetch: your client's terms; `web__scrape`: billed, see its description |
| Search the web | `web__search` | live | billed, see its description |
| Find a scraper | `web__list_scrapers` | live | free |
| Inspect a scraper: input, charges, cap bounds | `web__get_scraper` | live | free |
| Run a scraper | `web__run_scraper` with `max_cost_credits` | live where the catalog is enabled for the org | billed per run, never above `max_cost_credits` |
| Read a run's status and results | `web__get_scraper_run`, `web__list_scraper_runs` | live | free |
| Stop a run | `web__cancel_scraper_run` | live | what it recorded is billed |
| Write to the site | `webflow__*`, `contentful__*` | live once the user connects them | the user's CMS |
| Wait for a held write's approval | `manage__approval_wait` | live | free |
| Managed SEO data | `seo__*` | optional: only if listed | billed per call |
| Owned-site search data | `google-search-console__*` | optional: only if listed | free (the user's own data) |
| Owned-site analytics | `google-analytics__*` | optional: only if listed | free (the user's own data) |

Notes:

- The scraper catalog is curated and changes. A scraper listed yesterday may
  not be offered today; `web__get_scraper` says so.
- `web__get_scraper` returns the smallest and largest cap the run accepts. A
  run with no row limit in its input can need a high minimum cap, even when
  the expected cost is small. Show both to the user.
