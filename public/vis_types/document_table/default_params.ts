import type { DocumentTableParams } from '../../../common/types';

export const DOCUMENT_TABLE_DEFAULT_PARAMS: DocumentTableParams = {
  perPage: 10,
  sort: { columnIndex: null, direction: null },
  showTotal: false,
  totalFunc: 'sum',
  totalLabel: '',
  computedColumns: [],
  stripedRows: false,
  addRowNumberColumn: false,
  hideExportLinks: false,
  hiddenColumns: '',
  showFilterBar: false,
  filterCaseSensitive: false,
  filterBarHideable: false,
  filterAsYouType: true,
  filterTermsSeparately: false,
  filterHighlightResults: false,
  filterBarWidth: '50%',
  fieldColumns: [
    {
      label: '',
      field: { name: '_source' },
      enabled: true,
    },
  ],
  hitsSize: 10,
  sortField: { name: '_score' },
  sortOrder: 'desc',
};
