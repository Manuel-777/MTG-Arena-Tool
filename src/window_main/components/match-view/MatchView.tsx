import React from "react";
import fs from "fs";
import path from "path";
import anime from "animejs";
import { InternalMatch } from "../../../types/match";
import pd from "../../../shared/player-data";
import { EASING_DEFAULT } from "../../../shared/constants";
import ShareButton from "../ShareButton";
import ManaCost from "../ManaCost";
import Deck from "../../../shared/deck";
import { actionLogDir } from "../../renderer-util";
import Button from "../Button";

interface MatchViewProps {
  match: InternalMatch;
}

export function MatchView(props: MatchViewProps): JSX.Element {
  const { match } = props;
  const deck = new Deck(match.playerDeck);

  const logExists = fs.existsSync(path.join(actionLogDir, match.id + ".txt"));
  let actionLogData = "";
  if (logExists) {
    const actionLogFile = path.join(actionLogDir, match.id + ".txt");
    actionLogData = fs.readFileSync(actionLogFile).toString("base64");
  }

  const goBack = (): void => {
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  };

  const openActionLog = (): void => {
    //
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div className="decklist_top">
          <div className="button back" onClick={goBack}></div>
          <div className="deck_name">{deck.getName()}</div>
          <div className="deck_top_colors">
            <ManaCost colors={deck.getColors().get()} />
          </div>
        </div>
        <div className="flex_item">
          {logExists ?? (
            <>
              <Button
                style={{ marginLeft: "auto" }}
                onClick={openActionLog}
                className="button_simple openLog"
                text="Action log"
              ></Button>
              <ShareButton type="actionlog" data={actionLogData} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function openMatchSub(matchId: string): JSX.Element {
  const match = pd.match(matchId);
  if (!match) return <div>{matchId}</div>;
  return <MatchView match={match} />;
}
