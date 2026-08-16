import { Calendar, Check, ChevronDown, Plus, Trash2 } from "lucide-react";

import {
  Button,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Caption,
  Heading,
  Icon,
  ICON_SIZES,
  IconButton,
  Metric,
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
]);
