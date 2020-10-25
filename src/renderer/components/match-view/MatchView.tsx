import React, { useState, useCallback, useEffect } from "react";
import fs from "fs";
import path from "path";
import ShareButton from "../misc/ShareButton";
import ManaCost from "../misc/ManaCost";
import { actionLogDir } from "../../rendererUtil";
import { ipcSend } from "../../ipcSend";
import DeckList from "../misc/DeckList";
import RankIcon from "../misc/RankIcon";
import db from "../../../shared/database-wrapper";
import CardList from "../misc/CardList";
import ActionLog from "../../../shared/ActionLog";
import { useDispatch } from "react-redux";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import { getMatch } from "../../../shared/store";

import css from "./MatchView.css";
import indexCss from "../../index.css";
import sharedCss from "../../../shared/shared.css";
import cardTileCss from "../../../shared/CardTile/CardTile.css";
import SvgButton from "../misc/SvgButton";
import BackIcon from "../../../assets/images/svg/back.svg";
import CopyButton from "../../../assets/images/svg/copy.svg";
import IconCrown from "../../../assets/images/svg/crown.svg";
import IconTime from "../../../assets/images/svg/time.svg";
import IconEvent from "../../../assets/images/svg/event.svg";

import DeckColorsBar from "../misc/DeckColorsBar";
import { getCardArtCrop } from "../../../shared/utils/getCardArtCrop";
import Section from "../misc/Section";
import { MediumTextButton } from "../misc/MediumTextButton";
import Button from "../misc/Button";
import { toMMSS } from "../../../shared/utils/dateTo";
import Flex from "../misc/Flex";
import ResultDetails from "../misc/ResultDetails";
import {
  constants,
  CardsList,
  Deck,
  getEventPrettyName,
  MatchGameStats,
  InternalMatch,
} from "mtgatool-shared";

const { IPC_NONE } = constants;

interface MatchViewProps {
  match: InternalMatch;
}

const VIEW_MATCH = 1;
const VIEW_LOG = 2;

