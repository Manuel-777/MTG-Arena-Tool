import React from "react";
import { Cell } from "react-table";
import { createInput } from "../../../shared/dom-fns"; // TODO remove this
import { getTagColor } from "../../renderer-util";
import {
  FlexLeftContainer,
  OnPlaySymbol,
  RankSymbol,
  TagBubble,
  TagBubbleWithClose
} from "../display";
import { MatchTableData } from "./types";

const tagPrompt = "Set archetype";
export function MatchTagsCell({
  cell,
  deleteTagCallback,
  editTagCallback,
  addTagCallback
}: {
  cell: Cell<MatchTableData>;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (id: string, tag: string) => void;
}): JSX.Element {
  const backgroundColor = getTagColor();
  const data = cell.row.values;
  const containerRef: React.MutableRefObject<HTMLDivElement | null> = React.useRef(
    null
  );
  // TODO translate this into React
  const clickHandler = function(e: React.MouseEvent): void {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.innerHTML = "";
    const input = createInput(["deck_tag_input"], "", {
      type: "text",
      autocomplete: "off",
      placeholder: tagPrompt,
      size: 1
    });
    input.addEventListener("keyup", function(e) {
      setTimeout(() => {
        input.style.width = input.value.length * 8 + "px";
      }, 10);
      if (e.keyCode === 13) {
        e.stopPropagation();
        input.blur();
      }
    });
    input.addEventListener("focusout", function() {
      const val = input.value;
      if (val && val !== tagPrompt) {
        addTagCallback(data.id, val);
      }
    });
    container.appendChild(input);
    input.focus();
    e.stopPropagation();
  };
  return (
    <FlexLeftContainer>
      {cell.value.map((tag: string) => (
        <TagBubbleWithClose
          deckid={data.id}
          tag={tag}
          key={tag}
          editTagCallback={editTagCallback}
          deleteTagCallback={deleteTagCallback}
        />
      ))}
      {cell.value.length === 0 && (
        <TagBubble
          ref={containerRef}
          backgroundColor={backgroundColor}
          style={{ opacity: 0.6 }}
          fontStyle={"italic"}
          title={"set custom match tag"}
          onClick={clickHandler}
        >
          {tagPrompt}
        </TagBubble>
      )}
    </FlexLeftContainer>
  );
}

export function OnPlayCell({
  cell
}: {
  cell: Cell<MatchTableData>;
}): JSX.Element {
  return <OnPlaySymbol isOnPlay={cell.value} />;
}

export function RankCell({
  cell
}: {
  cell: Cell<MatchTableData>;
}): JSX.Element {
  return (
    <FlexLeftContainer>
      <RankSymbol rank={cell.value} />
      {cell.value}
    </FlexLeftContainer>
  );
}
