# EPIC-03 — Design system foundations and atoms

Each component ticket includes typed props, isolated catalog example, keyboard/focus semantics, responsive/touch behavior, unit/accessibility tests, and documented states. Screen-specific business logic is forbidden.

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-0301 | Freeze design tokens | Implement semantic color, typography, spacing, radius, border, shadow, z-index, motion, breakpoint, density, and chart tokens. Contrast and 200% zoom pass; no raw palette values in components. | LOS-0110, LOS-0201 | M | Done |
| LOS-0302 | Add CSS reset and global foundations | Normalize box sizing/forms, body canvas/type, selection, focus-visible, reduced motion, high contrast hooks, and skip-link behavior without breaking native semantics. | LOS-0301 | S | Done |
| LOS-0303 | Create component catalog | Add development-only route/tool displaying components/states and viewport controls. Catalog is excluded/protected in production as decided. | LOS-0207, LOS-0302 | M | Done |
| LOS-0304 | Build Icon primitive | Wrap one approved icon set with size/stroke/decorative/accessibility rules. Tree-shaking works and icon-only usage requires a label at consuming control. | LOS-0301 | S | Done |
| LOS-0305 | Build Typography primitives | Heading, Text, Caption, Metric and TruncatedText honor semantic elements, tabular numbers, line limits, and accessible titles only when needed. | LOS-0301 | S | Done |
| LOS-0306 | Build Button | Primary/secondary/ghost/danger/link variants; sizes; icon slots; loading/disabled/focus/pressed states. Loading preserves width and prevents duplicate submit. | LOS-0304, LOS-0305 | S | Done |
| LOS-0307 | Build IconButton | Accessible name required; tooltip integration contract; 44px touch target on small screens; all Button states. | LOS-0306 | S | Done |
| LOS-0308 | Build Link | Internal/external/action-safe variants, current state, keyboard focus, external indication when useful. Disabled links are not fake anchors. | LOS-0305 | S | Done |
| LOS-0309 | Build Badge and StatusDot | Semantic status/priority/count variants include text/icon, optional dot, accessible color contrast. Color is never sole meaning. | LOS-0304, LOS-0305 | S | Done |
| LOS-0310 | Build Avatar | Image/initial/fallback/group states; alt/name behavior; deterministic accessible color; broken image fallback. | LOS-0305 | S | Done |
| LOS-0311 | Build Checkbox | Native semantics, indeterminate state, label/description/error/disabled, keyboard/touch behavior. | LOS-0302, LOS-0304 | S | Done |
| LOS-0312 | Build Radio and RadioGroup | Arrow-key group behavior through native semantics, label/description/error and horizontal/vertical layout. | LOS-0302 | S | Done |
| LOS-0313 | Build Switch | Boolean setting control with label, description, disabled/loading, immediate vs saved behavior contract. Not used for form submission when checkbox is clearer. | LOS-0302 | S | Done |
| LOS-0314 | Build TextInput | Label association contract, prefix/suffix, clear action, error/success/disabled/read-only/autofill, mobile keyboard hints, password-manager-safe attributes. | LOS-0302, LOS-0304 | S | Done |
| LOS-0315 | Build PasswordInput | TextInput composition with show/hide, Caps Lock hint, password-manager/autocomplete semantics, strength/help slot without exposing value. | LOS-0314 | S | Done |
| LOS-0316 | Build Textarea | Label/error/help, auto/fixed resize, character counter, long/Unicode input, preserved whitespace and disabled/read-only. | LOS-0314 | S | Done |
| LOS-0317 | Build Select | Native select first; labelled/error/placeholder/disabled. Custom listbox is deferred unless requirements prove native insufficient. | LOS-0314 | S | Done |
| LOS-0318 | Build DateInput | Local date input with parse/format boundary, min/max/error/clear states; never converts date-only value through UTC. | LOS-0314 | S | Done |
| LOS-0319 | Build TimeInput | Locale-friendly time entry with canonical value, step, clear/error/disabled and keyboard support. | LOS-0314 | S | Done |
| LOS-0320 | Build NumberInput | Numeric bounds/step, unit suffix, locale-aware display boundary, and no accidental wheel changes. | LOS-0314 | S | Done |
| LOS-0321 | Build ProgressBar | Label/value/max, indeterminate state, semantic status, no misleading animation, reduced-motion support. | LOS-0301, LOS-0305 | S | Done |
| LOS-0322 | Build ProgressRing | Accessible value/text, configurable size/thickness, zero/full handling, and CSS-driven rendering without duplicating analytics logic. | LOS-0321 | S | Done |
| LOS-0323 | Build Spinner | Labelled busy indicator with size variants and reduced motion. It never replaces meaningful loading copy by itself. | LOS-0301 | S | Done |
| LOS-0324 | Build Skeleton | Text/card/table shapes reserve space, are hidden from assistive technology, and stop animation under reduced motion. | LOS-0301 | S | Done |
| LOS-0325 | Build Divider | Horizontal/vertical decorative or semantic separator variants with correct role only when needed. | LOS-0301 | S | Done |
| LOS-0326 | Build Tooltip | Hover/focus delay, Escape close, noninteractive content, viewport collision, reduced motion. Essential information cannot exist only in tooltip. | LOS-0302 | S | Done |
| LOS-0327 | Build VisuallyHidden and live-region helpers | Provide accessible labels/status messaging with tests against accidental layout/focus issues and announcement spam. | LOS-0302 | S | Done |
| LOS-0328 | Build Logo and wordmark | Original LifeOS text mark and compact symbol placeholders; responsive sizes and accessible link label; no “One System” artifacts. | LOS-0301, LOS-0305 | S | Done |
| LOS-0329 | Build Surface/Card primitive | Bordered/default/muted/interactive states, semantic heading slot, padding/density variants, focus behavior for interactive cards. | LOS-0301 | S | Done |
| LOS-0330 | Build Divider-list primitive | Consistent row separators and spacing for dense lists without invalid list/table markup. | LOS-0325 | S | Done |
| LOS-0331 | Audit atom visual identity | Compare all atoms to LifeOS token contract and supplied reference patterns without copying identity/data. Record intentional differences. | LOS-0303–LOS-0330 | S | Done |
| LOS-0332 | Audit atom accessibility | Keyboard, axe, focus, zoom, contrast, touch target, forced colors, reduced motion. Fix all critical/serious issues. | LOS-0303–LOS-0330 | S | Done |
| LOS-0333 | Run atom phase gate | Catalog documents every state and checks pass on supported browsers/viewports; freeze public component APIs for composed work. | LOS-0331, LOS-0332 | S | Done |

