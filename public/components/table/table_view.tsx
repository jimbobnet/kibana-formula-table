import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiDataGridControlColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridColumnCellActionProps,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiPopover,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { CELL_VALUE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { computeColumnsForTable, parseFormula, evaluateRowExpression } from './computed_column_engine';
import { computeColumnTotal } from './column_totals';
import { formatComputedColumnValue } from './format_computed_value';
import { compileTemplate, renderTemplate, buildTemplateContext } from './handlebars_template';
import { SafeHtmlCell, CssStyledCell } from './safe_html_cell';
import { buildCsvContent, downloadCsv } from './csv_export';
import type { TemplateDelegate } from '@kbn/handlebars';
import { getUiActions } from '../../services';
import type { VisTable, EnhancedTableParams, DocumentTableParams } from '../../../common/types';

type TableParams = EnhancedTableParams | DocumentTableParams;

const hashStr = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

const highlightText = (
  text: string,
  terms: string[],
  caseSensitive: boolean
): React.ReactNode => {
  if (!terms.length || !text) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, caseSensitive ? 'g' : 'gi');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} style={{ backgroundColor: 'var(--euiColorHighlight, #FFF2CC)', padding: 0 }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

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

  // Build columns + rows: formula computation and row number column.
  // Hidden column filtering is intentionally deferred to displayedColumns so that
  // col0..colN indices in formulas always reference the same columns regardless of
  // which columns are hidden.
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

    return { columns: cols, rows };
  }, [
    rawTable.columns,
    rawTable.rows,
    computedColumns,
    totalHits,
    visParams.addRowNumberColumn,
  ]);

  // Hidden columns: applied last, only for display. Formulas and totals use allColumns/allRows.
  const displayedColumns = useMemo(() => {
    const hiddenSet = parseHiddenColumns(visParams.hiddenColumns);
    if (hiddenSet.size === 0) return allColumns;
    return allColumns.filter((_, i) => !hiddenSet.has(i));
  }, [allColumns, visParams.hiddenColumns]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(perPage);
  const [sortColumns, setSortColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [filterText, setFilterText] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    displayedColumns.map((col) => col.id)
  );
  const [csvPopoverOpen, setCsvPopoverOpen] = useState(false);
  const [csvIncludeTotals, setCsvIncludeTotals] = useState(visParams.csvExportWithTotal ?? false);

  useEffect(() => {
    setVisibleColumns(displayedColumns.map((col) => col.id));
  }, [displayedColumns]);

  const compiledRowFilter = useMemo(
    () => (visParams.rowComputedFilter ? parseFormula(visParams.rowComputedFilter) : null),
    [visParams.rowComputedFilter]
  );

  const compiledRowCss = useMemo(
    () => (visParams.rowComputedCss ? parseFormula(visParams.rowComputedCss) : null),
    [visParams.rowComputedCss]
  );

  const compiledCellCssMap = useMemo(() => {
    const map = new Map<number, any>();
    (visParams.computedColumns ?? []).filter((c) => c.enabled).forEach((cc, idx) => {
      if (cc.cellComputedCss) {
        const expr = parseFormula(cc.cellComputedCss);
        if (expr) map.set(idx, expr);
      }
    });
    return map;
  }, [visParams.computedColumns]);

  const highlightTerms = useMemo(() => {
    if (!filterText || !(visParams.filterHighlightResults ?? false) || !visParams.showFilterBar) return [];
    const caseSensitive = visParams.filterCaseSensitive ?? false;
    const text = caseSensitive ? filterText : filterText.toLowerCase();
    return (visParams.filterTermsSeparately ?? false)
      ? text.split(/\s+/).filter(Boolean)
      : [text];
  }, [filterText, visParams.filterHighlightResults, visParams.showFilterBar, visParams.filterCaseSensitive, visParams.filterTermsSeparately]);

  // Row formula filter: applied after computed columns, before text filter bar.
  // Totals are still computed from allRows (unfiltered).
  const formulaFilteredRows = useMemo(() => {
    if (!compiledRowFilter) return allRows;
    return allRows.filter((row, idx) =>
      Boolean(evaluateRowExpression(compiledRowFilter, row, allColumns, allRows, idx, totalHits))
    );
  }, [allRows, compiledRowFilter, allColumns, totalHits]);

  // Filter bar: filter formulaFilteredRows by filterText before sorting and pagination.
  const filteredRows = useMemo(() => {
    if (!filterText || !visParams.showFilterBar) return formulaFilteredRows;
    const caseSensitive = visParams.filterCaseSensitive ?? false;
    const termsSeparately = visParams.filterTermsSeparately ?? false;
    const text = caseSensitive ? filterText : filterText.toLowerCase();
    const terms = termsSeparately ? text.split(/\s+/).filter(Boolean) : [text];
    return formulaFilteredRows.filter((row) => {
      const cellValues = Object.values(row)
        .map((v) => (v == null ? '' : String(v)))
        .map((s) => (caseSensitive ? s : s.toLowerCase()));
      return terms.every((term) => cellValues.some((v) => v.includes(term)));
    });
  }, [formulaFilteredRows, filterText, visParams.showFilterBar, visParams.filterCaseSensitive, visParams.filterTermsSeparately]);

  // Reset to first page when filter changes or dataset shrinks past current page.
  useEffect(() => {
    setPageIndex(0);
  }, [filterText]);

  useEffect(() => {
    if (pageIndex > 0 && pageIndex * pageSize >= filteredRows.length) {
      setPageIndex(0);
    }
  }, [filteredRows.length, pageIndex, pageSize]);

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

  // Ref so cell action closures always see the latest sortedRows without
  // forcing gridColumns to rebuild on every sort/filter change.
  const sortedRowsRef = useRef(sortedRows);
  useEffect(() => {
    sortedRowsRef.current = sortedRows;
  }, [sortedRows]);

  // Row CSS: evaluate formula per sorted row → build rowClasses + inject CSS rules.
  const rowCssStyles = useMemo((): string[] | null => {
    if (!compiledRowCss) return null;
    return sortedRows.map((row, idx) => {
      const result = evaluateRowExpression(compiledRowCss, row, allColumns, sortedRows, idx, totalHits);
      return result != null ? String(result) : '';
    });
  }, [sortedRows, compiledRowCss, allColumns, totalHits]);

  const { rowClasses, injectedCss } = useMemo(() => {
    if (!rowCssStyles) return { rowClasses: {} as Record<number, string>, injectedCss: '' };
    const cssRules: string[] = [];
    const seen = new Map<string, string>();
    const rc: Record<number, string> = {};
    rowCssStyles.forEach((css, idx) => {
      if (!css) return;
      if (!seen.has(css)) {
        const cls = `et2rc_${hashStr(css)}`;
        seen.set(css, cls);
        cssRules.push(`.${cls} { ${css} }`);
      }
      rc[idx] = seen.get(css)!;
    });
    return { rowClasses: rc, injectedCss: cssRules.join('\n') };
  }, [rowCssStyles]);

  const rowCssStyleRef = useRef<HTMLStyleElement>(null);
  useEffect(() => {
    if (rowCssStyleRef.current) rowCssStyleRef.current.textContent = injectedCss;
  }, [injectedCss]);

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

  // Compile Handlebars templates once per computedColumns change.
  const compiledTemplates = useMemo(() => {
    const map = new Map<number, TemplateDelegate>();
    (visParams.computedColumns ?? []).filter((c) => c.enabled).forEach((cc, idx) => {
      if (cc.applyTemplate && cc.template) {
        try { map.set(idx, compileTemplate(cc.template)); } catch { /* skip invalid template */ }
      }
    });
    return map;
  }, [visParams.computedColumns]);

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
        displayedColumns.map(async (col) => {
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
  }, [displayedColumns]);

  // Build EuiDataGrid column definitions including cellActions for filter and CELL_VALUE_TRIGGER.
  // rowIndex passed to cell actions is the absolute index into sortedRows.
  const gridColumns: EuiDataGridColumn[] = useMemo(() => {
    return displayedColumns.map((col, colIndex) => {
      const cellActions: EuiDataGridColumnCellAction[] = [];

      if (col.filterable) {
        const buildFilterEvent = (rowIndex: number, negate: boolean) => {
          const rows = sortedRowsRef.current;
          const row = rows[rowIndex];
          if (!row) return;
          const flatTable = {
            type: 'datatable' as const,
            columns: displayedColumns.map((c) => ({ id: c.id, name: c.name, meta: c.meta ?? { type: 'string' } })),
            rows: rows.map((r) => ({ ...r })),
          };
          fireEvent({
            name: 'filter',
            data: { negate, data: [{ row: rowIndex, column: colIndex, value: row[col.id], table: flatTable }] },
          });
        };

        cellActions.push(({ rowIndex, Component }: EuiDataGridColumnCellActionProps) => {
          const row = sortedRowsRef.current[rowIndex];
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
          const row = sortedRowsRef.current[rowIndex];
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
          const row = sortedRowsRef.current[rowIndex];
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

      const colDef: any = {
        id: col.id,
        displayAsText: col.name,
        isSortable: col.id !== ROW_NUM_COL_ID,
        isExpandable: false,
        isResizable: true,
        ...(cellActions.length > 0 ? { cellActions } : {}),
      };

      const ccHeaderMatch = col.id.match(/^computed_col_(\d+)$/);
      if (ccHeaderMatch) {
        const enabledCCs = (visParams.computedColumns ?? []).filter((c) => c.enabled);
        const cc = enabledCCs[parseInt(ccHeaderMatch[1], 10)];
        if (cc && cc.applyAlignmentOnTitle && cc.alignment !== 'left') {
          colDef.display = (
            <span style={{ display: 'block', textAlign: cc.alignment as React.CSSProperties['textAlign'] }}>
              {col.name}
            </span>
          );
        }
      }

      return colDef;
    });
  }, [displayedColumns, columnCompatibleActions, fireEvent, visParams.computedColumns]);

  const trailingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    if (!hasRowClickActions) return [];
    return [
      {
        id: 'row_actions',
        width: 40,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex }) => {
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
                    rowIndex,
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
  }, [hasRowClickActions, allColumns, allRows, fireEvent]);

  const filterBarWidth = visParams.filterBarWidth ?? '50%';

  const handleExport = (rows: typeof sortedRows, includeTotals: boolean) => {
    const title = rawTable.title || 'export';
    if (visParams.csvFullExport) {
      const rawCols = rawTable.columns.map((c: any) => ({ id: c.id, name: c.name, meta: c.meta, filterable: false }));
      const content = buildCsvContent(rawTable.rows as typeof sortedRows, rawCols, [], null, false);
      downloadCsv(content, `${title}.csv`);
    } else {
      const enabledComputedCols = (visParams.computedColumns ?? []).filter((c) => c.enabled);
      const content = buildCsvContent(rows, displayedColumns, enabledComputedCols, totalsRow, includeTotals);
      downloadCsv(content, `${title}.csv`);
    }
    setCsvPopoverOpen(false);
  };

  const exportButton = visParams.hideExportLinks ? null : (
    <EuiPopover
      button={
        <EuiButtonEmpty size="xs" iconType="download" onClick={() => setCsvPopoverOpen((o) => !o)}>
          Export
        </EuiButtonEmpty>
      }
      isOpen={csvPopoverOpen}
      closePopover={() => setCsvPopoverOpen(false)}
      panelPaddingSize="s"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem key="visible" onClick={() => handleExport(sortedRows, csvIncludeTotals)}>
            Export visible rows
          </EuiContextMenuItem>,
          <EuiContextMenuItem key="all" onClick={() => handleExport(allRows, csvIncludeTotals)}>
            Export all rows
          </EuiContextMenuItem>,
          ...(visParams.showTotal && !visParams.csvExportWithTotal
            ? [
                <EuiContextMenuItem key="totals" onClick={(e) => e.stopPropagation()}>
                  <EuiCheckbox
                    id="csv-include-totals"
                    label="Include totals row"
                    checked={csvIncludeTotals}
                    onChange={(e) => setCsvIncludeTotals(e.target.checked)}
                    compressed
                  />
                </EuiContextMenuItem>,
              ]
            : []),
        ]}
      />
    </EuiPopover>
  );

  // Render a computed column cell value with optional Handlebars template and cell CSS.
  const renderComputedCell = (
    columnId: string,
    rowData: Record<string, unknown>,
    isTotals: boolean,
    rowIndex?: number
  ) => {
    const enabledComputedCols = (visParams.computedColumns ?? []).filter((c) => c.enabled);
    const ccMatch = columnId.match(/^computed_col_(\d+)$/);
    if (!ccMatch) return null;
    const ccIdx = parseInt(ccMatch[1], 10);
    const cc = enabledComputedCols[ccIdx];
    const rawVal = rowData[columnId];
    const formatted = cc ? formatComputedColumnValue(rawVal, cc) : String(rawVal ?? '');
    const align = cc?.alignment ?? 'left';

    const cellCssExpr = compiledCellCssMap.get(ccIdx);
    let cellCss = '';
    if (cellCssExpr) {
      const rows = isTotals ? [] : sortedRowsRef.current;
      const ri = rowIndex ?? 0;
      const result = evaluateRowExpression(cellCssExpr, rowData, allColumns, rows, ri, totalHits, {
        value: formatted,
        rawValue: rawVal,
      });
      cellCss = result != null ? String(result) : '';
    }

    const compiled = compiledTemplates.get(ccIdx);
    const applyTpl = isTotals ? (cc?.applyTemplateOnTotal ?? false) : (cc?.applyTemplate ?? false);

    if (compiled && applyTpl) {
      const ctx = buildTemplateContext(allColumns, rowData, totalsRow, totalHits, formatted, rawVal);
      const html = renderTemplate(compiled, ctx);
      return isTotals
        ? <SafeHtmlCell html={html} tag="strong" />
        : <SafeHtmlCell html={html} style={{ display: 'block', textAlign: align }} />;
    }

    if (isTotals) {
      const alignTotal = cc?.applyAlignmentOnTotal && cc?.alignment !== 'left';
      return alignTotal
        ? <strong style={{ display: 'block', textAlign: cc!.alignment as React.CSSProperties['textAlign'] }}>{formatted}</strong>
        : <strong>{formatted}</strong>;
    }

    const inner = <span style={{ display: 'block', textAlign: align }}>{formatted}</span>;
    return cellCss
      ? <CssStyledCell cssText={cellCss} style={{ display: 'block' }}>{inner}</CssStyledCell>
      : inner;
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style ref={rowCssStyleRef} />
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
          <div style={{ width: filterBarWidth, paddingLeft: 4 }}>
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
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <EuiDataGrid
        aria-label={rawTable.title ?? 'Enhanced Table 2'}
        columns={gridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={sortedRows.length}
        renderCellValue={({ rowIndex, columnId }) => {
          const row = sortedRows[rowIndex];

          const ccResult = row !== undefined
            ? renderComputedCell(columnId, row, false, rowIndex)
            : null;
          if (ccResult !== null) return ccResult;

          const val = row ? (row[columnId] != null ? String(row[columnId]) : null) : null;
          if (val && highlightTerms.length) {
            return <>{highlightText(val, highlightTerms, visParams.filterCaseSensitive ?? false)}</>;
          }
          return <>{val}</>;
        }}
        renderFooterCellValue={
          totalsRow
            ? ({ columnId }) => {
                const result = renderComputedCell(columnId, totalsRow, true);
                if (result !== null) return result;
                const val = totalsRow[columnId];
                return val != null ? <strong>{val}</strong> : null;
              }
            : undefined
        }
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
        gridStyle={{ stripes: visParams.stripedRows, rowClasses }}
        toolbarVisibility={{
          showColumnSelector: true,
          showDisplaySelector: false,
          showFullScreenSelector: false,
          showSortSelector: true,
          additionalControls: exportButton,
        }}
      />
      </div>
    </div>
  );
};
