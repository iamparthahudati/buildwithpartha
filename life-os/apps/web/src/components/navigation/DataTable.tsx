import type { ReactNode } from "react";

import { EmptyState, ErrorState, type EmptyStateVariant } from "@components/feedback";
import { Button, LiveRegion, Skeleton, Text } from "@components/ui";

import { FilterBar, type ActiveFilterChip } from "./FilterBar";
import { Pagination } from "./Pagination";
import { SortControl, type SortOption, type SortState } from "./SortControl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSelectAllCell,
  TableSelectCell,
  type TableDensity,
} from "./Table";
import "./data-table.css";

/**
 * DataTable (LOS-0424).
 *
 * The composition, not a ninth primitive: everything here is `FilterBar`
 * (LOS-0420), `SortControl` (LOS-0422), `Pagination` (LOS-0421), the `Table`
 * primitives (LOS-0423), `EmptyState`/`ErrorState` (LOS-0410/0411) wired
 * together, fully controlled by the caller exactly like each of those
 * already is on its own — `DataTable` owns no query state of its own to
 * "compose"; the composition *is* the query state living in one caller's
 * component instead of five.
 *
 * `columns: readonly DataTableColumn<T>[]` and `rows: readonly T[]` make
 * this component generic over the row type, so nothing about a Task, a
 * Project or any other record is hardcoded here — the "no domain columns
 * hardcoded" principle the ticket states directly, the same one `FilterBar`
 * and `PageHeader` already apply to their own caller-supplied slots.
 *
 * Column headers are not themselves clickable to sort. `SortControl`
 * already owns that interaction; giving `DataTable` a second, competing
 * sort trigger (a clickable header) would be two ways to do the same thing
 * rather than one composition reusing the other. A column's header still
 * carries the real `aria-sort` state when `sort` names it as the active
 * field, so the semantics are correct even though the interaction lives
 * elsewhere.
 */

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  readonly truncate?: boolean;
}

