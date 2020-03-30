import React, { useCallback } from "react";
import Slider, { SliderPosition } from "../misc/Slider";
import DeckList from "../misc/DeckList";
import Deck from "../../../shared/deck";
import { getCardImage, getRankColorClass } from "../../../shared/util";
import { PACK_SIZES, DRAFT_RANKS } from "../../../shared/constants";
import useHoverCard from "../../hooks/useHoverCard";
import { DraftData } from "../../../types/draft";
import uxMove from "../../uxMove";
import db from "../../../shared/database";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { getDraft } from "../../../shared-store";

interface PickPack {
  pack: number;
  pick: number;
}

const DEFAULT_PACK_SIZE = 14;

function positionFromPickPack(pp: PickPack, set: string): number {
  const packSize = PACK_SIZES[set] ?? DEFAULT_PACK_SIZE;
  return pp.pick + pp.pack * packSize;
}

function pickPackFromPosition(position: number, set: string): PickPack {
  const packSize = PACK_SIZES[set] ?? DEFAULT_PACK_SIZE;
  //const maxValue = packSize * 3;
  const pack = Math.floor(position / packSize);
  const pick = position % packSize;

  return { pack: pack, pick: pick };
}

interface DraftCardProps {
  grpId: number;
  pick: boolean;
  size: number;
}

function DraftCard(props: DraftCardProps): JSX.Element {
  const { grpId, pick, size } = props;
  const cardQuality = useSelector(
    (state: AppState) => state.settings.cards_quality
  );
  const [hoverIn, hoverOut] = useHoverCard(grpId);

  const card = db.card(grpId);

  const makeStyle = useCallback(() => {
    return {
      width: size + "px",
      height: size / 0.71808510638 + "px",
      backgroundImage: `url(${getCardImage(grpId, cardQuality)})`
    };
  }, [grpId, size]);

  return (
    <div className="draft-card-cont">
      <div
        style={makeStyle()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        className={"draft-card" + (pick ? " " + "draft-card-picked" : "")}
      />
      <div
        className={
          "draft-card-rank " +
          getRankColorClass(DRAFT_RANKS[card ? card.rank : 0])
        }
      >
        {card ? DRAFT_RANKS[card.rank] : "-"}
      </div>
    </div>
  );
}

interface DraftViewProps {
  draft: DraftData;
}

export function DraftView(props: DraftViewProps): JSX.Element {
  const { draft } = props;
  const [pickpack, setPickPack] = React.useState({ pick: 0, pack: 0 });
  const cardSize =
    100 + useSelector((state: AppState) => state.settings.cards_size) * 15;
  const maxPosition = (PACK_SIZES[draft.set] ?? DEFAULT_PACK_SIZE) * 3 - 1;

  const downHandler = React.useCallback(
    (event: KeyboardEvent): void => {
      const key = event.key;
      let position = positionFromPickPack(pickpack, draft.set);
      if (key === "ArrowLeft") {
        position -= 1;
      } else if (key === "ArrowRight") {
        position += 1;
      }
      if (position < 0) {
        position = maxPosition;
      } else if (position > maxPosition) {
        position = 0;
      }
      setPickPack(pickPackFromPosition(position, draft.set));
    },
    [maxPosition, pickpack, draft.set]
  );

  React.useEffect(() => {
    window.addEventListener("keydown", downHandler);
    return (): void => {
      window.removeEventListener("keydown", downHandler);
    };
  }, [downHandler]);

  const goBack = (): void => {
    uxMove(0);
  };

  const onSliderChange = useCallback(
    (value: number) => {
      setPickPack(pickPackFromPosition(value, draft.set));
    },
    [draft.set]
  );

  const getCurrentPick = useCallback(() => {
    const key = `pack_${pickpack.pack}pick_${pickpack.pick}`;
    return draft[key] ? draft[key] : { pick: 0, pack: [] };
  }, [draft, pickpack.pack, pickpack.pick]);

  const getCurrentDeck = useCallback((): Deck => {
    const pos = positionFromPickPack(pickpack, draft.set);
    const decklist = new Deck();

    for (let i = 0; i < pos; i++) {
      const pp = pickPackFromPosition(i, draft.set);
      const key = `pack_${pp.pack}pick_${pp.pick}`;
      decklist.getMainboard().add(draft[key].pick);
    }
    decklist.getMainboard().removeDuplicates();
    return decklist;
  }, [draft, pickpack]);

  const sliderPositions = Array(maxPosition + 1).fill(new SliderPosition());
  sliderPositions[
    positionFromPickPack({ pick: 0, pack: 0 }, draft.set)
  ] = new SliderPosition("Pack 1");
  sliderPositions[
    positionFromPickPack({ pick: 0, pack: 1 }, draft.set)
  ] = new SliderPosition("Pack 2");
  sliderPositions[
    positionFromPickPack({ pick: 0, pack: 2 }, draft.set)
  ] = new SliderPosition("Pack 3");

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div className="decklist_top">
        <div className="button back" onClick={goBack}></div>
        <div className="deck_name">{draft.set + " Draft"}</div>
      </div>
      <div
        className="flex_item"
        style={{ flexDirection: "column", margin: "0 32px" }}
      >
        <div className="draft-title">
          {`Pack ${pickpack.pack + 1}, Pick ${pickpack.pick + 1}`}
        </div>
        <Slider
          containerStyle={{ margin: "8px 0 30px 0" }}
          value={positionFromPickPack(pickpack, draft.set)}
          onChange={onSliderChange}
          max={maxPosition}
          positions={sliderPositions}
        />
        <div className="draft-container">
          <div
            className="draft-view"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(${cardSize +
                12}px, 1fr))`
            }}
          >
            {getCurrentPick().pack.map((grpId: number, index: number) => {
              return (
                <DraftCard
                  pick={getCurrentPick().pick == grpId}
                  key={pickpack.pack + "-" + pickpack.pick + "-" + index}
                  size={cardSize}
                  grpId={grpId}
                />
              );
            })}
          </div>
          <div className="draft-deck-view">
            <DeckList deck={getCurrentDeck()} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function openDraftSub(draftId: string): JSX.Element {
  const draft = getDraft(draftId);
  if (!draft) return <div>{draftId}</div>;
  return <DraftView draft={draft} />;
}
