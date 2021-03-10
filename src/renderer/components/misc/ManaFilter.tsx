import React, { useMemo } from "react";
import { ManaSymbol } from "./ManaSymbol";
import indexCss from "../../index.css";
import { constants } from "mtgatool-shared";
const { COLORS_BRIEF } = constants;

export type ManaFilterKeys = "w" | "u" | "b" | "r" | "g" | "multi";

export type ColorFilter = { [key in ManaFilterKeys]: boolean };

interface ManaFilterProps {
  filterKey: string;
  prefixId: string;
  filters: { [key: string]: ColorFilter };
  onFilterChanged: (colors: ColorFilter) => void;
  symbolSize?: number;
}

export default function ManaFilter(props: ManaFilterProps): JSX.Element {
  const { filterKey, prefixId, filters, onFilterChanged } = props;
  const colors = useMemo(() => {
    return { ...filters[filterKey] };
  }, [filters, filterKey]);

  const filterLabels: { [key in ManaFilterKeys]: string } = {
    w: "White",
    u: "Blue",
    b: "Black",
    r: "Red",
    g: "Green",
    multi: "Allow unselected colors",
  };

  const onClickColorFilter = React.useCallback(
    (code: ManaFilterKeys) => (
      event: React.MouseEvent<HTMLDivElement>
    ): void => {
      colors[code] = event.currentTarget.classList.contains(
        indexCss.mana_filter_on
      );
      event.currentTarget.classList.toggle(indexCss.mana_filter_on);
      onFilterChanged(colors);
    },
    [colors, onFilterChanged]
  );

  const allFilters: ManaFilterKeys[] = [...COLORS_BRIEF, "multi"];
  const symbolSize = props.symbolSize ?? 20;

  return (
    <div
      className={prefixId + "_query_mana"}
      style={{
        display: "flex",
        height: symbolSize + 4 + "px",
      }}
    >
      {allFilters.map((code, index) => {
        const classNamesList = `${indexCss.mana_filter} ${
          colors[code] ? "" : indexCss.mana_filter_on
        }`;
        return (
          <div
            key={code}
            onClick={onClickColorFilter(code)}
            className={classNamesList}
            title={filterLabels[code]}
          >
            {code === "multi" ? (
              <div
                className={indexCss.icon_search_inclusive}
                style={{
                  width: symbolSize + 2 + "px",
                  height: symbolSize + 2 + "px",
                }}
              />
            ) : (
              <ManaSymbol
                colorIndex={index + 1}
                style={{
                  width: symbolSize + "px",
                  height: symbolSize + "px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
