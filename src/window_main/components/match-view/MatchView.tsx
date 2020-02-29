import React from "react";
import fs from "fs";
import path from "path";
import anime from "animejs";
import { InternalMatch, InternalPlayer } from "../../../types/match";
import pd from "../../../shared/player-data";
import { EASING_DEFAULT } from "../../../shared/constants";
import ShareButton from "../ShareButton";
import ManaCost from "../ManaCost";
import Deck from "../../../shared/deck";
import { actionLogDir, ipcSend } from "../../renderer-util";
import Button from "../Button";
import DeckList from "../DeckList";
import RankIcon from "../RankIcon";
import db from "../../../shared/database";

interface MatchViewProps {
  match: InternalMatch;
}

export function MatchView(props: MatchViewProps): JSX.Element {
  const { match } = props;
  const playerDeck = new Deck(match.playerDeck);
  const oppDeck = new Deck(match.oppDeck);

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
          <div className="deck_name">{playerDeck.getName()}</div>
          <div className="deck_top_colors">
            <ManaCost colors={playerDeck.getColors().get()} />
          </div>
        </div>
        <div className="flex_item">
          {logExists ? (
            <>
              <Button
                style={{ marginLeft: "auto" }}
                onClick={openActionLog}
                className="button_simple openLog"
                text="Action log"
              ></Button>
              <ShareButton type="actionlog" data={actionLogData} />
            </>
          ) : (
            <></>
          )}
        </div>
        <div className="flex_item">
          <Seat
            player={match.player}
            deck={playerDeck}
            eventId={match.eventId}
          />
          <Seat
            player={match.opponent}
            deck={oppDeck}
            eventId={match.eventId}
          />
        </div>
      </div>
    </>
  );
}

interface SeatProps {
  deck: Deck;
  eventId: string;
  player: InternalPlayer;
}

function Seat(props: SeatProps): JSX.Element {
  const { deck, player, eventId } = props;

  const isLimited = db.limited_ranked_events.includes(eventId);
  const clickAdd = (): void => {
    ipcSend("import_custom_deck", JSON.stringify(deck.getSave()));
  };

  const clickArena = (): void => {
    ipcSend("set_clipboard", deck.getExportArena());
  };

  const clickTxt = (): void => {
    const str = deck.getExportTxt();
    ipcSend("export_txt", { str, name: deck.getName() });
  };

  return (
    <>
      <div></div>
      <div className="decklist">
        <div className="flex_item" style={{ justifyContent: "center" }}>
          <RankIcon
            rank={player.rank}
            tier={player.tier}
            percentile={player.percentile || 0}
            leaderboardPlace={player.leaderboardPlace || 0}
            format={isLimited ? "limited" : "constructed"}
          />
          <div className="match_player_name">{player.name.slice(0, -6)}</div>
        </div>
        <Button text="Add to Decks" onClick={clickAdd} />
        <Button text="Export to Arena" onClick={clickArena} />
        <Button text="Export to .txt" onClick={clickTxt} />
        <DeckList deck={deck} />
      </div>
    </>
  );
}

export default function openMatchSub(matchId: string): JSX.Element {
  const match = pd.match(matchId);
  if (!match) return <div>{matchId}</div>;
  return <MatchView match={match} />;
}