export type DataTableStatus =
  | { readonly type: "ready" }
  | { readonly type: "loading" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface DataTableFiltersConfig {
  readonly controls: ReactNode;
  readonly activeChips?: readonly ActiveFilterChip[];
  readonly onClearAll?: () => void;
  readonly resultCount?: string;
}

export interface DataTableSortConfig {
  readonly options: readonly SortOption[];
  readonly value: SortState;
  readonly onChange: (value: SortState) => void;
}

export interface DataTablePaginationConfig {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}

export interface DataTableSelectionConfig {
  readonly selectedIds: ReadonlySet<string>;
  readonly onSelectedIdsChange: (ids: ReadonlySet<string>) => void;
  /** Rendered in the bulk-action toolbar once at least one row is selected. */
  readonly bulkActions?: ReactNode;
}

export interface DataTableProps<T> {
  /** The table's accessible name, e.g. "Tasks". */
  readonly label: string;
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly getRowId: (row: T) => string;
  /**
   * Names a row for its selection checkbox's accessible name, e.g.
   * `(task) => task.title`. Falls back to the row's id, which is legible
   * but not ideal — supply this whenever rows have a real display name.
   */
  readonly getRowLabel?: (row: T) => string;
  readonly status?: DataTableStatus;
  /** Shown when `rows` is empty and `status` is `"ready"`. Never invented here. */
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly emptyVariant?: EmptyStateVariant;
  readonly filters?: DataTableFiltersConfig;
  readonly sort?: DataTableSortConfig;
  readonly pagination?: DataTablePaginationConfig;
  readonly selection?: DataTableSelectionConfig;
  /** Renders each row as a card below the small breakpoint instead of a table row. */
  readonly renderCard?: (row: T) => ReactNode;
  readonly density?: TableDensity;
  readonly className?: string;
}

const LOADING_ROW_COUNT = 5;

export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  getRowLabel,
  status = { type: "ready" },
  emptyTitle,
  emptyDescription,
  emptyVariant = "filtered",
  filters,
  sort,
  pagination,
  selection,
  renderCard,
  density = "comfortable",
  className,
}: DataTableProps<T>) {
  const selectedCount = selection?.selectedIds.size ?? 0;
  const pageRowIds = rows.map(getRowId);
  const allSelected =
    selection !== undefined &&
    pageRowIds.length > 0 &&
    pageRowIds.every((id) => selection.selectedIds.has(id));
  const someSelected = selectedCount > 0 && !allSelected;

  function toggleRow(id: string, checked: boolean) {
    if (!selection) {
      return;
    }
    const next = new Set(selection.selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    selection.onSelectedIdsChange(next);
  }

  function toggleAll(checked: boolean) {
    if (!selection) {
      return;
    }
    const next = new Set(selection.selectedIds);
    for (const id of pageRowIds) {
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    selection.onSelectedIdsChange(next);
  }

  const sortControl = sort ? (
    <SortControl options={sort.options} value={sort.value} onChange={sort.onChange} />
  ) : null;

  const toolbar = filters ? (
    <FilterBar
      {...(filters.activeChips !== undefined ? { activeChips: filters.activeChips } : {})}
      {...(filters.resultCount !== undefined ? { resultCount: filters.resultCount } : {})}
      {...(filters.onClearAll !== undefined ? { onClearAll: filters.onClearAll } : {})}
    >
      {filters.controls}
      {sortControl}
    </FilterBar>
  ) : sortControl ? (
    <div className="lifeos-data-table__toolbar">{sortControl}</div>
  ) : null;

  const showEmpty = status.type === "ready" && rows.length === 0;

  return (
    <div
      data-has-card-view={renderCard ? "true" : undefined}
      className={["lifeos-data-table", className].filter(Boolean).join(" ")}
    >
      {toolbar}

      {selection && selectedCount > 0 ? (
        <div className="lifeos-data-table__bulk-bar">
          <Text size="sm" weight="medium">
            {selectedCount} selected
          </Text>
          {selection.bulkActions}
          <Button variant="link" size="sm" onClick={() => selection.onSelectedIdsChange(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      {status.type === "error" ? (
        <ErrorState
          scope="region"
          title="Couldn't load this list."
          description={status.message}
          {...(status.onRetry ? { onRetry: status.onRetry } : {})}
        />
      ) : showEmpty ? (
        <EmptyState
          variant={emptyVariant}
          title={emptyTitle}
          {...(emptyDescription !== undefined ? { description: emptyDescription } : {})}
        />
      ) : (
        <>
          {status.type === "loading" ? (
            // Skeleton is aria-hidden by design; this is what actually announces loading.
            <LiveRegion message={`Loading ${label}…`} />
          ) : null}
          <div className="lifeos-data-table__table-view">
            <Table caption={label} density={density}>
              <TableHead>
                <TableRow>
                  {selection ? (
                    <TableSelectAllCell
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                    />
                  ) : null}
                  {columns.map((column) => (
                    <TableHeaderCell
                      key={column.key}
                      {...(sort && sort.value.optionId === column.key
                        ? {
                            sortDirection:
                              sort.value.direction === "asc" ? "ascending" : "descending",
                          }
                        : {})}
                    >
                      {column.header}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {status.type === "loading"
                  ? Array.from({ length: LOADING_ROW_COUNT }, (_unused, index) => (
                      <TableRow key={`loading-${index}`}>
                        {selection ? (
                          <TableCell>
                            <Skeleton shape="block" width="1rem" height="1rem" />
                          </TableCell>
                        ) : null}
                        {columns.map((column) => (
                          <TableCell key={column.key}>
                            <Skeleton shape="line" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((row) => {
                      const id = getRowId(row);
                      return (
                        <TableRow key={id} selected={selection?.selectedIds.has(id) ?? false}>
                          {selection ? (
                            <TableSelectCell
                              checked={selection.selectedIds.has(id)}
                              onChange={(checked) => toggleRow(id, checked)}
                              label={`Select ${getRowLabel ? getRowLabel(row) : id}`}
                            />
                          ) : null}
                          {columns.map((column) => (
                            <TableCell key={column.key} truncate={column.truncate ?? false}>
                              {column.render(row)}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>

          {renderCard && status.type !== "loading" ? (
            <ul className="lifeos-data-table__card-view">
              {rows.map((row) => (
                <li key={getRowId(row)}>{renderCard(row)}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          label={`${label} pagination`}
        />
      ) : null}
    </div>
  );
}
