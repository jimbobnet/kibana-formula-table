import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiDataGridControlColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridColumnCellActionProps,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { CELL_VALUE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { computeColumnsForTable } from './computed_column_engine';
import { computeColumnTotal } from './column_totals';
import { formatComputedColumnValue } from './format_computed_value';
import { getUiActions } from '../../services';
import type { VisTable, EnhancedTableParams, DocumentTableParams, VisTableRow } from '../../../common/types';

type TableParams = EnhancedTableParams | DocumentTableParams;

interface TableViewProps {
  table: VisTable;
  visParams: TableParams;
  totalHits: number;
  fireEvent: (event: any) => void;
  hasRowClickActions: boolean;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ROW_NUM_COL_ID = '__row_num__';

const parseHiddenColumns = (hidden?: string): Set<number> => {
  if (!hidden) return new Set();
  return new Set(
    hidden
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0)
  );
};

export const TableView: React.FC<TableViewProps> = ({
  table: rawTable,
  visParams,
  totalHits,
  fireEvent,
  hasRowClickActions,
}) => {
  const computedColumns = visParams.computedColumns ?? [];
  const perPage = visParams.perPage ?? DEFAULT_PAGE_SIZE;

  // Build columns + rows: formula computation, row number column, hidden column filtering.
  const { columns: allColumns, rows: allRows } = useMemo(() => {
    const result = computeColumnsForTable(rawTable.columns, rawTable.rows, computedColumns, totalHits);
    let cols = result.columns;
    let rows = result.rows;

    if (visParams.addRowNumberColumn) {
      cols = [
        { id: ROW_NUM_COL_ID, name: '#', filterable: false, meta: { type: 'number' as const } },
        ...cols,
      ];
      rows = rows.map((row, i) => ({ [ROW_NUM_COL_ID]: i + 1, ...row }));
    }

    const hiddenSet = parseHiddenColumns(visParams.hiddenColumns);
    if (hiddenSet.size > 0) {
      cols = cols.filter((_, i) => !hiddenSet.has(i));
    }

    return { columns: cols, rows };
  }, [
    rawTable.columns,
    rawTable.rows,
    computedColumns,
    totalHits,
    visParams.addRowNumberColumn,
    visParams.hiddenColumns,
  ]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(perPage);
  const [sortColumns, setSortColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [filterText, setFilterText] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    allColumns.map((col) => col.id)
  );

  useEffect(() => {
    setVisibleColumns(allColumns.map((col) => col.id));
  }, [allColumns]);

  // Filter bar: filter allRows by filterText before sorting and pagination.
  const filteredRows = useMemo(() => {
    if (!filterText || !visParams.showFilterBar) return allRows;
    const caseSensitive = visParams.filterCaseSensitive ?? false;
    const termsSeparately = visParams.filterTermsSeparately ?? false;
    const text = caseSensitive ? filterText : filterText.toLowerCase();
    const terms = termsSeparately ? text.split(/\s+/).filter(Boolean) : [text];
    return allRows.filter((row) => {
      const cellValues = Object.values(row)
        .map((v) => (v == null ? '' : String(v)))
        .map((s) => (caseSensitive ? s : s.toLowerCase()));
      return terms.every((term) => cellValues.some((v) => v.includes(term)));
    });
  }, [allRows, filterText, visParams.showFilterBar, visParams.filterCaseSensitive, visParams.filterTermsSeparately]);

  // Reset to first page when filter changes.
  useEffect(() => {
    setPageIndex(0);
  }, [filterText]);

  const sortedRows = useMemo(() => {
    if (!sortColumns.length) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      for (const { id, direction } of sortColumns) {
        const av = a[id];
        const bv = b[id];
        const aStr = av == null ? '' : String(av);
        const bStr = bv == null ? '' : String(bv);
        const cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }, [filteredRows, sortColumns]);

  const paginatedRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, pageIndex, pageSize]);

  // Ref so cell action closures always see the latest paginatedRows without
  // forcing gridColumns to rebuild on every page change.
  const paginatedRowsRef = useRef(paginatedRows);
  useEffect(() => {
    paginatedRowsRef.current = paginatedRows;
  }, [paginatedRows]);

  // Totals are always computed from allRows (not filtered), following legacy behavior.
  // The first column shows totalLabel if provided; remaining columns show computed totals.
  const totalsRow = useMemo(() => {
    if (!visParams.showTotal) return null;
    const row: Record<string, string> = {};
    allColumns.forEach((col, i) => {
      if (i === 0 && visParams.totalLabel) {
        row[col.id] = visParams.totalLabel;
      } else {
        const total = computeColumnTotal(col.id, allRows, visParams.totalFunc);
        row[col.id] = total != null ? String(total) : '';
      }
    });
    return row;
  }, [visParams.showTotal, visParams.totalFunc, visParams.totalLabel, allColumns, allRows]);

  // Precompute CELL_VALUE_TRIGGER-compatible actions for each column (async, from uiActions registry).
  // Keyed by column ID; empty array for columns with no compatible actions.
  const [columnCompatibleActions, setColumnCompatibleActions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    let cancelled = false;
    let uiActions: ReturnType<typeof getUiActions>;
    try {
      uiActions = getUiActions();
    } catch {
      return;
    }

    (async () => {
      const result: Record<string, any[]> = {};
      await Promise.all(
        allColumns.map(async (col) => {
          if (!col.meta) return;
          try {
            const actions = await uiActions.getTriggerCompatibleActions(CELL_VALUE_TRIGGER, {
              data: [{ columnMeta: col.meta }],
            });
            result[col.id] = actions ?? [];
          } catch {
            result[col.id] = [];
          }
        })
      );
      if (!cancelled) setColumnCompatibleActions(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [allColumns]);

  // Build EuiDataGrid column definitions including cellActions for filter and CELL_VALUE_TRIGGER.
  const gridColumns: EuiDataGridColumn[] = useMemo(() => {
    return allColumns.map((col, colIndex) => {
      const cellActions: EuiDataGridColumnCellAction[] = [];

      if (col.filterable) {
        const buildFilterEvent = (rowIndex: number, negate: boolean) => {
          const rows = paginatedRowsRef.current;
          const row = rows[rowIndex];
          if (!row) return;
          const flatTable = {
            type: 'datatable' as const,
            columns: allColumns.map((c) => ({ id: c.id, name: c.name, meta: c.meta ?? { type: 'string' } })),
            rows: rows.map((r) => ({ ...r })),
          };
          fireEvent({
            name: 'filter',
            data: { negate, data: [{ row: rowIndex, column: colIndex, value: row[col.id], table: flatTable }] },
          });
        };

        cellActions.push(({ rowIndex, Component }: EuiDataGridColumnCellActionProps) => {
          const row = paginatedRowsRef.current[rowIndex];
          if (!row || row[col.id] == null) return null;
          return (
            <Component
              iconType="plusCircle"
              aria-label={`Filter for: ${row[col.id]}`}
              onClick={() => buildFilterEvent(rowIndex, false)}
            >
              Filter for value
            </Component>
          );
        });

        cellActions.push(({ rowIndex, Component }: EuiDataGridColumnCellActionProps) => {
          const row = paginatedRowsRef.current[rowIndex];
          if (!row || row[col.id] == null) return null;
          return (
            <Component
              iconType="minusCircle"
              aria-label={`Filter out: ${row[col.id]}`}
              onClick={() => buildFilterEvent(rowIndex, true)}
            >
              Filter out value
            </Component>
          );
        });
      }

      // CELL_VALUE_TRIGGER actions from the uiActions registry (e.g. drilldowns, alerts).
      const compatibleActions = columnCompatibleActions[col.id] ?? [];
      compatibleActions.forEach((action: any) => {
        const context = { data: [{ columnMeta: col.meta }] };
        cellActions.push(({ rowIndex, Component }: EuiDataGridColumnCellActionProps) => {
          const row = paginatedRowsRef.current[rowIndex];
          if (!row || row[col.id] == null) return null;
          const cellContext = { data: [{ value: row[col.id], columnMeta: col.meta }] };
          return (
            <Component
              iconType={action.getIconType?.(context)}
              aria-label={action.getDisplayName?.(context) ?? action.id}
              onClick={() => action.execute(cellContext)}
            >
              {action.getDisplayName?.(context) ?? action.id}
            </Component>
          );
        });
      });

      return {
        id: col.id,
        displayAsText: col.name,
        isSortable: col.id !== ROW_NUM_COL_ID,
        isExpandable: false,
        isResizable: true,
        ...(cellActions.length > 0 ? { cellActions } : {}),
      };
    });
  }, [allColumns, columnCompatibleActions, fireEvent]);

  const displayedRows = useMemo(() => {
    if (!totalsRow) return paginatedRows;
    return [...paginatedRows, totalsRow as VisTableRow];
  }, [paginatedRows, totalsRow]);

  const trailingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    if (!hasRowClickActions) return [];
    return [
      {
        id: 'row_actions',
        width: 40,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex }) => {
          if (totalsRow && rowIndex === displayedRows.length - 1) return null;
          const actualRowIndex = pageIndex * pageSize + rowIndex;
          const flatTable = {
            type: 'datatable' as const,
            columns: allColumns.map((c) => ({
              id: c.id,
              name: c.name,
              meta: c.meta ?? { type: 'string' },
            })),
            rows: allRows.map((r) => ({ ...r })),
          };
          return (
            <EuiButtonIcon
              iconType="boxesVertical"
              aria-label="Row actions"
              color="text"
              onClick={() =>
                fireEvent({
                  name: 'tableRowContextMenuClick',
                  data: {
                    rowIndex: actualRowIndex,
                    table: flatTable,
                    columns: allColumns.map((c) => c.id),
                  },
                })
              }
            />
          );
        },
      },
    ];
  }, [hasRowClickActions, allColumns, allRows, pageIndex, pageSize, displayedRows, totalsRow, fireEvent]);

  const filterBarWidth = visParams.filterBarWidth ?? '50%';

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {rawTable.title && (
        <>
          <EuiText size="s">
            <strong>{rawTable.title}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
        </>
      )}
      {visParams.showFilterBar && (
        <>
          <div style={{ width: filterBarWidth }}>
            <EuiFieldSearch
              compressed
              placeholder="Filter…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              isClearable
              aria-label="Filter table rows"
            />
          </div>
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiDataGrid
        aria-label={rawTable.title ?? 'Enhanced Table 2'}
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={displayedRows.length}
        renderCellValue={({ rowIndex, columnId }) => {
          const isTotalsRow = Boolean(totalsRow) && rowIndex === displayedRows.length - 1;

          // Computed column: apply format + alignment.
          const ccMatch = !isTotalsRow && columnId.match(/^computed_col_(\d+)$/);
          if (ccMatch) {
            const ccIdx = parseInt(ccMatch[1], 10);
            const cc = (visParams.computedColumns ?? []).filter((c) => c.enabled)[ccIdx];
            const rawVal = displayedRows[rowIndex]?.[columnId];
            const formatted = cc ? formatComputedColumnValue(rawVal, cc) : String(rawVal ?? '');
            const align = cc?.alignment ?? 'left';
            return <span style={{ display: 'block', textAlign: align }}>{formatted}</span>;
          }

          const row = displayedRows[rowIndex];
          const val = row ? (row[columnId] != null ? String(row[columnId]) : null) : null;

          if (isTotalsRow) {
            return <strong>{val}</strong>;
          }
          return <>{val}</>;
        }}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChangeItemsPerPage: (size) => {
            setPageSize(size);
            setPageIndex(0);
          },
          onChangePage: setPageIndex,
        }}
        sorting={{ columns: sortColumns, onSort: setSortColumns }}
        trailingControlColumns={trailingControlColumns}
        gridStyle={{ stripes: visParams.stripedRows }}
        toolbarVisibility={{
          showColumnSelector: true,
          showDisplaySelector: false,
          showFullScreenSelector: false,
          showSortSelector: true,
        }}
      />
    </div>
  );
};
