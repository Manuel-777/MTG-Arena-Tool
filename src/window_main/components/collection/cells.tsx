import React from "react";
import db from "../../../shared/database";

import {
  FlexLeftContainer,
  LabelText,
  RaritySymbol,
  SetSymbol,
  TypeSymbol
} from "../display";
import { CellProps } from "./types";

export function RarityCell({ cell }: CellProps): JSX.Element {
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

export function SetCell({ cell }: CellProps): JSX.Element {
  const data = cell.row.values;
  const set = data.set;
  return (
    <FlexLeftContainer>
      <SetSymbol set={set} />
      <LabelText>{set}</LabelText>
    </FlexLeftContainer>
  );
}

export function TypeCell({ cell }: CellProps): JSX.Element {
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
