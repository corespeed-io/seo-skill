# Data sources and what their numbers mean

| Source | Measures | Date | Geography | Device | Missing and confidence |
| --- | --- | --- | --- | --- | --- |
| A fetched public page | what the page serves now: status, tags, links | the moment of the fetch | not applicable | the fetcher's user agent | a blocked or failed fetch is "not fetched", not a pass |
| A SERP scraper | positions on one results page | the moment of the run | the country the input set | the device the input set | one check: low confidence for a trend; absent within the depth is "not ranking" |
| A vendor-metric scraper (Ahrefs, Moz, Semrush, Similarweb, Ubersuggest) | the vendor's public estimate: authority scores, traffic, backlinks | the vendor's own date, when the result has one | as the vendor states | usually not stated | a vendor estimate, not analytics; small sites often "no data"; a field that conflicts with its own history is low confidence |
| Search Console (optional) | the user's Google clicks, impressions, CTR, average position | the dates asked, Pacific Time, lagging 2–3 days | `country` filter or dimension | `device` filter or dimension | an absent row is no data; under 20 impressions is low confidence |
| GA4 (optional) | the user's sessions, users, conversions | the dates asked, the property's time zone | `country` and region dimensions | `deviceCategory` | sampling and thresholding show in the result; consent opt-outs are not counted |
| `seo__*` (optional) | managed SEO data; each result states its measurement | as the result states | as the result states | as the result states | `null` is missing, not zero |

Rules:

- **Never add or swap measures.** A vendor's traffic estimate, a GA4 session
  and a Search Console click are three different things.
- **One vendor per comparison.** An Ahrefs Domain Rating and a Moz Domain
  Authority are different scales.
- **Say what a missing source would have shown.** "Search Console not
  connected: owned-site clicks not available" beats a guess.