function MatchView(props: MatchViewProps): JSX.Element {
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
    reduxAction(dispatcher, { type: "SET_BACK_GRPID", arg: 0 }, IPC_NONE);
    reduxAction(dispatcher, { type: "SET_NAV_INDEX", arg: 0 }, IPC_NONE);
  };

  const openActionLog = (): void => {
    setView(VIEW_LOG);
  };

  const openMatch = (): void => {
    setView(VIEW_MATCH);
  };

  useEffect(() => {
    match.id;
    setView(VIEW_MATCH);
  }, [match.id]);

  const isLimited = db.limited_ranked_events.includes(match.eventId);

  // v4.1.0: Introduced by-game cards seen
  const gameDetails = match && match.toolVersion >= 262400;
  const [gameSeen, setGameSeen] = useState(0);

  let combinedList: number[] = [];
  if (gameDetails) {
    match?.gameStats.forEach((stats: MatchGameStats) => {
      if (stats) {
        combinedList = [...combinedList, ...stats.cardsSeen];
      }
    });
  }

  const deck =
    gameDetails && match
      ? new Deck(
          {},
          gameSeen == match?.gameStats?.length
            ? combinedList
            : match.gameStats[gameSeen]?.cardsSeen || combinedList
        )
      : oppDeck;

  const gamePrev = useCallback(() => {
    if (gameSeen > 0) setGameSeen(gameSeen - 1);
  }, [gameSeen]);
  const gameNext = useCallback(() => {
    if (match && gameSeen < match.gameStats.length) setGameSeen(gameSeen + 1);
  }, [gameSeen, match]);

  const clickAdd = (): void => {
    ipcSend("import_custom_deck", JSON.stringify(deck.getSave()));
    ipcSend("popup", {
      text: `Deck added to My Decks.`,
      time: 3000,
    });
  };

  const clickArena = (): void => {
    ipcSend("set_clipboard", deck.getExportArena());
    ipcSend("popup", {
      text: `Decklist copied to clipboard.`,
      time: 3000,
    });
  };

  const clickTxt = (): void => {
    const str = deck.getExportTxt();
    ipcSend("export_txt", { str, name: deck.getName() });
    ipcSend("popup", {
      text: `Deck exported to text file.`,
      time: 3000,
    });
  };

  const copyOppName = useCallback((): void => {
    ipcSend("set_clipboard", match.opponent.name);
    ipcSend("popup", {
      text: `Opponent's name copied to clipboard`,
      time: 3000,
    });
  }, [match]);

  /*
  const mulliganType =
    match.eventId === "Lore_WAR3_Singleton" ||
    match.date > new Date("2019-07-02T15:00:00.000Z").getTime()
      ? "london"
      : "vancouver";
  */
  const duration = match.gameStats.reduce((acc, cur) => acc + cur.time, 0);

  const pw = match.player.win;
  const ow = match.opponent.win;
  return (
    <>
      <div className={indexCss.centeredUx}>
        <div>
          <div
            className={indexCss.top}
            style={{
              backgroundImage: `url(${getCardArtCrop(playerDeck.tile)})`,
            }}
          >
            <DeckColorsBar deck={playerDeck} />
            <div className={indexCss.topInner}>
              <div className={indexCss.flexItem}>
                <SvgButton
                  style={{
                    marginRight: "8px",
                    backgroundColor: "var(--color-section)",
                  }}
                  svg={BackIcon}
                  onClick={goBack}
                />
                <div
                  style={{
                    lineHeight: "32px",
                    color: "var(--color-text-hover)",
                    textShadow: "3px 3px 6px #000000",
                  }}
                >
                  {playerDeck.getName()}
                </div>
              </div>
              <div className={indexCss.flexItem}>
                <ManaCost
                  class={sharedCss.manaS20}
                  colors={playerDeck.getColors().get()}
                />
              </div>
            </div>
          </div>
          <div className={css.matchViewGrid}>
            <Section
              style={{
                lineHeight: "36px",
                padding: "16px",
                gridArea: "controls",
                justifyContent: "space-between",
              }}
            >
              <Flex>
                <IconCrown
                  style={{ margin: "auto 16px auto 8px" }}
                  fill={"var(--color-icon-subtle)"}
                />
                <div
                  className={css.matchTopResult}
                  style={{ color: `var(--color-${pw > ow ? "g" : "r"})` }}
                >{`${pw}-${ow}`}</div>
                <ResultDetails match={match} />
              </Flex>
              <Flex>
                <IconEvent
                  style={{ margin: "auto 16px auto 8px" }}
                  fill={"var(--color-icon-subtle)"}
                />
                <div>{getEventPrettyName(match.eventId)}</div>
              </Flex>
              <Flex>
                <IconTime
                  style={{ margin: "auto 16px auto 8px" }}
                  fill={"var(--color-icon-subtle)"}
                />
                <div>{toMMSS(duration)}</div>
              </Flex>
              {view == VIEW_MATCH ? (
                <Button
                  onClick={openActionLog}
                  className={indexCss.buttonSimple + " openLog"}
                  disabled={!logExists}
                  text="Action log"
                />
              ) : (
                <Button
                  onClick={openMatch}
                  className={indexCss.buttonSimple}
                  text="Match"
                />
              )}
              <ShareButton
                type="actionlog"
                data={{ log: actionLogDataB64, id: match.id }}
              />
            </Section>

            <Section
              style={{
                padding: "16px",
                justifyContent: "space-between",
                gridArea: "name",
              }}
            >
              <Flex>
                <div className={css.matchPlayerName}>
                  vs {match.opponent.name.slice(0, -6)}
                </div>
                <SvgButton
                  style={{ margin: "auto 2px" }}
                  svg={CopyButton}
                  onClick={copyOppName}
                />
              </Flex>
              <RankIcon
                rank={match.opponent.rank}
                tier={match.opponent.tier}
                percentile={match.opponent.percentile || 0}
                leaderboardPlace={match.opponent.leaderboardPlace || 0}
                format={isLimited ? "limited" : "constructed"}
              />
              <Flex>
                <ManaCost colors={oppDeck.colors.get()} />
              </Flex>
            </Section>

            <Section
              style={{
                padding: "16px 10px",
                flexDirection: "column",
                gridArea: "buttons",
              }}
            >
              {gameDetails && match && (
                <div
                  style={{
                    display: "flex",
                    lineHeight: "32px",
                    marginBottom: "16px",
                    justifyContent: "space-around",
                  }}
                >
                  <SvgButton svg={BackIcon} onClick={gamePrev} />
                  <div
                    style={{
                      maxWidth: "130px",
                      textAlign: "center",
                      width: "-webkit-fill-available",
                    }}
                  >
                    {gameSeen == match.gameStats.length
                      ? `Combined`
                      : `Seen in game ${gameSeen + 1}`}
                  </div>
                  <SvgButton
                    style={{ transform: "rotate(180deg)" }}
                    svg={BackIcon}
                    onClick={gameNext}
                  />
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <MediumTextButton
                  style={{ width: "auto", padding: "0 10px" }}
                  onClick={clickAdd}
                >
                  Add to Decks
                </MediumTextButton>
                <MediumTextButton
                  style={{ width: "auto", padding: "0 10px" }}
                  onClick={clickArena}
                >
                  Export to Arena
                </MediumTextButton>
                <MediumTextButton
                  style={{ width: "auto", padding: "0 10px" }}
                  onClick={clickTxt}
                >
                  Export to .txt
                </MediumTextButton>
              </div>
            </Section>

            <Section
              style={{
                padding: "16px",
                flexDirection: "column",
                gridArea: "deck",
              }}
            >
              <DeckList deck={deck} showWildcards={true} />
            </Section>

            <Section
              style={{
                padding: view == VIEW_MATCH ? "16px" : "",
                gridArea: "right",
                flexDirection: "column",
              }}
            >
              {view == VIEW_LOG ? (
                <ActionLog logStr={actionLogDataString} />
              ) : match.gameStats[gameSeen] ? (
                <GameStats index={gameSeen} game={match.gameStats[gameSeen]} />
              ) : (
                <></>
              )}
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

interface GameStatsProps {
  game: MatchGameStats;
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
        width: "100%",
      }}
    >
      {game.sideboardChanges ? (
        <>
          <div className={cardTileCss.cardTileSeparator}>
            Game {index + 1} Sideboard Changes
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {game.sideboardChanges.added.length == 0 &&
            game.sideboardChanges.removed.length == 0 ? (
              <div className={`${css.gamestats_subtitle} ${sharedCss.red}`}>
                No Changes
              </div>
            ) : (
              <>
                <div className={css.gamestatsSide}>
                  <div
                    className={`${css.gamestatsSubtitle} ${sharedCss.green}`}
                  >
                    Sideboarded In
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <CardList list={addedCards} />
                  </div>
                </div>
                <div className={css.gamestatsSide}>
                  <div className={`${css.gamestatsSubtitle} ${sharedCss.red}`}>
                    Sideboarded Out
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
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
      <div className={cardTileCss.cardTileSeparator}>
        Game {index + 1} Hands Drawn
      </div>
      {game.handsDrawn.map((hand: any, i: number) => {
        return (
          <React.Fragment key={"gsh-" + index + "-" + i}>
            <div className={css.gamestatsSubtitle}>#{i + 1}</div>
            <div className={indexCss.cardListsList}>
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
