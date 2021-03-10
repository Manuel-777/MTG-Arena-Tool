import React, { useMemo } from "react";
import { MultiSelectFilterProps } from "../tables/types";
import indexCss from "../../index.css";

type OnClickFactory = (
  code: string
) => (event: React.MouseEvent<HTMLDivElement>) => void;

export function useMultiSelectFilter<D>(
  props: MultiSelectFilterProps<D>
): [D, OnClickFactory] {
  const { filterKey, filters, onFilterChanged } = props;
  const filterValue = useMemo(() => {
    return { ...filters[filterKey] };
  }, [filters, filterKey]);

  const onClickMultiFilter = React.useCallback(
    (code: string) => (event: React.MouseEvent<HTMLDivElement>): void => {
      (filterValue as any)[code] = event.currentTarget.classList.contains(
        indexCss.rarityFilterOn
      );
      event.currentTarget.classList.toggle(indexCss.rarityFilterOn);
      onFilterChanged(filterValue);
    },
    [filterValue, onFilterChanged]
  );
  return [filterValue, onClickMultiFilter];
}
