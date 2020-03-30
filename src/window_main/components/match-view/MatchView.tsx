import React, { useState } from "react";
import fs from "fs";
import path from "path";
import { InternalMatch, InternalPlayer } from "../../../types/match";
import ShareButton from "../misc/ShareButton";
import ManaCost from "../misc/ManaCost";
import Deck from "../../../shared/deck";
import { actionLogDir, ipcSend } from "../../rendererUtil";
import Button from "../misc/Button";
import DeckList from "../misc/DeckList";
import RankIcon from "../misc/RankIcon";
import db from "../../../shared/database";
import CardList from "../misc/CardList";
import CardsList from "../../../shared/cardsList";
import ActionLog from "./ActionLog";
import uxMove from "../../uxMove";
import { useDispatch } from "react-redux";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { IPC_NONE } from "../../../shared/constants";
import { getMatch } from "../../../shared-store";

interface MatchViewProps {
  match: InternalMatch;
}

const VIEW_MATCH = 1;
const VIEW_LOG = 2;

export function MatchView(props: MatchViewProps): JSX.Element {
  const { match } = props;
  const dispatcher = useDispatch();
  const [view, setView] = useState(VIEW_MATCH);
  const playerDeck = new Deck(match.playerDeck);
  const oppDeck = new Deck(match.oppDeck);

  const logExists = fs.existsSync(path.join(actionLogDir, match.id + ".txt"));
  let actionLogDataB64 = "";
  let actionLogDataString = "";
  if (logExists) {
    const actionLogFile = path.join(actionLogDir, match.id + ".txt");
    actionLogDataB64 = fs.readFileSync(actionLogFile).toString("base64");
    actionLogDataString = fs.readFileSync(actionLogFile).toString();
  }

  const goBack = (): void => {
    reduxAction(dispatcher, "SET_BACK_GRPID", 0, IPC_NONE);
    uxMove(0);
  };

  const openActionLog = (): void => {
    setView(VIEW_LOG);
  };

  const openMatch = (): void => {
    setView(VIEW_MATCH);
  };
  /*
  const mulliganType =
    match.eventId === "Lore_WAR3_Singleton" ||
    match.date > new Date("2019-07-02T15:00:00.000Z").getTime()
      ? "london"
      : "vancouver";
  */
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
        {view == VIEW_MATCH ? (
          <>
            <div className="flex_item">
              {logExists ? (
                <>
                  <Button
                    style={{ marginLeft: "auto" }}
                    onClick={openActionLog}
                    className="button_simple openLog"
                    text="Action log"
                  ></Button>
                  <ShareButton
                    type="actionlog"
                    data={{ log: actionLogDataB64, id: match.id }}
                  />
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
                won={match.player.win > match.opponent.win}
              />
              <Seat
                player={match.opponent}
                deck={oppDeck}
                eventId={match.eventId}
                won={match.opponent.win > match.player.win}
              />
            </div>
            <div>
              {match.gameStats.map((stats: any, index: number) => {
                if (stats)
                  return (
                    <GameStats
                      key={"stats-" + index}
                      index={index}
                      game={stats}
                    />
                  );
              })}
            </div>
          </>
        ) : (
          <>
            <Button
              style={{ margin: "auto" }}
              onClick={openMatch}
              className={"button_simple centered"}
              text="Go back"
            ></Button>
            <div className="actionlog-div">
              <ActionLog logStr={actionLogDataString} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

interface SeatProps {
  deck: Deck;
  eventId: string;
  player: InternalPlayer;
  won: boolean;
}

function Seat(props: SeatProps): JSX.Element {
  const { deck, player, eventId, won } = props;

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
      <div className="decklist">
        <div className="flex_item" style={{ justifyContent: "center" }}>
          <RankIcon
            rank={player.rank}
            tier={player.tier}
            percentile={player.percentile || 0}
            leaderboardPlace={player.leaderboardPlace || 0}
            format={isLimited ? "limited" : "constructed"}
          />
          <div className="match_player_name">
            {player.name.slice(0, -6)} ({player.win})
          </div>
          {won ? <div className="match_player_win"> Winner</div> : <></>}
        </div>
        <Button text="Add to Decks" onClick={clickAdd} />
        <Button text="Export to Arena" onClick={clickArena} />
        <Button text="Export to .txt" onClick={clickTxt} />
        <DeckList deck={deck} showWildcards={true} />
      </div>
    </>
  );
}

interface GameStatsProps {
  game: any;
  index: number;
}

function GameStats(props: GameStatsProps): JSX.Element {
  const { game, index } = props;

  const addedCards = new CardsList(
    game.sideboardChanges ? game.sideboardChanges.added : []
  );
  const removedCards = new CardsList(
    game.sideboardChanges ? game.sideboardChanges.removed : []
  );

  return (
    <div
      style={{
        marginTop: "24px",
        marginBottom: "24px",
        justifyContent: "center"
      }}
    >
      {game.sideboardChanges ? (
        <>
          <div className="card_tile_separator">
            Game {index + 1} Sideboard Changes
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {game.sideboardChanges.added.length == 0 &&
            game.sideboardChanges.removed.length == 0 ? (
              <div className="gamestats_subtitle red">No Changes</div>
            ) : (
              <>
                <div className="gamestats_side">
                  <div className="gamestats_subtitle green">Sideboarded In</div>
                  <div className="card_lists_list">
                    <CardList list={addedCards} />
                  </div>
                </div>
                <div className="gamestats_side">
                  <div className="gamestats_subtitle red">Sideboarded Out</div>
                  <div className="card_lists_list">
                    <CardList list={removedCards} />
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <></>
      )}
      <div className="card_tile_separator">Game {index + 1} Hands Drawn</div>
      {game.handsDrawn.map((hand: any, i: number) => {
        return (
          <React.Fragment key={"gsh-" + index + "-" + i}>
            <div className="gamestats_subtitle">#{i + 1}</div>
            <div className="card_lists_list">
              <CardList list={new CardsList(hand)} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function openMatchSub(matchId: string): JSX.Element {
  const match = getMatch(matchId);
  if (!match) return <div>{matchId}</div>;
  return <MatchView match={match} />;
}
