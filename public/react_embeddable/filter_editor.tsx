import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import {
  getCoreStart,
  getDataStart,
  getDataViewsStart,
  getUnifiedSearchStart,
} from '../services';

const storage = new Storage(window.localStorage);

interface Props {
  filters: Filter[];
  dataView: DataView | undefined;
  onChange: (filters: Filter[]) => void;
}

// SearchBar needs a KibanaContextProvider ancestor (it isn't pre-wired like
// `unifiedSearch.ui.SearchBar`, which is a stateful component bound to the app's
// single global filterManager — unsuitable here, since these filters are local to
// this panel, not the dashboard's global filter bar).
export const PanelFilterEditor: React.FC<Props> = ({ filters, dataView, onChange }) => {
  const services = {
    ...getCoreStart(),
    appName: 'formulaTable',
    data: getDataStart(),
    dataViews: getDataViewsStart(),
    unifiedSearch: { autocomplete: getUnifiedSearchStart().autocomplete },
    storage,
  };

  return (
    <KibanaContextProvider services={services}>
      <SearchBar
        showQueryInput={false}
        showFilterBar
        showDatePicker={false}
        showSubmitButton={false}
        showQueryMenu={false}
        filters={filters}
        onFiltersUpdated={onChange}
        indexPatterns={dataView ? [dataView] : []}
      />
    </KibanaContextProvider>
  );
};
