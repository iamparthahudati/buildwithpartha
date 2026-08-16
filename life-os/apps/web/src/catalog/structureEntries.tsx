import {
  Badge,
  Button,
  DividerList,
  DividerListItem,
  IconButton,
  Logo,
  Surface,
  Text,
  Tooltip,
  VisuallyHidden,
} from "@components/ui";
import { Archive, Pencil } from "lucide-react";

import { AnnouncerDemo } from "./StructureDemos";

import type { CatalogEntry } from "./registry";

/* Tooltip, accessibility helpers, identity and container entries (LOS-0326 to LOS-0330). */

export const STRUCTURE_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "tooltip",
    name: "Tooltip",
    group: "Atoms",
    summary:
      "Supplementary only. Invisible on touch, absent from print, gone the moment the pointer moves — so nothing the user needs in order to act may live here alone.",
    states: [
      {
        id: "tooltip-triggers",
        name: "Hover and focus",
        description:
          "Hover waits, so a pointer crossing a toolbar does not flash five tooltips. Focus opens at once.",
        render: () => (
          <div className="specimen-row">
            <Tooltip content="Archives the project and keeps its tasks">
              <IconButton icon={Archive} label="Archive project" variant="ghost" />
            </Tooltip>
            <Tooltip content="Rename this project">
              <IconButton icon={Pencil} label="Rename project" variant="ghost" />
            </Tooltip>
            <Tooltip content="Opens below when there is no room above" placement="bottom">
              <Button variant="secondary">Below</Button>
            </Tooltip>
          </div>
        ),
      },
      {
        id: "tooltip-dismissal",
        name: "Escape",
        description:
          "Escape closes it and keeps it closed while the pointer is still on the control, or the dismissal would mean nothing.",
        render: () => (
          <Tooltip content="Press Escape to dismiss this">
            <Button variant="secondary">Focus me, then press Escape</Button>
          </Tooltip>
        ),
      },
    ],
  },
  {
    id: "visually-hidden",
    name: "VisuallyHidden and LiveRegion",
    group: "Atoms",
    summary:
      "Text for assistive technology only, and status messages that cannot be spammed. The live region is always present, because one that appears with its text often goes unannounced.",
    states: [
      {
        id: "visually-hidden-text",
        name: "Hidden text",
        description:
          "Clipped out of flow rather than hidden, so it stays in the accessibility tree. It takes no space — the two lines below sit flush.",
        render: () => (
          <div className="specimen-stack">
            <Text>
              Overdue
              <VisuallyHidden> — 3 tasks past their due date</VisuallyHidden>
            </Text>
            <Text>The line above carries hidden context that is never painted.</Text>
          </div>
        ),
      },
      {
        id: "live-region-throttle",
        name: "Announcement throttling",
        description:
          "A burst of updates is coalesced: the user hears where things ended up, not every step on the way.",
        render: () => <AnnouncerDemo />,
      },
    ],
  },
  {
    id: "logo",
    name: "Logo",
    group: "Atoms",
    summary:
      "Original LifeOS marks drawn in currentColor and sized in em, so they inherit the colour and size of whatever names them.",
    states: [
      {
        id: "logo-variants",
        name: "Variants",
        description: "Lockup, wordmark and the bare symbol for places too narrow for the name.",
        render: () => (
          <div className="specimen-stack">
            <Logo variant="lockup" />
            <Logo variant="wordmark" />
            <Logo variant="symbol" label="LifeOS home" />
          </div>
        ),
      },
      {
        id: "logo-sizes",
        name: "Sizes",
        description: "Three steps; the mark and the name can never drift out of proportion.",
        render: () => (
          <div className="specimen-stack">
            <Logo size="sm" />
            <Logo size="md" />
            <Logo size="lg" />
          </div>
        ),
      },
    ],
  },
  {
    id: "surface",
    name: "Surface",
    group: "Atoms",
    summary:
      "The card primitive: background, border, radius, elevation and padding, and no layout of its own.",
    states: [
      {
        id: "surface-tones",
        name: "Tones and padding",
        description:
          "A raised surface keeps its border, because a shadow disappears at high contrast.",
        render: () => (
          <div className="specimen-stack">
            <Surface>Default surface</Surface>
            <Surface tone="muted">Muted surface</Surface>
            <Surface tone="raised">Raised surface</Surface>
            <Surface padding="sm" tone="muted">
              Compact padding
            </Surface>
          </div>
        ),
      },
      {
        id: "surface-titled",
        name: "Titled section",
        description:
          "A section takes its accessible name from its own heading; without a title it stays a plain div, because an unnamed landmark is worse than none.",
        render: () => (
          <Surface
            as="section"
            title="Today's tasks"
            titleAction={<Badge tone="info">3 open</Badge>}
          >
            <Text tone="secondary">Three tasks are due today.</Text>
          </Surface>
        ),
      },
      {
        id: "surface-interactive",
        name: "Interactive",
        description:
          "The card follows the focus of the real control inside it rather than becoming a second tab stop.",
        render: () => (
          <Surface interactive title="Portfolio refresh">
            <Button variant="link">Open project</Button>
          </Surface>
        ),
      },
    ],
  },
  {
    id: "divider-list",
    name: "DividerList",
    group: "Atoms",
    summary:
      "Rows separated by a border on each row rather than an element between them, so the list stays valid and its item count stays truthful.",
    states: [
      {
        id: "divider-list-list",
        name: "As a list",
        description: "A real list, so “how many are there” is answerable for free.",
        render: () => (
          <Surface padding="sm">
            <DividerList label="Today's tasks">
              <DividerListItem interactive>Prepare weekly review</DividerListItem>
              <DividerListItem interactive>Compare hosting options</DividerListItem>
              <DividerListItem interactive>Organize tax documents</DividerListItem>
            </DividerList>
          </Surface>
        ),
      },
      {
        id: "divider-list-group",
        name: "As a group",
        description:
          "Unrelated rows are a group, not a list: claiming a count would be a small lie.",
        render: () => (
          <Surface padding="sm">
            <DividerList as="div" label="Notification settings" density="sm">
              <DividerListItem>Email reminders</DividerListItem>
              <DividerListItem>Weekly summary</DividerListItem>
            </DividerList>
          </Surface>
        ),
      },
    ],
  },
]);
