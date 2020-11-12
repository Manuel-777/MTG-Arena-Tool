import React, {
  useEffect,
  SetStateAction,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import format from "date-fns/format";
import DeckList from "../components/misc/DeckList";
import {
  constants,
  Deck,
  getRankIndex,
  SeasonalRankData,
} from "mtgatool-shared";
import ReactSelect from "../../shared/ReactSelect";
import ManaCost from "../components/misc/ManaCost";
import ResultDetails from "../components/misc/ResultDetails";
import RankIcon from "../components/misc/RankIcon";
import store, { AppState } from "../../shared/redux/stores/rendererStore";
import {
  getSeasonal,
  seasonalExists,
  matchExists,
  getMatch,
} from "../../shared/store";
import { useSelector, useDispatch } from "react-redux";
import Button from "../components/misc/Button";
import { reduxAction } from "../../shared/redux/sharedRedux";
import { addMonths } from "date-fns";
import { PagingButton } from "../components/misc/PagingButton";

import appCss from "../app/app.css";
import topNavCss from "../components/main/topNav.css";
import sharedCss from "../../shared/shared.css";
import indexCss from "../index.css";
import css from "./TimelineTab.css";

const { SUB_MATCH, IPC_NONE } = constants;

function sortByTimestamp(a: SeasonalRankData, b: SeasonalRankData): number {
  return a.timestamp - b.timestamp;
}

/**
 * Get the ranks conversion to a Y coordinate
 * @param rank Rank name (string)
 * @param tier Level (number)
 * @param steps (number)
 */
function getRankY(rank: string, tier: number, steps: number): number {
  let value = 0;
  // Number of "shards" (levels) in each rank * the number of tiers
  const regularSteps = 4 * 6;
  switch (rank) {
    case "Bronze":
      value = regularSteps * 0;
      break;
    case "Silver":
      value = regularSteps * 1;
      break;
    case "Gold":
      value = regularSteps * 2;
      break;
    case "Platinum":
      value = regularSteps * 3;
      break;
    case "Diamond":
      value = regularSteps * 4;
      break;
    case "Mythic":
      value = regularSteps * 5;
      steps = steps == 0 ? 1500 : steps;
      return value + (48 / 1500) * (1500 - steps);
  }

  return value + 6 * (4 - tier) + steps;
}

const RANK_HEIGHTS = [
  getRankY("Bronze", 0, 0),
  getRankY("Silver", 0, 0),
  getRankY("Gold", 0, 0),
  getRankY("Platinum", 0, 0),
  getRankY("Diamond", 0, 0),
  getRankY("Mythic", 0, 1500),
  getRankY("Mythic", 0, 750),
  168  // getRankY("Mythic", 0, 1)
];

/**
 * Get the data for this season and add fields to the data for timeline processing
 * @param type season type ("constructed" or "limited")
 * @param seasonOrdinal Season number/id (optional)
 */
function getSeasonData(
  type = "constructed",
  seasonOrdinal?: number
): SeasonalRankData[] {
  const rank = store.getState().playerdata.rank;
  const seasonal = store.getState().seasonal.seasonal;
  if (!seasonOrdinal)
    seasonOrdinal = rank[type as "constructed" | "limited"].seasonOrdinal;

  let seasonalData: string[] | undefined = seasonal[`${type}_${seasonOrdinal}`];
  if (!seasonalData) return [];

  seasonalData = seasonalData.filter((v, i) => seasonalData?.indexOf(v) === i);

  function morphData(
    data: SeasonalRankData,
    prev?: SeasonalRankData
  ): SeasonalRankData {
    if (data.oldClass == "Mythic" && data.newClass == "Mythic") {
      // Added previous argument to help with mythic rank lines
      data.oldRankNumeric = prev
        ? getRankY(prev.oldClass, prev.oldLevel, prev.oldStep)
        : getRankY(data.oldClass, data.oldLevel, data.oldStep);
    } else {
      data.oldRankNumeric = getRankY(
        data.oldClass,
        data.oldLevel,
        data.oldStep
      );
    }
    data.newRankNumeric = getRankY(data.newClass, data.newLevel, data.newStep);
    data.date = new Date(data.timestamp);
    return data;
  }

  const newData = seasonalData
    .filter((id: string) => seasonalExists(id))
    .map((id: string) => getSeasonal(id) as SeasonalRankData);

  return newData
    .sort(sortByTimestamp)
    .filter((data: SeasonalRankData) => matchExists(data.lastMatchId))
    .map((data: SeasonalRankData, i: number) =>
      morphData(data, i > 0 ? newData[i - 1] : undefined)
    );
}

interface TimelinePartProps extends SeasonalRankData {
  index: number;
  width: number;
  height: number;
  hover: string;
  setHover: (match: string, deck: string) => void;
  setPartHover: React.Dispatch<SetStateAction<number>>;
  lastMatchId: string;
}

/**
 * Component for a line/stroke of the timeline
 * @param props
 */
function TimeLinePart(props: TimelinePartProps): JSX.Element {
  const {
    index,
    width,
    height,
    hover,
    setHover,
    setPartHover,
    lastMatchId,
  } = props;

  const deckId = matchExists(lastMatchId)
    ? getMatch(lastMatchId)?.playerDeck.id
    : "";

  const mouseIn = useCallback(() => {
    setHover(lastMatchId || "", deckId || "");
    setPartHover(index);
  }, [lastMatchId, deckId, index, setPartHover, setHover]);

  const newPointHeight = height - (props.newRankNumeric ? props.newRankNumeric * 2 : 0);
  const oldPointHeight = height - (props.oldRankNumeric ? props.oldRankNumeric * 2 : 0);
  const rectPoints = `0 ${oldPointHeight} ${width} ${newPointHeight} ${width} ${height} 0 ${height}`;
  const linePoints = `0 ${oldPointHeight} ${width} ${newPointHeight}`;

  const style = {
    // Get a color that is the modulus of the hex ID
    fill: `hsl(${parseInt(deckId || "", 16) % 360}, 64%, 63%)`,
  };

  return (
    <div
      style={style}
      className={`${css.timelineLine} ${hover == deckId ? css.hover : ""}`}
      onMouseEnter={mouseIn}
    >
      <svg width={width} height={height} version="1.1">
        {RANK_HEIGHTS.map((h: number) => {
          const hpos = height - h * 2;
          return (
            <polyline
              key={"poly-" + h}
              points={`0 ${hpos} ${width} ${hpos}`}
              stroke="var(--color-text)"
              strokeWidth="0.25"
            />
          );
        })}
        <polygon points={rectPoints} strokeWidth="0" />
        <polyline points={linePoints} strokeWidth="1" />
      </svg>
      {props.oldClass !== props.newClass ? (
        <TimelineRankBullet
          width={width}
          height={props.newRankNumeric ? props.newRankNumeric * 2 + 48 : 0}
          rankClass={props.newClass}
          rankLevel={props.newLevel}
        />
      ) : (
        <></>
      )}
    </div>
  );
}

interface RankBulletProps {
  width: number;
  height: number;
  rankClass: string;
  rankLevel: number;
}

/**
 * Component for a Rank "bullet" icon in the timeline
 * @param props
 */
function TimelineRankBullet(props: RankBulletProps): JSX.Element {
  const { width, height, rankClass, rankLevel } = props;

  const divStyle = {
    backgroundPosition: getRankIndex(rankClass, rankLevel) * -48 + "px 0px",
    //marginLeft: "-11px",
    top: `${336 - height}px`,
    left: `${(width - 48) / 2}px`,
    zIndex: -10,
  };

  const divTitle = rankClass + " " + rankLevel;
  return (
    <div
      style={divStyle}
      title={divTitle}
      className={`${css.timelineRank} ${topNavCss.topConstructedRank}`}
    />
  );
}

/**
 * Main component for the Timeline tab
 */
export default function TimelineTab(): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const rank = useSelector((state: AppState) => state.playerdata.rank);
  const dispatcher = useDispatch();
  const [hoverMatchId, setHoverMatchId] = useState("");
  const [hoverDeckId, setHoverDeckId] = useState("");
  const [hoverPart, setHoverPart] = useState(0);
  const [dimensions, setDimensions] = useState({
    height: 300,
    width: window.innerWidth - 110,
  });
  const [seasonType, setSeasonType] = useState<"constructed" | "limited">(
    "constructed"
  );
  const [drawingSeason, setDrawingSeason] = useState(
    rank[seasonType].seasonOrdinal
  );
  const seasonSelect = useSelector(
    (state: AppState) => state.seasonal.seasonal
  );

  // Notice we can see old seasons too adding the seasonOrdinal
  const data: SeasonalRankData[] = useMemo(() => {
    return getSeasonData(seasonType, drawingSeason);
  }, [seasonType, seasonSelect, drawingSeason]);

  const handleSetSeasonType = useCallback((type: string): void => {
    setSeasonType(type as "constructed" | "limited");
    setHoverMatchId("");
    setHoverDeckId("");
    setHoverPart(-1);
  }, []);

  const setHover = useCallback((match: string, deck: string) => {
    setHoverMatchId(match);
    setHoverDeckId(deck);
  }, []);

  const handleResize = useCallback((): void => {
    if (boxRef && boxRef.current) {
      setDimensions({
        height: boxRef.current.offsetHeight,
        width: boxRef.current.offsetWidth,
      });
    }
  }, [boxRef]);

  useEffect(() => {
    // We might want to add a delay here to avoid re-rendering too many times per second while resizing
    window.addEventListener("resize", handleResize);
    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    setTimeout(handleResize, 100);
  }, [handleResize]);

  const hoverMatch = useMemo(() => getMatch(hoverMatchId), [hoverMatchId]);
  const hoverDecklist = hoverMatch ? hoverMatch.playerDeck : undefined;

  const setPrevSeason = useCallback(() => {
    setDrawingSeason(drawingSeason - 1);
  }, [setDrawingSeason, drawingSeason]);

  const setNextSeason = useCallback(() => {
    setDrawingSeason(drawingSeason + 1);
  }, [setDrawingSeason, drawingSeason]);

  const openCurrentMatch = useCallback(() => {
    if (hoverMatch) {
      reduxAction(
        dispatcher,
        { type: "SET_BACK_GRPID", arg: hoverMatch.playerDeck.deckTileId },
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        {
          type: "SET_SUBNAV",
          arg: {
            type: SUB_MATCH,
            id: hoverMatch.id,
          },
        },
        IPC_NONE
      );
    }
  }, [dispatcher, hoverMatch]);

  const seasonZero = new Date(1543665600000);
  const drawingSeasonDate = addMonths(seasonZero, drawingSeason);

  const hoverPartX = (dimensions.width / data.length) * (hoverPart + 1) - 4;

  const match = getMatch(data[hoverPart]?.lastMatchId);
  const hData = data[hoverPart];

  const won = match ? match.player.win > match.opponent.win : false;

  return (
    <div className={appCss.uxItem}>
      <div className={indexCss.centeredUx}>
        <div
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          <div className={css.timelineTitle}>
            <PagingButton
              onClick={setPrevSeason}
              disabled={drawingSeason <= 1}
              selected={false}
            >
              {"<"}
            </PagingButton>
            <div style={{ lineHeight: "32px" }}>
              Season {drawingSeason} -{" "}
              {format(drawingSeasonDate as Date, "MMMM yyyy")}
            </div>
            <PagingButton
              onClick={setNextSeason}
              disabled={drawingSeason >= rank.constructed.seasonOrdinal}
              selected={false}
            >
              {">"}
            </PagingButton>
            <ReactSelect
              options={["constructed", "limited"]}
              current={seasonType}
              callback={handleSetSeasonType}
            />
          </div>
          <div style={{ display: "flex" }}>
            <div className={css.timelineBoxLabels}>
              <div className={css.timelineLabel}>#1</div>
              <div className={css.timelineLabel}></div>
              <div className={css.timelineLabel}>Mythic</div>
              <div className={css.timelineLabel}>Diamond</div>
              <div className={css.timelineLabel}>Platinum</div>
              <div className={css.timelineLabel}>Gold</div>
              <div className={css.timelineLabel}>Silver</div>
              <div className={css.timelineLabel}>Bronze</div>
            </div>
            <div className={css.timelineBox} ref={boxRef}>
              {data.length > 0 ? (
                data.map((value: SeasonalRankData, index: number) => {
                  //debugLog("From: ", value.oldClass, value.oldLevel, "step", value.oldStep, value.oldRankNumeric);
                  //debugLog("To:   ", value.newClass, value.newLevel, "step", value.newStep, value.newRankNumeric);
                  return (
                    <TimeLinePart
                      height={dimensions.height}
                      width={dimensions.width / data.length}
                      index={index}
                      key={index}
                      hover={hoverDeckId}
                      setHover={setHover}
                      setPartHover={setHoverPart}
                      {...value}
                    />
                  );
                })
              ) : (
                <div className={css.timelineWarning}>
                  No data for this ranked season.
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex" }}>
            <div className={css.timelineBoxLabels} />
            <div className={css.timelineBottomBox}>
              {hoverPart > -1 ? (
                <>
                  <div
                    className={css.timelinePos}
                    style={{ marginLeft: hoverPartX + "px" }}
                  />
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      marginLeft:
                        Math.min(dimensions.width - 120, hoverPartX) + "px",
                    }}
                  >
                    {data[hoverPart]
                      ? format(
                          data[hoverPart].date || new Date(),
                          "EEEE do, HH:mm"
                        )
                      : ""}
                  </div>
                </>
              ) : (
                <></>
              )}
            </div>
          </div>
          <div
            style={{
              margin: "0 28px",
              display: "flex",
            }}
          >
            <div
              className="card_lists_list"
              style={{ margin: "0", width: "50%" }}
            >
              {hoverMatch && hoverDecklist ? (
                <>
                  <div className={css.decklistName}>{hoverDecklist.name}</div>
                  <div className={css.decklistColors}>
                    <ManaCost
                      class={sharedCss.manaS20}
                      colors={hoverDecklist.colors || []}
                    />
                  </div>
                  <DeckList deck={new Deck(hoverDecklist)} />
                </>
              ) : (
                <></>
              )}
            </div>
            <div
              style={{
                margin: "0 auto",
                color: "var(--color-light)",
              }}
            >
              {match ? (
                <div
                  style={{
                    color: "var(--color-light)",
                    margin: "auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Button
                    text="Open match details"
                    onClick={openCurrentMatch}
                  />

                  <div>vs. {match.opponent.name.slice(0, -6)}</div>
                  <RankIcon
                    format={seasonType}
                    rank={match.opponent.rank}
                    tier={match.opponent.tier}
                    leaderboardPlace={match.opponent.leaderboardPlace || 0}
                    percentile={match.opponent.percentile || 0}
                  />
                  <div
                    style={{
                      lineHeight: "32px",
                      fontFamily: "var(--main-font-name-it}",
                      fontSize: "18px",
                    }}
                    className={won ? sharedCss.green : sharedCss.red}
                  >
                    {won ? "Win" : "Loss"}
                  </div>
                  <ResultDetails match={match} />
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RankIcon
                      format={seasonType}
                      rank={hData.oldClass}
                      tier={hData.oldLevel}
                      step={hData.oldStep}
                      leaderboardPlace={0}
                      percentile={0}
                    />
                    <div className={css.rankToRight} />
                    <RankIcon
                      format={seasonType}
                      rank={hData.newClass}
                      tier={hData.newLevel}
                      step={hData.newStep}
                      leaderboardPlace={0}
                      percentile={0}
                    />
                  </div>
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
