# Remediation: propose → approve → apply → recheck

Never write to a website, CMS or business profile unless the user has
approved that exact change in this conversation.

## 1. Propose a change set

| # | Where (page / CMS entry) | Field | Current | Proposed | Why (evidence) |
| --- | --- | --- | --- | --- | --- |
| 1 | /guides/seo-audit (CMS page) | SEO title | "Guide" | "SEO Audit Checklist (2026) — Example" | position 3 → 9; the title lacks the query |

- Read the current value from the CMS first; never assume it.
- One field per row. A redirect, robots, canonical or noindex change is high
  risk; say so.

## 2. Ask for approval

Ask: "Approve all, some (list numbers), or none?" Only an explicit answer
naming the items counts. A general "go ahead with the audit" does not.
Silence does not count either.

## 3. Apply only the approved rows

- Use the connected CMS tool (for example `webflow__*` or `contentful__*`).
  Prefer a draft or staged change; publish only if publishing was approved.
- CoreSpeed may hold a write for a person to approve. Wait for it with
  `manage__approval_wait`. Never retry around a hold or a denial.
- Record each applied row: tool, entry or page id, time, result.

## 4. Recheck

- **Now:** fetch each changed page again and confirm the live page shows the
  new value. Report any row that did not take.
- **Days later:** the search engine has to recrawl. With the Search Console
  connector, inspect the URL; otherwise say this check is pending.
- **Weeks later:** compare positions with a new snapshot and
  `node scripts/seo-skill.mjs diff`.
