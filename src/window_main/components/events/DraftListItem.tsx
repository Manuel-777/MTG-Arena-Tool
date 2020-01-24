import React from "react";
import { addCardHover } from "../../../shared/cardHover";
import { DEFAULT_TILE } from "../../../shared/constants";
import db from "../../../shared/database";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import { DbCardData } from "../../../shared/types/Metadata";
import { getCardArtCrop, openScryfallCard } from "../../../shared/util";
import createShareButton from "../../createShareButton";
import { draftShareLink } from "../../renderer-util";
import ListItem, { ListItemProps } from "../ListItem";
import { useLegacyRenderer } from "../tables/hooks";

export function DraftCardIcon({ card }: { card: DbCardData }): JSX.Element {
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      addCardHover(containerDiv, card);
    }
  }, [card, containerEl]);
  return (
    <div
      ref={containerEl}
      className={"round_card rarity-overlay " + card.rarity}
      title={card.name}
      style={{
        backgroundImage: `url("${getCardArtCrop(card)}")`
      }}
      onClick={(): void =>
        openScryfallCard(card.dfcId ? db.card(card.dfcId) : card)
      }
    />
  );
}

function renderButton(container: HTMLElement, draft: any): void {
  container.innerHTML = "";
  const replayShareButton = createShareButton(
    ["list_draft_share", draft.id + "dr"],
    () => draftShareLink(draft.id, draft)
  );
  replayShareButton.title = "share draft replay";
  container.appendChild(replayShareButton);
}

export function DraftShareButton({ draft }: { draft: any }): JSX.Element {
  const containerRef = useLegacyRenderer(renderButton, draft);
  return (
    <div
      ref={containerRef}
      className={"flex_item"}
      title={"share draft replay"}
    />
  );
}

export interface DraftListItemProps {
  draft: any;
  openDraftCallback: (deckId: string | number) => void;
}

export function DraftListItem({
  draft,
  openDraftCallback
}: DraftListItemProps): JSX.Element {
  const grpId = db.sets[draft.set]?.tile ?? DEFAULT_TILE;
  const parentId = draft.id ?? "";
  const onClick = (): void => openDraftCallback(parentId);
  const left = {
    top: <div className={"list_deck_name"}>{draft.set} draft</div>
  };
  const highlightCards: DbCardData[] = draft.pickedCards
    .map((cardId: number) => db.card(cardId))
    .filter(
      (card?: DbCardData) =>
        card?.rarity === "rare" || card?.rarity === "mythic"
    );
  const center = (
    <div className={"flex_item"} style={{ margin: "auto" }}>
      {highlightCards.map((card, index) => (
        <DraftCardIcon key={index} card={card} />
      ))}
    </div>
  );
  const right = {
    top: <div className={"list_match_replay"}>See replay</div>,
    bottom: (
      <div className={"list_match_time"}>
        {draft.date ? (
          <RelativeTime datetime={new Date(draft.date).toISOString()} />
        ) : (
          "Unknown"
        )}
      </div>
    ),
    after: <DraftShareButton draft={draft} />
  };
  const listItemProps: ListItemProps = {
    grpId,
    left,
    center,
    right,
    onClick
  };
  return <ListItem {...listItemProps} title={"show deck details"} />;
}
