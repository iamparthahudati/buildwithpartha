import { Calendar, Check, ChevronDown, Flag, Plus, Trash2 } from "lucide-react";

import {
  Avatar,
  AvatarGroup,
  Badge,
  BADGE_TONES,
  Button,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Caption,
  CountBadge,
  DecorativeStatusDot,
  Heading,
  Icon,
  ICON_SIZES,
  IconButton,
  Link,
  Metric,
  PRIORITY_TONE,
  StatusDot,
  TASK_STATUS_TONE,
  Text,
  TruncatedText,
} from "@components/ui";

import type { CatalogEntry } from "./registry";

/*
 * Atom entries. Every state a component documents must appear here — that is
 * what makes the catalog the completeness check at LOS-0331 and LOS-0333.
 */

const LONG_PROJECT_NAME =
  "Website refresh — content audit, visual direction and the migration plan that follows it";

export const ATOM_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "icon",
    name: "Icon",
    group: "Atoms",
    summary:
      "The single wrapper around the approved icon set. Consumers pass the icon component itself, which keeps tree-shaking working.",
    states: [
      {
        id: "icon-sizes",
        name: "Sizes",
        description: "Named sizes in rem, so icons scale with the text they sit beside.",
        render: () => (
          <div className="specimen-row">
            {ICON_SIZES.map((size) => (
              <span key={size} className="specimen-measure">
                <Icon icon={Calendar} decorative size={size} />
                <code>{size}</code>
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "icon-decorative",
        name: "Decorative vs labelled",
        description:
          "A decorative icon is hidden from assistive technology because the text beside it already carries the meaning. A labelled icon is exposed as a named image.",
        render: () => (
          <div className="specimen-stack">
            <Text>
              <Icon icon={Check} decorative /> Saved — the icon is hidden; the word carries it.
            </Text>
            <Text>
              <Icon icon={Calendar} label="Due date" /> — the icon is named for assistive
              technology.
            </Text>
          </div>
        ),
      },
    ],
  },
  {
    id: "typography",
    name: "Typography",
    group: "Atoms",
    summary:
      "Heading, Text, Caption, Metric and TruncatedText. Visual size and semantic level are separate props, so the heading outline survives design changes.",
    states: [
      {
        id: "headings",
        name: "Headings",
        description: "Levels one through six at their default sizes.",
        render: () => (
          <div className="specimen-stack">
            {([1, 2, 3, 4, 5, 6] as const).map((level) => (
              <Heading key={level} level={level}>
                Heading level {level}
              </Heading>
            ))}
          </div>
        ),
      },
      {
        id: "size-vs-level",
        name: "Size independent of level",
        description:
          "Both of these are level two. Appearance never forces an author to break the outline.",
        render: () => (
          <div className="specimen-stack">
            <Heading level={2}>Level two, default size</Heading>
            <Heading level={2} size="xs">
              Level two, small size
            </Heading>
          </div>
        ),
      },
      {
        id: "text-tones",
        name: "Text tones",
        description: "Each tone passes AA against the surface it renders on.",
        render: () => (
          <div className="specimen-stack">
            <Text>Default copy</Text>
            <Text tone="secondary">Secondary copy</Text>
            <Text tone="muted">Muted copy</Text>
            <Text tone="danger">Something went wrong</Text>
            <Text tone="success">Saved</Text>
          </div>
        ),
      },
      {
        id: "numerals",
        name: "Numerals and metrics",
        description:
          "Tabular numerals keep a changing value from shifting width. A Metric pairs the number with a visible label.",
        render: () => (
          <div className="specimen-row">
            <Metric value="12">Tasks completed</Metric>
            <Metric value="04:32">Focus time today</Metric>
            <Caption numeric>2026-08-17</Caption>
          </div>
        ),
      },
      {
        id: "truncation",
        name: "Truncation",
        description:
          "The full string stays in the DOM and is only clipped visually, so screen readers and find-in-page still reach all of it.",
        render: () => (
          <div className="specimen-stack">
            <TruncatedText>{LONG_PROJECT_NAME}</TruncatedText>
            <TruncatedText lines={2}>{LONG_PROJECT_NAME}</TruncatedText>
          </div>
        ),
      },
    ],
  },
  {
    id: "button",
    name: "Button",
    group: "Atoms",
    summary:
      "A real button element in five variants and three sizes, with loading that preserves width and prevents a duplicate submit.",
    states: [
      {
        id: "button-variants",
        name: "Variants",
        description: "Primary, secondary, ghost, danger and link.",
        render: () => (
          <div className="specimen-row">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
        ),
      },
      {
        id: "button-sizes",
        name: "Sizes",
        description: "Small, medium and large. All grow to 44px on touch devices.",
        render: () => (
          <div className="specimen-row">
            {BUTTON_SIZES.map((size) => (
              <Button key={size} variant="secondary" size={size}>
                {size}
              </Button>
            ))}
          </div>
        ),
      },
      {
        id: "button-icons",
        name: "With icons",
        description: "Icon slots are decorative; the label alone names the control.",
        render: () => (
          <div className="specimen-row">
            <Button variant="primary" iconStart={Plus}>
              New project
            </Button>
            <Button variant="secondary" iconEnd={ChevronDown}>
              More actions
            </Button>
          </div>
        ),
      },
      {
        id: "button-states",
        name: "Disabled and loading",
        description:
          "A loading button keeps its width and its place in the tab order, and refuses a second activation.",
        render: () => (
          <div className="specimen-row">
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" loading loadingLabel="Saving">
              Save changes
            </Button>
            <Button variant="danger">Delete project</Button>
          </div>
        ),
      },
      {
        id: "button-full-width",
        name: "Full width",
        description: "For mobile action bars and dialog footers.",
        render: () => (
          <Button variant="primary" fullWidth>
            Continue
          </Button>
        ),
      },
    ],
  },
  {
    id: "icon-button",
    name: "IconButton",
    group: "Atoms",
    summary:
      "An icon-only control. The label prop is required, so a control without an accessible name is a type error rather than a review comment.",
    states: [
      {
        id: "icon-button-variants",
        name: "Variants and sizes",
        description: "Built on Button, so every variant, size and state carries over.",
        render: () => (
          <div className="specimen-row">
            {BUTTON_SIZES.map((size) => (
              <IconButton key={size} icon={Trash2} label={`Delete task (${size})`} size={size} />
            ))}
            <IconButton icon={Trash2} label="Delete task" variant="danger" />
            <IconButton icon={Plus} label="Add task" variant="secondary" />
          </div>
        ),
      },
      {
        id: "icon-button-states",
        name: "Disabled and loading",
        description: "The accessible name survives both states.",
        render: () => (
          <div className="specimen-row">
            <IconButton icon={Trash2} label="Delete task" disabled />
            <IconButton icon={Trash2} label="Delete task" loading loadingLabel="Deleting" />
          </div>
        ),
      },
    ],
  },
  {
    id: "link",
    name: "Link",
    group: "Atoms",
    summary:
      "Navigation only. Anything that acts without going somewhere is a Button with the link variant. There is no disabled link, because a disabled anchor is not a real thing.",
    states: [
      {
        id: "link-variants",
        name: "Variants",
        description: "Default, quiet for dense lists, and the current destination.",
        render: () => (
          <div className="specimen-row">
            <Link href="/life-os/app/tasks">Tasks</Link>
            <Link href="/life-os/app/tasks" quiet>
              Quiet link
            </Link>
            <Link href="/life-os/app/today" current>
              Today (current)
            </Link>
          </div>
        ),
      },
      {
        id: "link-external",
        name: "External",
        description:
          "Announces the change of context in words as well as by icon, and denies the opened page access to the opener.",
        render: () => (
          <Link href="https://example.test/help" external>
            Help centre
          </Link>
        ),
      },
    ],
  },
  {
    id: "badge",
    name: "Badge and StatusDot",
    group: "Atoms",
    summary:
      "Every badge renders text. Colour accompanies meaning and never carries it, so a status stays readable without colour perception.",
    states: [
      {
        id: "badge-tones",
        name: "Tones",
        description: "Each tone pairs an AA-passing text colour with its soft background.",
        render: () => (
          <div className="specimen-row">
            {BADGE_TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "badge-status",
        name: "Task status",
        description: "Canonical statuses, mapped from the product vocabulary rather than by hand.",
        render: () => (
          <div className="specimen-row">
            {Object.entries(TASK_STATUS_TONE).map(([status, tone]) => (
              <Badge key={status} tone={tone} dot>
                {status}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "badge-priority",
        name: "Priority",
        description: "P1 is the only priority that reads as urgent.",
        render: () => (
          <div className="specimen-row">
            {Object.entries(PRIORITY_TONE).map(([priority, tone]) => (
              <Badge key={priority} tone={tone} icon={Flag}>
                {priority}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "badge-dots-counts",
        name: "Dots and counts",
        description:
          "A standalone dot is named; a dot beside text that already says the status is silent. A count badge always names what it counts.",
        render: () => (
          <div className="specimen-row">
            <StatusDot tone="success" label="Done" />
            <span>
              <DecorativeStatusDot tone="info" /> In progress
            </span>
            <CountBadge count={3} label="unread notifications" />
            <CountBadge count={148} label="unread notifications" />
          </div>
        ),
      },
    ],
  },
  {
    id: "avatar",
    name: "Avatar",
    group: "Atoms",
    summary:
      "Image, initials and fallback states. The accent colour is derived from the name, so a person keeps the same colour everywhere without anything being stored.",
    states: [
      {
        id: "avatar-sizes",
        name: "Sizes and accents",
        description:
          "Different names resolve to different accents deterministically. Initials use code points, so an emoji or astral character is never split.",
        render: () => (
          <div className="specimen-row">
            {["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Alan Turing"].map((name) => (
              <Avatar key={name} name={name} size="lg" standalone />
            ))}
          </div>
        ),
      },
      {
        id: "avatar-fallback",
        name: "Broken image fallback",
        description:
          "A failed image falls back to initials rather than leaving a blank hole where a person should be.",
        render: () => (
          <div className="specimen-row">
            <Avatar name="Ada Lovelace" imageUrl="https://example.test/missing.png" standalone />
            <Avatar name="Ada Lovelace" standalone />
          </div>
        ),
      },
      {
        id: "avatar-group",
        name: "Group",
        description:
          "One accessible name for the whole group; announcing each face turns a glanceable summary into a long list.",
        render: () => (
          <AvatarGroup
            label="Assigned to"
            people={[
              { name: "Ada Lovelace" },
              { name: "Grace Hopper" },
              { name: "Katherine Johnson" },
              { name: "Alan Turing" },
              { name: "Barbara Liskov" },
            ]}
            max={3}
          />
        ),
      },
    ],
  },
]);
