import { shell } from "electron";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { CARD_RARITIES, IPC_NONE } from "../../../shared/constants";
import ReactSelect from "../../../shared/ReactSelect";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { formatNumber } from "../../rendererUtil";
import { BoosterSymbol } from "../misc/BoosterSymbol";
import { CalendarSymbol } from "../misc/CalendarSymbol";
import Input from "../misc/Input";
import { MediumTextButton } from "../misc/MediumTextButton";
import { RaritySymbol } from "../misc/RaritySymbol";
import {
  ALL_CARDS,
  CollectionStats,
  FULL_SETS,
  SINGLETONS
} from "./collectionStats";
import CompletionProgressBar, {
  SetCompletionBar
} from "./CompletionProgressBar";
import { reduxAction } from "../../../shared-redux/sharedRedux";

const getRarityKey = (
  rarity: string
): "rare" | "common" | "uncommon" | "mythic" | undefined => {
  const rarityCode = rarity.toLowerCase();
  if (["rare", "common", "uncommon", "mythic"].includes(rarityCode))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rarityCode as any;
  return undefined;
};

export function CollectionStatsPanel({
  stats,
  boosterMath,
  clickCompletionCallback
}: {
  stats?: CollectionStats;
  boosterMath: boolean;
  clickCompletionCallback: () => void;
}): JSX.Element {
  const {
    countMode,
    rareDraftFactor,
    mythicDraftFactor,
    boosterWinFactor,
    futureBoosters
  } = useSelector((state: AppState) => state.collection);
  const dispatch = useDispatch();
  const playerEconomy = useSelector(
    (state: AppState) => state.playerdata.economy
  );
  if (!stats) {
    return <></>;
  }
  const setStats = stats.complete;
  const wanted: { [key: string]: number } = {};
  const missing: { [key: string]: number } = {};
  const filteredRarities = CARD_RARITIES.filter(rarity => {
    const key = getRarityKey(rarity);
    return !!key && setStats[key].total > 0;
  });
  filteredRarities.forEach(rarity => {
    const key = getRarityKey(rarity);
    if (key) {
      const countStats = setStats[key];
      wanted[key] = countStats.wanted;
      missing[key] = countStats.total - countStats.owned;
    }
  });
  const inputStyle = { width: "60px" };

  return (
    <>
      <div
        className={"decklist_top"}
        style={{
          margin: "12px",
          padding: "0",
          color: "var(--color-light)",
          display: "flex",
          alignItems: "center"
        }}
      >
        <div className={"economy_wc wc_common"}></div>
        <div>{formatNumber(playerEconomy.wcCommon)}</div>
        <div className={"economy_wc wc_uncommon"}></div>
        <div>{formatNumber(playerEconomy.wcUncommon)}</div>
        <div className={"economy_wc wc_rare"}></div>
        <div>{formatNumber(playerEconomy.wcRare)}</div>
        <div className={"economy_wc wc_mythic"}></div>
        <div>{formatNumber(playerEconomy.wcMythic)}</div>
      </div>
      <div className={"flex_item"}>
        <div className={"main_stats"}>
          <label>count:</label>
          <ReactSelect
            className={"stats_count_select"}
            style={{
              margin: "12px auto auto 4px",
              textAlign: "left",
              width: "180px",
              display: "inline-flex"
            }}
            options={[ALL_CARDS, SINGLETONS, FULL_SETS]}
            current={countMode}
            callback={(mode: string): void => {
              reduxAction(dispatch, "SET_COUNT_MODE", mode, IPC_NONE);
            }}
          />
          <SetCompletionBar
            countMode={countMode}
            setStats={setStats}
            setIconCode={""}
            setName={"Total Completion"}
            isSidebar
          />
          {filteredRarities.map(rarityCode => {
            const rarity = getRarityKey(rarityCode);
            if (rarity) {
              const countStats = setStats[rarity];
              const capitalizedRarity =
                rarity[0].toUpperCase() + rarity.slice(1) + "s";
              const globalStyle = getComputedStyle(document.body);
              return (
                <CompletionProgressBar
                  countMode={countMode}
                  key={rarity}
                  countStats={countStats}
                  image={globalStyle.getPropertyValue(`--wc_${rarity}_png`)}
                  title={capitalizedRarity}
                  isSidebar
                />
              );
            }
          })}
          {boosterMath ? (
            <>
              <div
                className={"deck_name"}
                style={{ width: "100%" }}
                title={"set completion estimator"}
              >
                Completion* <CalendarSymbol />:
              </div>
              <Input
                label={
                  <>
                    <RaritySymbol rarity={"rare"} /> rares/draft:
                  </>
                }
                value={rareDraftFactor}
                placeholder={"3"}
                title={"rare picks per draft"}
                contStyle={inputStyle}
                callback={(value: string): void => {
                  reduxAction(
                    dispatch,
                    "SET_RARE_DRAFT_FACTOR",
                    parseFloat(value),
                    IPC_NONE
                  );
                }}
              />
              <Input
                label={
                  <>
                    <RaritySymbol rarity={"mythic"} /> mythics/draft:
                  </>
                }
                value={mythicDraftFactor}
                placeholder={"0.14"}
                title={"mythic picks per draft"}
                contStyle={inputStyle}
                callback={(value: string): void => {
                  reduxAction(
                    dispatch,
                    "SET_MYTHIC_DRAFT_FACTOR",
                    parseFloat(value),
                    IPC_NONE
                  );
                }}
              />
              <Input
                label={
                  <>
                    <BoosterSymbol /> boosters/draft:
                  </>
                }
                value={boosterWinFactor}
                placeholder={"1.2"}
                title={"prize boosters awarded per draft"}
                contStyle={inputStyle}
                callback={(value: string): void => {
                  reduxAction(
                    dispatch,
                    "SET_BOOSTER_WIN_FACTOR",
                    parseFloat(value),
                    IPC_NONE
                  );
                }}
              />
              <Input
                label={
                  <>
                    <BoosterSymbol /> future boosters:
                  </>
                }
                value={futureBoosters}
                placeholder={"0"}
                title={"expected additional boosters, e.g. seasonal rewards"}
                contStyle={inputStyle}
                callback={(value: string): void => {
                  reduxAction(
                    dispatch,
                    "SET_FUTURE_BOOSTERS",
                    parseFloat(value),
                    IPC_NONE
                  );
                }}
              />
              <div
                className={"message_sub_15 white link"}
                onClick={(): void => {
                  shell.openExternal(
                    "https://www.mtggoldfish.com/articles/collecting-mtg-arena-part-1-of-2"
                  );
                }}
              >
                *[original by caliban on mtggoldfish]
              </div>
            </>
          ) : (
            <MediumTextButton onClick={clickCompletionCallback}>
              Completion Stats
            </MediumTextButton>
          )}
        </div>
      </div>
    </>
  );
}
