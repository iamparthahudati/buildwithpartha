import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Checkbox, VisuallyHidden } from "@components/ui";
import "./table.css";

/**
 * Table primitives (LOS-0423).
 *
 * Real `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` — never `role="grid"`.
 * A grid is a spreadsheet-like editable surface with its own required
 * arrow-key navigation contract (ARIA APG "Grid"); nothing this ticket
 * describes needs that. A plain table already gives keyboard users the only
 * navigation model they actually need: Tab moves between the real
 * interactive controls a row contains (a selection `Checkbox`, an action
 * button), in reading order, exactly like everywhere else on the page. A
 * screen reader's own table-navigation commands (e.g. a rotor or Ctrl+Alt+
 * arrows) read the structure `scope="col"`/`scope="row"` and `aria-sort`
 * already provide, for free, on real table markup. Building a role="grid"
 * arrow-key system on top would be strictly more code for strictly worse
 * accessibility than the platform already gives a real `<table>`.
 *
 * `DataTable` (LOS-0424) is the component that will compose these primitives
 * with query state, filters, sorting, pagination, selection and — per its
 * own ticket — a *responsive card renderer*, since deciding what a row
 * becomes as a card needs domain knowledge these primitives deliberately do
 * not have. What `Table` supplies here for "responsive" is the honest,
 * domain-free floor every table needs regardless: the table scrolls
 * horizontally rather than being crushed into a broken layout.
 */

export type TableDensity = "compact" | "comfortable";

export interface TableProps {
  readonly children: ReactNode;
  readonly density?: TableDensity;
  /** A visually hidden description of what the table contains, e.g. "Tasks". */
  readonly caption?: string;
  readonly className?: string;
}

export function Table({ children, density = "comfortable", caption, className }: TableProps) {
  return (
    <div className="lifeos-table-scroll">
      <table
        data-density={density}
        className={["lifeos-table", className].filter(Boolean).join(" ")}
      >
        {caption ? (
          <caption>
            <VisuallyHidden>{caption}</VisuallyHidden>
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}

export interface TableHeadProps {
  readonly children: ReactNode;
  /** Pins the header to the top of the table's own scroll container. */
  readonly sticky?: boolean;
  readonly className?: string;
}

export function TableHead({ children, sticky = false, className }: TableHeadProps) {
  return (
    <thead
      className={["lifeos-table__head", sticky && "is-sticky", className].filter(Boolean).join(" ")}
    >
      {children}
    </thead>
  );
}

export interface TableBodyProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

export interface TableRowProps extends Omit<ComponentPropsWithoutRef<"tr">, "className"> {
  readonly children: ReactNode;
  readonly selected?: boolean;
  readonly className?: string;
}

export function TableRow({ children, selected = false, className, ...rest }: TableRowProps) {
  return (
    <tr
      {...rest}
      aria-selected={selected || undefined}
      className={["lifeos-table__row", selected && "is-selected", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </tr>
  );
}

export interface TableHeaderCellProps extends Omit<
  ComponentPropsWithoutRef<"th">,
  "className" | "scope"
> {
  readonly children: ReactNode;
  readonly scope?: "col" | "row";
  readonly sortDirection?: "ascending" | "descending" | "none";
  readonly className?: string;
}

export function TableHeaderCell({
  children,
  scope = "col",
  sortDirection,
  className,
  ...rest
}: TableHeaderCellProps) {
  return (
    <th
      {...rest}
      scope={scope}
      {...(sortDirection ? { "aria-sort": sortDirection } : {})}
      className={["lifeos-table__header-cell", className].filter(Boolean).join(" ")}
    >
      {children}
    </th>
  );
}

export interface TableCellProps extends Omit<ComponentPropsWithoutRef<"td">, "className"> {
  readonly children: ReactNode;
  /** Clamps to one line with an ellipsis rather than wrapping or overflowing. */
  readonly truncate?: boolean;
  readonly className?: string;
}

export function TableCell({ children, truncate = false, className, ...rest }: TableCellProps) {
  return (
    <td
      {...rest}
      className={["lifeos-table__cell", truncate && "lifeos-table__cell--truncate", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}

export interface TableSelectAllCellProps {
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label?: string;
}

export function TableSelectAllCell({
  checked,
  indeterminate = false,
  onChange,
  label = "Select all rows",
}: TableSelectAllCellProps) {
  return (
    <th scope="col" className="lifeos-table__header-cell lifeos-table__select-cell">
      <Checkbox
        label={label}
        checked={checked}
        indeterminate={indeterminate}
        onChange={(event) => onChange(event.target.checked)}
      />
    </th>
  );
}

export interface TableSelectCellProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  /** Names the row, e.g. "Select Website refresh" — never a bare "Select". */
  readonly label: string;
}

export function TableSelectCell({ checked, onChange, label }: TableSelectCellProps) {
  return (
    <td className="lifeos-table__cell lifeos-table__select-cell">
      <Checkbox
        label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </td>
  );
}
