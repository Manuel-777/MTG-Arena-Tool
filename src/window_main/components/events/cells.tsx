import React from "react";
import { Cell } from "react-table";
import pd from "../../../shared/player-data";
import { DbCardData } from "../../../shared/types/Metadata";
import { getDraftCardHighlights } from "../../renderer-util";
import { BinarySymbol } from "../display";
import { DraftCardIcon } from "./DraftListItem";
import { EventTableData } from "./types";

export function StateCell({
  cell
}: {
  cell: Cell<EventTableData>;
}): JSX.Element {
  return (
    <BinarySymbol
      isOn={cell.value}
      title={cell.value ? "Completed" : "In Progress"}
    />
  );
}

export function CardHighlightsCell({
  cell
}: {
  cell: Cell<EventTableData>;
}): JSX.Element {
  const event = cell.row.original;
  const draftId = event.id + "-draft";
  if (pd.draftExists(draftId)) {
    const draft = pd.draft(draftId);
    const highlightCards: DbCardData[] = getDraftCardHighlights(draft);
    return (
      <div className={"flex_item"} style={{ margin: "auto" }}>
        {highlightCards.map((card, index) => (
          <DraftCardIcon key={index} card={card} />
        ))}
      </div>
    );
  }
  return <></>;
}
