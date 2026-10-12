# Vendor scrapers: what to expect

Scrapers in CoreSpeed's catalog read vendors' **public pages**. They are
third-party tools, not the vendors' official or licensed APIs. Their figures
are the vendor's estimates as shown publicly, and each vendor's metric is its
own: an Ahrefs Domain Rating and a Moz Domain Authority are different scales
and are never compared.

## Observed once, on 2026-10-12

These are field observations from single runs for one small domain. They are
not prices, guarantees or recommendations. Always rediscover the current
schema, charges and cap bounds with `web__get_scraper` before a run.

| Vendor | Scraper id | What came back | Charged on that run | Caveats |
| --- | --- | --- | --- | --- |
| Similarweb | `datascraperes/similarweb-website-scraper` | visit estimates for two domains | 3 credits | a small site is flagged small; some blocks were missing |
| Ahrefs | `datascraperes/bulk-domain-rating-checker` | a Domain Rating | 0.75 credits | Domain Rating only |
| Moz | `radeance/moz-scraper` | Domain Authority, Page Authority, spam score | 22.5 credits | backlink fields came back 0: unverified, treat as missing |
| Ubersuggest | `radeance/ubersuggest-scraper` | a US overview: organic traffic and keyword estimates, links and referring domains | 16.5 credits | `last_updated` conflicted with the traffic history, so freshness is uncertain |
| Semrush | `lightmoon/website-traffic-checker` | an empty result | 0.075 credits (the start fee only) | a run can charge its start fee and return nothing |

The scraper results themselves are not stored in this repository.

## How to use them

- **One vendor per comparison.** Save each vendor's figures as its own metric
  snapshot (`source` = the scraper id), and compare only with that same
  source.
- **Minimal inputs.** Turn off a scraper's optional sections the task does not
  need. Defaults often add records, and each record is billed.
- **Small sites.** Vendors may have little or no data for a small or new
  domain. Expect "no data" and say so.
- **Conflicting fields.** When a value conflicts with the same response's
  history or date, report both and mark the figure low confidence.
