import { shell } from "electron";
import React from "react";
import { CARD_RARITIES } from "../../../shared/constants";
import pd from "../../../shared/player-data";
import { ReactSelect } from "../../../shared/ReactSelect";
import {
  ALL_CARDS,
  CollectionStats,
  FULL_SETS,
  SINGLETONS
} from "../../collection/collectionStats";
import { formatNumber } from "../../renderer-util";
import { useBlurOnEnter } from "../tables/hooks";
import CompletionProgressBar, {
  SetCompletionBar
} from "./CompletionProgressBar";

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
  countMode,
  boosterMath,
  rareDraftFactor,
  mythicDraftFactor,
  boosterWinFactor,
  futureBoosters,
  setCountMode,
  setRareDraftFactor,
  setMythicDraftFactor,
  setBoosterWinFactor,
  setFutureBoosters
}: {
  stats?: CollectionStats;
  countMode: string;
  boosterMath: boolean;
  rareDraftFactor: number;
  mythicDraftFactor: number;
  boosterWinFactor: number;
  futureBoosters: number;
  setCountMode: (mode: string) => void;
  setRareDraftFactor: (factor: number) => void;
  setMythicDraftFactor: (factor: number) => void;
  setBoosterWinFactor: (factor: number) => void;
  setFutureBoosters: (factor: number) => void;
}): JSX.Element {
  const [rareDraftInputRef, rareDraftOnKey] = useBlurOnEnter();
  const [mythicDraftInputRef, mythicDraftOnKey] = useBlurOnEnter();
  const [boosterWinInputRef, boosterWinOnKey] = useBlurOnEnter();
  const [futureBoostersInputRef, futureBoostersOnKey] = useBlurOnEnter();
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
        <div>{formatNumber(pd.economy.wcCommon)}</div>
        <div className={"economy_wc wc_uncommon"}></div>
        <div>{formatNumber(pd.economy.wcUncommon)}</div>
        <div className={"economy_wc wc_rare"}></div>
        <div>{formatNumber(pd.economy.wcRare)}</div>
        <div className={"economy_wc wc_mythic"}></div>
        <div>{formatNumber(pd.economy.wcMythic)}</div>
      </div>
      <div className={"flex_item"}>
        <div className={"main_stats"}>
          <label>
            count:
            <div
              className={"select_container stats_count_select"}
              style={{
                margin: "12px auto auto 4px",
                textAlign: "left",
                width: "180px",
                display: "inline-flex"
              }}
            >
              <ReactSelect
                options={[ALL_CARDS, SINGLETONS, FULL_SETS]}
                current={countMode}
                callback={setCountMode}
              />
            </div>
          </label>
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
          {boosterMath && (
            <>
              <div className={"deck_name"} style={{ width: "100%" }}>
                Draft Estimator*:
              </div>
              <label className={"but_container_label"}>
                rares/draft:
                <div className={"input_container"}>
                  <input
                    ref={rareDraftInputRef}
                    type={"text"}
                    autoComplete={"off"}
                    placeholder={"3"}
                    defaultValue={rareDraftFactor}
                    onKeyUp={rareDraftOnKey}
                    onBlur={(): void => {
                      if (rareDraftInputRef?.current) {
                        const newFactor = parseFloat(
                          rareDraftInputRef?.current.value
                        );
                        if (newFactor !== rareDraftFactor) {
                          setRareDraftFactor(newFactor);
                        }
                      }
                    }}
                  />
                </div>
              </label>
              <label className={"but_container_label"}>
                mythics/draft:
                <div className={"input_container"}>
                  <input
                    ref={mythicDraftInputRef}
                    type={"text"}
                    autoComplete={"off"}
                    placeholder={"0.14"}
                    defaultValue={mythicDraftFactor}
                    onKeyUp={mythicDraftOnKey}
                    onBlur={(): void => {
                      if (mythicDraftInputRef?.current) {
                        const newFactor = parseFloat(
                          mythicDraftInputRef?.current.value
                        );
                        if (newFactor !== mythicDraftFactor) {
                          setMythicDraftFactor(newFactor);
                        }
                      }
                    }}
                  />
                </div>
              </label>
              <label className={"but_container_label"}>
                boosters/draft:
                <div className={"input_container"}>
                  <input
                    ref={boosterWinInputRef}
                    type={"text"}
                    autoComplete={"off"}
                    placeholder={"1.2"}
                    defaultValue={boosterWinFactor}
                    onKeyUp={boosterWinOnKey}
                    onBlur={(): void => {
                      if (boosterWinInputRef?.current) {
                        const newFactor = parseFloat(
                          boosterWinInputRef?.current.value
                        );
                        if (newFactor !== boosterWinFactor) {
                          setBoosterWinFactor(newFactor);
                        }
                      }
                    }}
                  />
                </div>
              </label>
              <label className={"but_container_label"}>
                future boosters:
                <div className={"input_container"}>
                  <input
                    ref={futureBoostersInputRef}
                    type={"text"}
                    autoComplete={"off"}
                    placeholder={"0"}
                    defaultValue={futureBoosters}
                    onKeyUp={futureBoostersOnKey}
                    onBlur={(): void => {
                      if (futureBoostersInputRef?.current) {
                        const newFactor = parseFloat(
                          futureBoostersInputRef?.current.value
                        );
                        if (newFactor !== futureBoosters) {
                          setFutureBoosters(newFactor);
                        }
                      }
                    }}
                  />
                </div>
              </label>
              <div className={"settings_note"} style={{ opacity: "0.6" }}>
                <i>
                  <a
                    onClick={(): Promise<void> =>
                      shell.openExternal(
                        "https://www.mtggoldfish.com/articles/collecting-mtg-arena-part-1-of-2"
                      )
                    }
                  >
                    *[original by caliban on mtggoldfish]
                  </a>
                </i>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
