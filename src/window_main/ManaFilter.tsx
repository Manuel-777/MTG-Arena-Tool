import React from "react";
import { COLORS_BRIEF } from "../shared/constants";

export type ManaFilterKeys = "w" | "u" | "b" | "r" | "g" | "multi";

export type ColorFilter = { [key in ManaFilterKeys]: boolean };

export interface ManaFilterProps {
  filterKey: string;
  prefixId: string;
  filters: { [key: string]: ColorFilter };
  onFilterChanged: (colors: ColorFilter) => void;
}

export default function ManaFilter(props: ManaFilterProps) {
  const { filterKey, prefixId, filters } = props;
  const colors = filters[filterKey];

  const filterLabels: { [key in ManaFilterKeys]: string } = {
    w: "White",
    u: "Blue",
    b: "Black",
    r: "Red",
    g: "Green",
    multi: "Allow unselected colors"
  };

  const onClickColorFilter = React.useCallback(
    (code: ManaFilterKeys) => (event: React.MouseEvent<HTMLDivElement>) => {
      colors[code] = event.currentTarget.classList.contains("mana_filter_on");
      event.currentTarget.classList.toggle("mana_filter_on");
      props.onFilterChanged(colors);
    },
    [props.onFilterChanged]
  );

  const allFilters: ManaFilterKeys[] = [...COLORS_BRIEF, "multi"];

  const manasStyles = {
    display: "flex",
    margin: "8px",
    width: "150px",
    height: "32px"
  };

  return (
    <div className={prefixId + "_query_mana"} style={manasStyles}>
      {allFilters.map(code => {
        const classNamesList =
          "mana_filter" +
          (code === "multi" ? " icon_search_inclusive" : "") +
          (colors[code] ? "" : " mana_filter_on");
        const additionalStyles = {
          width: "30px",
          backgroundImage:
            code === "multi" ? undefined : `url(../images/${code}20.png)`
        };
        return (
          <div
            key={code}
            onClick={onClickColorFilter(code)}
            className={classNamesList}
            style={additionalStyles}
            title={filterLabels[code]}
          />
        );
      })}
    </div>
  );
}
