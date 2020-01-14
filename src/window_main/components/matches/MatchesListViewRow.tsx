import React from "react";
import autocomplete from "../../../shared/autocomplete";
import { DEFAULT_TILE } from "../../../shared/constants";
import { createDiv, createInput } from "../../../shared/dom-fns";
import { makeId } from "../../../shared/util";
import ListItem from "../../listItem";
import {
  attachMatchData,
  getTagColor,
  showColorpicker
} from "../../renderer-util";
import { useLegacyRenderer } from "../tables/hooks";
import { MatchesTableRowProps, SerializedMatch, TagCounts } from "./types";

const tagPrompt = "Set archetype";

const byId = (id: string): HTMLElement | null => document.getElementById(id);

function createTag(
  div: HTMLElement,
  matchId: string,
  tags: TagCounts,
  tag: string | null,
  showClose: boolean,
  addTagCallback: (id: string, tag: string) => void,
  editTagCallback: (tag: string, color: string) => void,
  deleteTagCallback: (id: string, tag: string) => void
): void {
  const tagCol = getTagColor(tag);
  const iid = makeId(6);
  const t = createDiv(["deck_tag", iid], tag || tagPrompt);
  t.style.backgroundColor = tagCol;

  if (tag) {
    t.addEventListener("click", function(e) {
      e.stopPropagation();
      showColorpicker(
        tagCol,
        color => (t.style.backgroundColor = color.rgbString),
        color => editTagCallback(tag, color.rgbString),
        () => (t.style.backgroundColor = tagCol)
      );
    });
  } else {
    t.addEventListener("click", function(e) {
      t.innerHTML = "";
      const ac = createDiv(["autocomplete"]);
      const input = createInput(["deck_tag_input"], "", {
        id: iid,
        type: "text",
        autocomplete: "off",
        placeholder: tagPrompt,
        size: 1
      });
      input.style.minWidth = "120px";
      input.addEventListener("keyup", function(e) {
        if (e.keyCode === 13) {
          e.stopPropagation();
          const val = this.value;
          if (val && val !== tagPrompt) {
            addTagCallback(matchId, val);
          }
        } else {
          setTimeout(() => {
            input.style.width = this.value.length * 8 + "px";
          }, 10);
        }
      });
      const focusAndSave = (): void => {
        input.focus();
        input.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 13 } as any));
      };
      autocomplete(input, tags, focusAndSave, focusAndSave);

      ac.appendChild(input);
      t.appendChild(ac);
      input.focus();

      e.stopPropagation();
    });
  }

  if (showClose && tag) {
    const tc = createDiv(["deck_tag_close"]);
    tc.addEventListener("click", function(e) {
      e.stopPropagation();
      tc.style.visibility = "hidden";
      deleteTagCallback(matchId, tag);
    });
    t.appendChild(tc);
  } else {
    t.style.paddingRight = "12px";
  }
  div.appendChild(t);
}

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

  if (match.tags && match.tags.length) {
    match.tags.forEach((tag: string) =>
      createTag(
        tagsDiv,
        match.id,
        tags,
        tag,
        true,
        addTagCallback,
        editTagCallback,
        deleteTagCallback
      )
    );
  } else {
    createTag(
      tagsDiv,
      match.id,
      tags,
      null,
      false,
      addTagCallback,
      editTagCallback,
      deleteTagCallback
    );
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
