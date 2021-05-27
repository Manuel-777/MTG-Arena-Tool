import React, { CSSProperties } from "react";
//import { useSelector } from "react-redux";
//import { AppState } from "../../../shared/redux/stores/rendererStore";
import db from "../../../shared/database-wrapper";
import index from "../../index.css";
import { isEqual } from "lodash";
import { CardSet } from "mtgatool-shared";

interface SetsFilterProps {
  singleSelection?: boolean;
  style?: CSSProperties;
  callback: (sets: string[]) => void;
  filtered: string[];
}

export default function SetsFilter(props: SetsFilterProps): JSX.Element {
  const { singleSelection, style, callback, filtered } = props;
  //const formats = useSelector((state: AppState) => state.renderer.formats);
  // All sets after Ixalan
  const filterable = Object.keys(db.sets).filter(
    (set) => db.sets[set].collation > 0
  );
  filterable.push(
    "Jumpstart",
    "Historic Anthology 1",
    "Historic Anthology 2",
    "Historic Anthology 3",
    "Historic Anthology 4",
    "Historic Anthology 5"
  );
  const filterSets: (CardSet & { name: string })[] = filterable.map((set) => {
    return { name: set, ...db.sets[set] };
  });

  const setFilteredSet = (setCode: string): void => {
    if (singleSelection === true) {
      if (isEqual([setCode], filtered)) {
        callback([]);
      } else {
        callback([setCode]);
      }
    } else {
      const index = filtered.indexOf(setCode);
      if (index !== -1) {
        callback(filtered.filter((s) => s !== setCode));
      } else {
        callback([...filtered, setCode]);
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        marginTop: "16px",
        justifyContent: "space-between",
        ...style,
      }}
    >
      {filterSets.map((set) => {
        const svgData = set.svg;
        const setClass = `${index.setFilter} ${
          filtered.indexOf(set.code.toLowerCase()) == -1
            ? index.setFilterOn
            : ""
        }`;
        return (
          <div
            key={set.code.toLowerCase()}
            style={{
              backgroundImage: `url(data:image/svg+xml;base64,${svgData})`,
              width: "24px",
              height: "24px",
              margin: "0",
            }}
            title={set.name}
            className={setClass}
            onClick={(): void => setFilteredSet(set.code.toLowerCase())}
          ></div>
        );
      })}
    </div>
  );
}
