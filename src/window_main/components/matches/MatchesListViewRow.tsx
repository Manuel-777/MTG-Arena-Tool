import React from "react";
import { DEFAULT_TILE } from "../../../shared/constants";
import ListItem from "../../listItem";
import { attachMatchData } from "../../renderer-util";
import { renderNewTag, renderTagBubbleWithClose } from "../display";
import { useLegacyRenderer } from "../tables/hooks";
import { TagCounts } from "../tables/types";
import { MatchesTableRowProps, SerializedMatch } from "./types";

const tagPrompt = "Set archetype";

const byId = (id: string): HTMLElement | null => document.getElementById(id);

function renderData(
  container: HTMLElement,
  match: SerializedMatch,
  tags: TagCounts,
  openMatchCallback: (matchId: string | number) => void,
  archiveCallback: (id: string | number) => void,
  addTagCallback: (id: string, tag: string) => void,
  editTagCallback: (tag: string, color: string) => void,
  deleteTagCallback: (id: string, tag: string) => void
): void {
  container.innerHTML = "";
  const tileGrpid = match.playerDeck.deckTileId ?? DEFAULT_TILE;
  const listItem = new ListItem(
    tileGrpid,
    match.id,
    openMatchCallback,
    archiveCallback,
    match.archived
  );
  listItem.divideLeft();
  listItem.divideRight();

  attachMatchData(listItem, match);
  container.appendChild(listItem.container);

  // Render tag
  const tagsDiv = byId("matches_tags_" + match.id);
  if (!tagsDiv) {
    return;
  }
  tagsDiv?.addEventListener("click", (e): void => e.stopPropagation());
  if (match.tags && match.tags.length) {
    match.tags.forEach((tag: string) =>
      renderTagBubbleWithClose(tagsDiv, {
        parentId: match.id,
        tag,
        editTagCallback,
        deleteTagCallback
      })
    );
  } else {
    renderNewTag(tagsDiv, {
      parentId: match.id,
      addTagCallback,
      tagPrompt,
      tags,
      title: "set custom match archetype"
    });
  }
}

export default function MatchesListViewRow({
  row,
  tags,
  openMatchCallback,
  archiveCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback
}: MatchesTableRowProps): JSX.Element {
  const containerRef = useLegacyRenderer(
    renderData,
    row.original,
    tags,
    openMatchCallback,
    archiveCallback,
    addTagCallback,
    editTagCallback,
    deleteTagCallback
  );
  return <div title={"show match details"} ref={containerRef} />;
}
