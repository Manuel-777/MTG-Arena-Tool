import React, { useCallback } from "react";

import { CARD_TYPES } from "../shared/constants";
import { Chances } from "../window_background/types/decks";

export interface SampleSizePanelProps {
  cardOdds: Chances;
  cardsLeft: number;
  setOddsCallback: (option: number) => void;
}

export default function SampleSizePanel(
  props: SampleSizePanelProps
): JSX.Element {
  const { cardOdds, cardsLeft, setOddsCallback } = props;
  const sampleSize = cardOdds.sampleSize || 1;

  const handleOddsPrev = useCallback((): void => {
    let newSampleSize = sampleSize - 1;
    if (newSampleSize < 1) {
      newSampleSize = cardsLeft - 1;
    }
    setOddsCallback(newSampleSize);
  }, [sampleSize, cardsLeft]);

  const handleOddsNext = useCallback((): void => {
    const cardsLeft = cardOdds.cardsLeft || 60;
    let newSampleSize = sampleSize + 1;
    if (newSampleSize > cardsLeft - 1) {
      newSampleSize = 1;
    }
    setOddsCallback(newSampleSize);
  }, [sampleSize, cardsLeft]);

  return (
    <>
      <div className="overlay_samplesize_container">
        <div className="odds_prev click-on" onClick={handleOddsPrev} />
        <div className="odds_number">Sample size: {sampleSize}</div>
        <div className="odds_next click-on" onClick={handleOddsNext} />
      </div>
      <div className="chance_title" />
      {CARD_TYPES.map(type => {
        let value = 0;
        let field = "";
        switch (type) {
          case "Creatures":
            value = cardOdds["chanceCre"] / 100;
            field = "chanceCre";
            break;
          case "Lands":
            value = cardOdds["chanceLan"] / 100;
            field = "chanceLan";
            break;
          case "Instants":
            value = cardOdds["chanceIns"] / 100;
            field = "chanceIns";
            break;
          case "Sorceries":
            value = cardOdds["chanceSor"] / 100;
            field = "chanceSor";
            break;
          case "Enchantments":
            value = cardOdds["chanceEnc"] / 100;
            field = "chanceEnc";
            break;
          case "Artifacts":
            value = cardOdds["chanceArt"] / 100;
            field = "chanceArt";
            break;
          case "Planeswalkers":
            value = cardOdds["chancePla"] / 100;
            field = "chancePla";
            break;
        }
        const display = value.toLocaleString([], {
          style: "percent",
          maximumSignificantDigits: 2
        });
        return (
          <div className="chance_title" key={"chance_title_" + field}>
            {type}: {display}
          </div>
        );
      })}
    </>
  );
}
