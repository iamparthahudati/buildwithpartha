import { DataTable } from "@components/navigation";
import type { ReportTable } from "../model/reports";
import "./report-data-table.css";

export interface ReportDataTableProps {
  readonly tables: readonly ReportTable[];
  readonly loading?: boolean | undefined;
}

interface GenericTableRow {
  id: string;
  cells: Record<string, string>;
}

export function ReportDataTable({ tables, loading = false }: ReportDataTableProps) {
  if (loading) {
    return (
      <div className="report-data-table" data-testid="report-data-table-skeleton">
        <div className="report-data-table__skeleton-box" />
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return null;
  }

  return (
    <div className="report-data-table" data-testid="report-data-table">
      {tables.map((table, tableIdx) => {
        const headers = table.headers || [];
        const columns = headers.map((headerText, colIdx) => ({
          key: `col_${colIdx}`,
          header: headerText,
          render: (row: GenericTableRow) => row.cells[`col_${colIdx}`] ?? "-",
        }));

        const rows: GenericTableRow[] = (table.rows || []).map((rowArray, rowIdx) => {
          const cells: Record<string, string> = {};
          headers.forEach((_, colIdx) => {
            const rawVal = rowArray[colIdx];
            cells[`col_${colIdx}`] = rawVal !== null && rawVal !== undefined ? String(rawVal) : "-";
          });
          return {
            id: `tbl-${tableIdx}-row-${rowIdx}`,
            cells,
          };
        });

        return (
          <div key={table.tableId || `tbl-${tableIdx}`} className="report-data-table__section">
            <div className="report-data-table__header-row">
              <h3 className="report-data-table__title">{table.title}</h3>
              {table.totalRows > 0 && (
                <span className="report-data-table__count">{table.totalRows} rows</span>
              )}
            </div>
            {table.description && (
              <p className="report-data-table__description">{table.description}</p>
            )}

            <DataTable<GenericTableRow>
              label={table.title}
              columns={columns}
              rows={rows}
              getRowId={(r) => r.id}
              emptyTitle="No tabular data available for this report."
            />
          </div>
        );
      })}
    </div>
  );
}
