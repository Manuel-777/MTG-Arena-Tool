import React from "react";
import { BinarySymbol } from "../misc/BinarySymbol";
import { BoosterSymbol } from "../misc/BoosterSymbol";
import { BriefText } from "../misc/BriefText";
import { FlexLeftContainer } from "../misc/FlexContainer";
import { LabelText } from "../misc/LabelText";
import { RaritySymbol } from "../misc/RaritySymbol";
import { SetSymbol } from "../misc/SetSymbol";
import { TypeSymbol } from "../misc/TypeSymbol";
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
      <BriefText value={set} />
    </FlexLeftContainer>
  );
}

export function TypeCell({ cell }: CollectionTableCellProps): JSX.Element {
  const type = cell.value;
  return (
    <FlexLeftContainer>
      <div className="type_icon_cont">
        <TypeSymbol type={type} />
      </div>
      <BriefText value={type} />
    </FlexLeftContainer>
  );
}

export function InBoostersCell({
  cell
}: CollectionTableCellProps): JSX.Element {
  return (
    <BinarySymbol
      isOn={cell.value}
      title={(cell.value ? "" : "not ") + "available in boosters"}
    />
  );
}

export function InBoostersHeader(): JSX.Element {
  return <BoosterSymbol title={"is available in boosters"} />;
}
