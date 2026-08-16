# LifeOS design system

## Principle

The design should feel focused, trustworthy, and information-rich. It borrows interaction patterns from the supplied references but uses the LifeOS name, original copy, neutral fixtures, and a responsive implementation.

All visible and accessible component language follows the [LifeOS content and tone guide](./30-CONTENT-AND-TONE-GUIDE.md).

## Foundation tokens

Define tokens before components. Initial semantic palette targets:

- canvas `#F7F9FC`, surface `#FFFFFF`, surface-muted `#F3F6FA`;
- text `#101828`, text-secondary `#475467`, text-muted `#667085`;
- border `#E4E7EC`, border-strong `#D0D5DD`;
- primary `#3157F5`, primary-hover `#2446D8`, primary-soft `#EEF2FF`;
- success `#12A150`, warning `#F79009`, danger `#F04438`, info `#2E90FA`, accent-purple `#7A5AF8`.

Final values must pass contrast tests and be frozen in the token ticket. Use semantic names in components—never raw hex values.

Typography: a modern sans-serif variable font or a tested system stack. Default body 16px, dense UI may use 14px, never below 12px. Use tabular numerals for durations, dates, metrics, and timers.

Spacing: 4px base with an 8px primary rhythm. Radius: 6/8/12/16px. Shadows are subtle and never the only boundary.

## Responsive layout

- Small: `<768px`, navigation drawer, single column, full-screen detail sheets, card-form dense tables.
- Medium: `768–1199px`, collapsible rail, two-column where content permits.
- Large: `>=1200px`, persistent 232–256px sidebar, top utilities, split details, dense tables.
- Content must remain usable at 320 CSS px and at 200% zoom.

## Component inventory and build order

Foundation -> Icon -> Typography -> Button/IconButton -> Link -> Badge/StatusDot -> Avatar -> Checkbox/Radio/Switch -> Input/Textarea/Select -> Date/Time input -> Progress -> Spinner/Skeleton -> Divider -> Tooltip -> Toast/Alert -> Card -> Tabs -> Menu -> Dialog/Drawer -> Pagination -> Table primitives -> Empty/Error state -> FormField -> SearchField -> MetricCard -> PageHeader -> FilterBar -> DataTable -> DetailPanel -> TimerRing -> TimeBlockRow -> ProjectRow -> TaskRow -> charts -> navigation -> app shell.

Every interactive component documents default, hover, active, focus-visible, disabled, loading, error, empty, and reduced-motion behavior when applicable.

## Accessibility contract

- WCAG 2.2 AA color contrast and keyboard operation.
- Visible `:focus-visible` ring; focus returns to the trigger after dialogs/drawers.
- Real labels and descriptions for form controls; errors linked with `aria-describedby`.
- Icon-only controls have accessible names and at least 44x44px touch targets on small screens.
- Tables retain headers/relationships; mobile card alternatives preserve labels.
- Charts include a text summary or data table.
- Timer updates do not announce every second; announce state transitions and completion.
- Respect `prefers-reduced-motion` and `prefers-contrast` where supported.

## Reference-to-LifeOS translation

- “One System” wordmark -> LifeOS wordmark.
- Example project/task names -> neutral LifeOS fixtures such as “Website refresh” or “Weekly planning”.
- The active Focus Session display remains a reusable global utility, but collapses on smaller viewports.
- Wide task/project tables become `DataTable` plus responsive record cards.
- Right-side details become `DetailPanel` on large screens and `Drawer`/route on small screens.
