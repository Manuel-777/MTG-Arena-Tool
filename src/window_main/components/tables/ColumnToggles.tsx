import React from "react";
import { ColumnInstance } from "react-table";
import { CheckboxContainer } from "../display";
import { TableData } from "./types";

export default function ColumnToggles<D extends TableData>({
  toggleableColumns,
  togglesVisible
}: {
  toggleableColumns: ColumnInstance<D>[];
  togglesVisible: boolean;
}): JSX.Element {
  return (
    <div className="decks_table_toggles">
      {togglesVisible &&
        toggleableColumns.map(column => (
          <CheckboxContainer key={column.id}>
            {column.render("Header")}
            <input type="checkbox" {...column.getToggleHiddenProps({})} />
            <span className={"checkmark"} />
          </CheckboxContainer>
        ))}
    </div>
  );
}
