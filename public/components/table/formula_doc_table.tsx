import React, { useEffect, useState } from 'react';
import { TableView } from './table_view';
import type { VisRenderData, DocumentTableParams, TableEvent } from '../../../common/types';

interface DocumentTableProps {
  visData: VisRenderData;
  visParams: DocumentTableParams;
  fireEvent: (event: TableEvent) => void;
  hasCompatibleActions?: (event: TableEvent) => Promise<boolean>;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  visData,
  visParams,
  fireEvent,
  hasCompatibleActions,
}) => {
  const [hasRowClickActions, setHasRowClickActions] = useState(false);

  useEffect(() => {
    if (!hasCompatibleActions || !visData.tables.length) return;
    const firstTable = visData.tables[0];
    if (!firstTable.rows.length) return;

    hasCompatibleActions({
      name: 'tableRowContextMenuClick',
      data: {
        rowIndex: 0,
        table: {
          type: 'datatable',
          columns: firstTable.columns.map((c) => ({
            id: c.id,
            name: c.name,
            meta: c.meta ?? { type: 'string' },
          })),
          rows: firstTable.rows,
        },
        columns: firstTable.columns.map((c) => c.id),
      },
    }).then(setHasRowClickActions);
  }, [hasCompatibleActions, visData]);

  if (!visData.tables.length) {
    return null;
  }

  return (
    <TableView
      table={visData.tables[0]}
      visParams={visParams}
      totalHits={visData.totalHits}
      fireEvent={fireEvent}
      hasRowClickActions={hasRowClickActions}
    />
  );
};
