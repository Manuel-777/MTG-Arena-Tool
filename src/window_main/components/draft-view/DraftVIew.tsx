import React, { useCallback } from "react";
import pd from "../../../shared/playerData";
import Slider from "../Slider";
import DeckList from "../DeckList";
import Deck from "../../../shared/deck";
import { getCardImage } from "../../../shared/util";
import { PACK_SIZES } from "../../../shared/constants";
import useHoverCard from "../../hooks/useHoverCard";
import { DraftData } from "../../../types/draft";
import uxMove from "../../uxMove";

interface PickPack {
  pack: number;
  pick: number;
}

function positionFromPickPack(pp: PickPack, set: string): number {
  const packSize = PACK_SIZES[set] || 14;
  return pp.pick + pp.pack * packSize;
}

function pickPackFromPosition(position: number, set: string): PickPack {
  const packSize = PACK_SIZES[set] || 14;
  //const maxValue = packSize * 3;
  const pack = Math.floor(position / packSize);
  const pick = position % packSize;

  return { pack: pack, pick: pick };
}

interface DraftCardProps {
  grpId: number;
  pick: boolean;
}

function DraftCard(props: DraftCardProps): JSX.Element {
  const { grpId, pick } = props;
  const [hoverIn, hoverOut] = useHoverCard(grpId);

  const makeStyle = useCallback(() => {
    return {
      width: pd.cardsSize + "px",
      height: pd.cardsSize / 0.71808510638 + "px",
      backgroundImage: `url(${getCardImage(grpId)})`
    };
  }, [grpId]);

  return (
    <div
      style={makeStyle()}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
      className={"draft-card" + (pick ? " " + "draft-card-picked" : "")}
    />
  );
}

interface DraftViewProps {
  draft: DraftData;
}

export function DraftView(props: DraftViewProps): JSX.Element {
  const { draft } = props;
  const [pickpack, setPickPack] = React.useState({ pick: 0, pack: 0 });

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

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div className="decklist_top">
        <div className="button back" onClick={goBack}></div>
        <div className="deck_name">{draft.set + " Draft"}</div>
      </div>
      <div className="flex_item" style={{ flexDirection: "column" }}>
        <div className="draft-title">
          {`Pack ${pickpack.pack + 1}, Pick ${pickpack.pick + 1}`}
        </div>
        <Slider
          value={0}
          onChange={onSliderChange}
          max={(PACK_SIZES[draft.set] || 14) * 3 - 1}
        />
        <div className="draft-container">
          <div className="draft-view">
            {getCurrentPick().pack.map((grpId: number, index: number) => {
              return (
                <DraftCard
                  pick={getCurrentPick().pick == grpId}
                  key={pickpack.pack + "-" + pickpack.pick + "-" + index}
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
  const draft = pd.draft(draftId);
  if (!draft) return <div>{draftId}</div>;
  return <DraftView draft={draft} />;
}
