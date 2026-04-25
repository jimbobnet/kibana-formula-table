import React, { useEffect, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { TableView } from './table_view';
import type { VisRenderData, EnhancedTableParams } from '../../../common/types';

interface EnhancedTableProps {
  visData: VisRenderData;
  visParams: EnhancedTableParams;
  fireEvent: (event: any) => void;
  hasCompatibleActions?: (event: any) => Promise<boolean>;
}

export const EnhancedTable: React.FC<EnhancedTableProps> = ({
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

  if (!visData.tables.length) return null;

  return (
    <>
      {visData.tables.map((table, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <EuiSpacer size="m" />}
          <TableView
            table={table}
            visParams={visParams}
            totalHits={visData.totalHits}
            fireEvent={fireEvent}
            hasRowClickActions={hasRowClickActions}
          />
        </React.Fragment>
      ))}
    </>
  );
};
