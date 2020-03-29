import React from "react";
import { Cell } from "react-table";
import { BinarySymbol } from "../misc/BinarySymbol";
import { BriefText } from "../misc/BriefText";
import { FlexLeftContainer } from "../misc/FlexContainer";
import { RankSymbol } from "../misc/RankSymbol";
import { TagsCell } from "../tables/cells";
import { TagCounts } from "../tables/types";
import { MatchTableData } from "./types";

export function ArchetypeCell(props: {
  cell: Cell<MatchTableData>;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (id: string, tag: string) => void;
  tags: TagCounts;
}): JSX.Element {
  return (
    <TagsCell {...props} disallowMultiple title={"set custom archetype"} />
  );
}

export function OnPlayCell({
  cell
}: {
  cell: Cell<MatchTableData>;
}): JSX.Element {
  return (
    <BinarySymbol
      isOn={cell.value}
      title={"On the " + (cell.value ? "play" : "draw")}
    />
  );
}

export function RankCell({
  cell
}: {
  cell: Cell<MatchTableData>;
}): JSX.Element {
  return (
    <FlexLeftContainer>
      <RankSymbol rank={cell.value} />
      <BriefText
        value={cell.value}
        style={{ fontFamily: "var(--main-font-name-it)", opacity: 0.5 }}
      />
    </FlexLeftContainer>
  );
}
