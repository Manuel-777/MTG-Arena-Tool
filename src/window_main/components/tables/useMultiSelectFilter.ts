import React from "react";
import { MultiSelectFilterProps } from "../tables/types";

type OnClickFactory = (
  code: string
) => (event: React.MouseEvent<HTMLDivElement>) => void;

export function useMultiSelectFilter<D>(
  props: MultiSelectFilterProps<D>
): [D, OnClickFactory] {
  const { filterKey, filters, onFilterChanged } = props;
  const filterValue = filters[filterKey];
  const onClickMultiFilter = React.useCallback(
    (code: string) => (event: React.MouseEvent<HTMLDivElement>): void => {
      (filterValue as any)[code] = event.currentTarget.classList.contains(
        "rarity_filter_on"
      );
      event.currentTarget.classList.toggle("rarity_filter_on");
      onFilterChanged(filterValue);
    },
    [filterValue, onFilterChanged]
  );
  return [filterValue, onClickMultiFilter];
}
