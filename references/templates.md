# Report templates

Keep reports short and lead with the answer. Every table carries its source
line. Write "no data" or "not measured" for gaps, never 0, and mark
low-confidence rows `(low confidence)`.

Source line, under every heading that shows numbers:

> Source: <tool or scraper id> · <measure> · <date or window, time zone> · <geography> · <device> · retrieved <date>

## SEO audit — <site>

**Bottom line:** <one or two sentences: the biggest problem and the biggest
opportunity>

### Technical and on-page (<n> issues)
| Issue | Pages | Example | Evidence |
| --- | --- | --- | --- |
| Missing meta description | 12 | /guides/x | fetched <date>, page HTML |

### Search presence (<country>, <device>, <language>)
| Query | Your position | Ranking URL | Top competitor |
| --- | --- | --- | --- |
> Source line. One live check per query: low confidence for a trend.

### Competitors and content gaps
| Topic | Queries | Who ranks | Your page | Gap |
| --- | --- | --- | --- | --- |

### Vendor metrics (one vendor per table)
| Domain | <metric> | <metric> | Note |
| --- | --- | --- | --- |
> Source: <scraper id> · the vendor's public estimate · <date>. Not
> comparable with another vendor's metric. Scraped, not licensed.

### Owned-site data (only when the Google connectors are connected)
| Query or page | Clicks | Δ | Position | Δ |
| --- | --- | --- | --- | --- |
> Search Console, <window, Pacific Time>, <country>, <device>. GA4 sessions go
> in their own table, never in these columns.

### Action plan
| # | Action | Why (evidence) | Impact | Confidence | Effort | Can apply via |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rewrite the title of /guides/x | position 3 → 9, live SERP, US, desktop, <date> | high | medium | low | Webflow (approval needed) |

### Not covered
<tools not available, data missing, low-confidence areas>

### Cost of this report
| Tool | Calls | Cap per call | Credits charged |
| --- | --- | --- | --- |
> From the ledger: approved <total>, charged <sum>, remaining <n>.

## Rank or metric report

Use `node scripts/seo-skill.mjs diff previous.json current.json`. It prints
the context line, the anomalies and every change, and keeps "not measured",
"not ranking" and "no figure" apart. Add one paragraph: what changed, what
may explain it, and the next step.
