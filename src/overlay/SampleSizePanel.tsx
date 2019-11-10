import React, { useCallback } from "react";

import { CARD_TYPES } from "../shared/constants";

export interface SampleSizePanelProps {
  cardOdds: { [key: string]: number };
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
        const abbrev = type.slice(0, 3);
        const field = "chance" + abbrev;
        const value = cardOdds[field] ? cardOdds[field] / 100 : 0;
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
