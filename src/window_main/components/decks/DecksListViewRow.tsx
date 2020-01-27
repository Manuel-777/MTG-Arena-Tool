import React from "react";
import { DEFAULT_TILE } from "../../../shared/constants";
import ListItem from "../../listItem";
import { attachDeckData } from "../../renderer-util";
import { renderNewTag, renderTagBubble } from "../display";
import { useLegacyRenderer } from "../tables/hooks";
import { TagCounts } from "../tables/types";
import { DecksTableRowProps, DecksData } from "./types";

const tagPrompt = "Add";

function renderData(
  container: HTMLElement,
  deck: DecksData,
  tags: TagCounts,
  openDeckCallback: (deckId: string | number) => void,
  archiveCallback: (id: string | number) => void,
  addTagCallback: (id: string, tag: string) => void,
  editTagCallback: (tag: string, color: string) => void,
  deleteTagCallback: (id: string, tag: string) => void
): void {
  container.innerHTML = "";
  const tileGrpid = deck.deckTileId ?? DEFAULT_TILE;

  const parentId = deck.id ?? "";

  // e.stopPropagation will not work across React/non-React boundary???
  // hack to manually prevent tag clicks from causing a drilldown action
  let disableDrilldown = false;
  const setDisableDrilldown = (value: boolean): void => {
    disableDrilldown = value;
  };
  const onRowClick = (): void => {
    if (disableDrilldown) {
      return;
    }
    openDeckCallback(parentId);
  };
  const onTagHoverIn = (): void => {
    setDisableDrilldown(true);
  };
  const onTagHoverOut = (): void => {
    setDisableDrilldown(false);
  };
  const customizeTag = (tag: HTMLElement): void => {
    tag.style.marginRight = "8px";
    // hack to manually prevent tag clicks from causing a drilldown action
    tag.addEventListener("mouseover", onTagHoverIn);
    tag.addEventListener("mouseout", onTagHoverOut);
  };

  const listItem = new ListItem(
    tileGrpid,
    parentId,
    onRowClick,
    archiveCallback,
    deck.archived
  );
  listItem.divideLeft();
  listItem.divideCenter();
  listItem.divideRight();
  attachDeckData(listItem, deck);
  container.appendChild(listItem.container);

  const tagsDiv = listItem.centerTop;
  tagsDiv.classList.add("deck_tags_container");
  const formatBubble = renderTagBubble(tagsDiv, {
    parentId,
    tag: deck.format ?? "unknown",
    editTagCallback,
    fontStyle: "italic",
    hideCloseButton: true
  });
  customizeTag(formatBubble);
  if (deck.tags?.length) {
    deck.tags.forEach((tag: string) => {
      const tagBubble = renderTagBubble(tagsDiv, {
        parentId,
        tag,
        editTagCallback,
        deleteTagCallback
      });
      customizeTag(tagBubble);
    });
  }
  const tagBubble = renderNewTag(tagsDiv, {
    parentId,
    addTagCallback,
    tagPrompt,
    tags,
    title: "Add custom deck tag"
  });
  customizeTag(tagBubble);
}

export default function DecksListViewRow({
  row,
  tags,
  openDeckCallback,
  archiveCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback
}: DecksTableRowProps): JSX.Element {
  const containerRef = useLegacyRenderer(
    renderData,
    row.original,
    tags,
    openDeckCallback,
    archiveCallback,
    addTagCallback,
    editTagCallback,
    deleteTagCallback
  );
  return <div title={"show deck details"} ref={containerRef} />;
}
