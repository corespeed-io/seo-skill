# Provenance

Prepared on 2026-10-12 by an AI agent (Claude) working for He (Milton) Yan,
who is co-author on every commit:
`Co-authored-by: HeYan <105071431+MiltonHeYan@users.noreply.github.com>`.

## Where each file came from

| File | Origin |
| --- | --- |
| `SKILL.md` | Adapted and rewritten from an unpublished internal draft of CoreSpeed's SEO skill (October 2026), written by the same author pair. Retargeted from managed `seo__*` tools that are not live yet to the live public-page and scraper-catalog path. |
| `references/data-sources.md`, `templates.md`, `remediation.md`, `rank-tracking.md` | Adapted from the same draft's references; rewritten for the standalone path and this repository's scripts. |
| `references/tools.md`, `budget.md`, `scrapers.md` | New. `scrapers.md` records field observations from single scraper runs reported on 2026-10-12. It holds no result values. |
| `scripts/seo-skill.mjs`, `scripts/lib/*.mjs` | New, written for this repository: Node built-ins only, offline. Not copied from any CoreSpeed CLI or backend code. |
| `examples/*.json` | Synthetic data about example.com. No real user, vendor or run data. |
| `tests/*.test.mjs` | New. |
| `README.md`, `PROVENANCE.md`, `package.json` | New. |

## Runtime dependencies

- **CoreSpeed MCP server** (`https://api.corespeed.io/mcp`). The skill names
  the tool roles it relies on in `references/tools.md`.
- **Node.js 18 or later**, for the scripts only. No npm packages. No network
  calls.

## Deliberately not included

- Any CoreSpeed backend code: engines, billing, pricing, supplier clients,
  connectors, the CLI.
- Test fixtures derived from vendors' documentation.
- Raw results of any scraper or vendor call, or any user's data.
- Secrets, credentials or environment configuration.

## Open items

- No license yet. Without one, all rights are reserved, even if the repository is public.
- The vendor and product names are used only to identify their tools.
- Before any public release, review the scraper notes (third-party scrapers
  of vendors' public pages) and the observed charges.
