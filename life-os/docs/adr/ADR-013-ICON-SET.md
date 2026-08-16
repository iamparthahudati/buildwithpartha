# ADR-013 — Approved icon set

- Status: Accepted
- Date: 2026-08-17
- Owner: Partha
- Ticket(s): LOS-0304
- Supersedes: None
- Superseded by: None

## Context

LOS-0304 requires wrapping "one approved icon set". LifeOS needs a consistent stroke-style icon family covering navigation, tasks, calendar, focus, review, status and editing affordances across roughly 40 screens, and the wrapper must guarantee tree-shaking so a screen ships only the icons it renders.

This is also the first runtime dependency added since the bootstrap tickets, so it touches the dependency policy set in LOS-0203.

## Decision drivers

- Coverage wide enough that later screens do not stall on a missing glyph.
- Per-icon ES module exports, so bundling stays proportional to what is used.
- A permissive licence with no attribution burden inside the product UI.
- Consistent stroke geometry, matching the interaction patterns already documented.
- A single wrapper, so accessibility and sizing rules cannot be bypassed per call site.

## Options considered

### Option A — lucide-react

Around 1,500 icons, ISC licence, one ES module export per icon, actively maintained, consistent 24px stroke grid.

Cost: one runtime dependency and a `package-lock.json` change outside a dedicated dependency-update ticket.

### Option B — Heroicons

MIT, well made, but roughly 300 icons in two variants. The narrower set makes a missing glyph likely once product screens land, and filling gaps by mixing sets would break visual consistency.

### Option C — A LifeOS-owned SVG set

No third-party dependency, no supply-chain exposure, and complete control. Cost: every new icon needs its own ticket and hand-drawn geometry, which would slow the atom and screen epics substantially for a private single-owner product.

## Decision

Use **lucide-react**, pinned to the exact version `1.31.0`, as the only approved icon set. Consumers never import from it directly in product code; they pass the icon component to the `Icon` primitive, which owns sizing, stroke and accessibility behavior.

The licence is **ISC**, not MIT as initially assumed — permissive and functionally equivalent for this use, requiring only that the copyright notice be retained, which the distributed package does.

## Consequences

- Icons tree-shake per import, so bundle growth stays proportional to real usage. A string-keyed icon map is forbidden precisely because it would defeat this.
- `Icon` is the only place icon accessibility rules live. Decorative icons are hidden from assistive technology; a labelled icon is exposed as a named image; an icon-only control puts its name on the control, which `IconButton` enforces by making `label` required.
- The dependency was added with `--save-exact` and the lockfile updated inside this ticket rather than a dedicated dependency-update ticket. This deviates from the normal rule in LOS-0203; it is accepted here because the ticket's whole purpose is to approve and integrate this dependency. The weekly automated update proposals continue to cover it.
- Swapping icon sets later means changing the `Icon` wrapper and the per-icon imports at call sites, not the accessibility contract.
- One more third-party package is in the supply chain. It is pinned exactly, and `npm ci` plus the existing secret-scan and dependency-validation checks apply to it like any other.
