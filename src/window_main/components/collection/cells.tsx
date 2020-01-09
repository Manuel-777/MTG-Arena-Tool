import React from "react";
import {
  FlexLeftContainer,
  LabelText,
  RaritySymbol,
  SetSymbol,
  TypeSymbol
} from "../display";
import { CollectionTableCellProps } from "./types";

export function RarityCell({ cell }: CollectionTableCellProps): JSX.Element {
  const data = cell.row.values;
  const code = data.rarity;
  return (
    <FlexLeftContainer>
      {code === "land" ? (
        <div className="type_icon_cont">
          <TypeSymbol type={"Land"} />
        </div>
      ) : (
        <RaritySymbol rarity={code} />
      )}
      <LabelText>{code}</LabelText>
    </FlexLeftContainer>
  );
}

export function SetCell({ cell }: CollectionTableCellProps): JSX.Element {
  const data = cell.row.values;
  const set = data.set;
  return (
    <FlexLeftContainer>
      <SetSymbol set={set} />
      <LabelText>{set}</LabelText>
    </FlexLeftContainer>
  );
}

export function TypeCell({ cell }: CollectionTableCellProps): JSX.Element {
  const data = cell.row.values;
  const type = data.type;
  return (
    <FlexLeftContainer>
      <div className="type_icon_cont">
        <TypeSymbol type={type} />
      </div>
      <LabelText>{type}</LabelText>
    </FlexLeftContainer>
  );
}
