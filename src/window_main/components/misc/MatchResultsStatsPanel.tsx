import React from "react";
import { useSelector } from "react-redux";
import { MANA, RANKS } from "../../../shared/constants";
import ReactSelect from "../../../shared/ReactSelect";
import {
  get_rank_index as getRankIndex,
  toDDHHMMSS,
  toMMSS
} from "../../../shared/util";
import Aggregator, { AggregatorStats } from "../../aggregator";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import {
  compareWinrates,
  formatPercent,
  getTagColor,
  getWinrateClass
} from "../../rendererUtil";

const { RANKED_CONST, RANKED_DRAFT } = Aggregator;

function ColoredWinrate({ stats }: { stats: AggregatorStats }): JSX.Element {
  const colClass = getWinrateClass(stats.winrate);
  const title = `${stats.wins} matches won : ${stats.losses} matches lost`;
  return (
    <span className={colClass + "_bright"} title={title}>
      {formatPercent(stats.winrate)}
    </span>
  );
}

const frequencySort = (a: AggregatorStats, b: AggregatorStats): number =>
  b.total - a.total;

const getStyleHeight = (frac: number): string => Math.round(frac * 100) + "%";

function WinrateChart({
  winrates,
  showTags
}: {
  winrates: AggregatorStats[];
  showTags: boolean;
}): JSX.Element {
  const curveMax = Math.max(
    ...winrates.map(cwr => Math.max(cwr.wins || 0, cwr.losses || 0)),
    0
  );
  const barStats = [...winrates];
  barStats.sort(compareWinrates);
  return (
    <>
      <div className={"mana_curve"}>
        {barStats.map((cwr, index) => {
          return (
            <React.Fragment key={index}>
              <div
                className={"mana_curve_column back_green"}
                style={{ height: getStyleHeight(cwr.wins / curveMax) }}
                title={`${cwr.wins} matches won`}
              />
              <div
                className={"mana_curve_column back_red"}
                style={{ height: getStyleHeight(cwr.losses / curveMax) }}
                title={`${cwr.losses} matches lost`}
              />
            </React.Fragment>
          );
        })}
      </div>
      <div className={"mana_curve_costs"}>
        {barStats.map((cwr, index) => {
          let winRate = 0;
          if (cwr.wins) {
            winRate = cwr.wins / (cwr.wins + cwr.losses);
          }
          const colClass = getWinrateClass(winRate);
          return (
            <div
              key={index}
              className={"mana_curve_column_number"}
              title={`${cwr.wins} matches won : ${cwr.losses} matches lost`}
            >
              <span className={colClass + "_bright"}>
                {formatPercent(winRate)}
              </span>
              {showTags && (
                <div
                  className={"mana_curve_tag"}
                  style={{ backgroundColor: getTagColor(cwr.tag) }}
                >
                  {cwr.tag}
                </div>
              )}
              {cwr.colors?.map(color => (
                <div
                  key={color}
                  className={"mana_s16 mana_" + MANA[color]}
                  style={{ margin: "3px auto 3px auto" }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

function FrequencyChart({
  winrates,
  total,
  showTags
}: {
  winrates: AggregatorStats[];
  total: number;
  showTags: boolean;
}): JSX.Element {
  const curveMax = Math.max(...winrates.map(cwr => cwr.total));
  const barStats = [...winrates];
  barStats.sort(frequencySort);
  return (
    <>
      <div className={"mana_curve"}>
        {barStats.map((cwr, index) => {
          return (
            <div
              key={index}
              className={"mana_curve_column back_blue"}
              style={{ height: getStyleHeight(cwr.total / curveMax) }}
              title={`${cwr.total} matches`}
            />
          );
        })}
      </div>
      <div className={"mana_curve_costs"}>
        {barStats.map((cwr, index) => {
          let frequency = 0;
          if (cwr.total) {
            frequency = cwr.total / total;
          }
          return (
            <div
              key={index}
              className={"mana_curve_column_number"}
              title={`${cwr.total} matches`}
            >
              <span className={"white_bright"}>{formatPercent(frequency)}</span>
              {showTags && (
                <div
                  className={"mana_curve_tag"}
                  style={{ backgroundColor: getTagColor(cwr.tag) }}
                >
                  {cwr.tag}
                </div>
              )}
              {cwr.colors?.map(color => (
                <div
                  key={color}
                  className={"mana_s16 mana_" + MANA[color]}
                  style={{ margin: "3px auto 3px auto" }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function MatchResultsStatsPanel({
  prefixId,
  aggregator,
  showCharts
}: {
  prefixId: string;
  aggregator: Aggregator;
  showCharts: boolean;
}): JSX.Element {
  const { stats, playStats, drawStats, tagStats, colorStats } = aggregator;
  const { eventId } = aggregator.filters;
  const isLimited = eventId === RANKED_DRAFT;
  const isConstructed = eventId === RANKED_CONST;
  const rankedStats = isLimited
    ? aggregator.limitedStats
    : isConstructed
    ? aggregator.constructedStats
    : undefined;
  const [showTags, setShowTags] = React.useState(true);
  const panelWidth = useSelector(
    (state: AppState) => state.settings.right_panel_width
  );
  const barsToShow = Math.max(3, Math.round(panelWidth / 40));
  // Archetypes
  const tagsWinrates = [...Object.values(tagStats)];
  tagsWinrates.sort(frequencySort);
  const freqTagStats = tagsWinrates.slice(0, barsToShow);
  // Colors
  const colorsWinrates = [...Object.values(colorStats)];
  colorsWinrates.sort(frequencySort);
  const freqColorStats = colorsWinrates.slice(0, barsToShow);
  return (
    <div className={"flex_item"}>
      <div className={"main_stats"}>
        <div className={prefixId + "_winrate"}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div
              className={"list_deck_winrate"}
              style={{ margin: "0 auto 0 0" }}
            >
              Overall:
            </div>
            <div
              className={"list_deck_winrate"}
              style={{ margin: "0 0 0 auto" }}
            >
              {`${stats.wins}:${stats.losses} `}(
              <ColoredWinrate stats={stats} />)
            </div>
          </div>
          {!!rankedStats &&
            RANKS.map(rank => {
              const stats = rankedStats[rank.toLowerCase()];
              if (!stats || !stats.total) {
                return <React.Fragment key={rank} />;
              }
              return (
                <div
                  key={rank}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div
                    className={
                      isLimited ? "top_limited_rank" : "top_constructed_rank"
                    }
                    style={{
                      margin: "0 auto 0 0",
                      backgroundPosition: `${getRankIndex(rank, 1) * -48}px 0px`
                    }}
                    title={rank}
                  ></div>
                  <div
                    className={"list_deck_winrate"}
                    style={{ margin: "0 0 0 auto" }}
                  >
                    {`${stats.wins}:${stats.losses} `}(
                    <ColoredWinrate stats={stats} />)
                  </div>
                </div>
              );
            })}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div
              className={"list_deck_winrate"}
              style={{ margin: "0 auto 0 0" }}
            >
              Play/Draw:
            </div>
            <div
              className={"list_deck_winrate"}
              style={{ margin: "0 0 0 auto" }}
            >
              <ColoredWinrate stats={playStats} />/
              <ColoredWinrate stats={drawStats} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className={"list_match_time"} style={{ margin: "0 auto 0 0" }}>
              Duration:
            </div>
            <div
              className={"list_match_time"}
              style={{ margin: "0 0 0 auto" }}
              title={toDDHHMMSS(stats.duration)}
            >
              {toMMSS(stats.duration)}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label className={"but_container_label"}>Group by:</label>
            <ReactSelect
              className={"match_results_group_select"}
              current={showTags ? "Archetype" : "Color"}
              options={["Archetype", "Color"]}
              callback={(filter): void => setShowTags(filter === "Archetype")}
              style={{
                margin: "12px auto auto 4px",
                textAlign: "left",
                width: "120px",
                display: "inline-flex"
              }}
            />
          </div>
          {showCharts && (
            <div
              className={
                showTags
                  ? "stats_panel_arch_charts"
                  : "stats_panel_color_charts"
              }
            >
              <div
                className={"ranks_history_title"}
                style={{ marginTop: "24px" }}
              >
                Frequent Matchups
              </div>
              <FrequencyChart
                winrates={showTags ? freqTagStats : freqColorStats}
                total={stats.total}
                showTags={showTags}
              />
              <div
                className={"ranks_history_title"}
                style={{ marginTop: "24px" }}
              >
                Wins vs Losses
              </div>
              <WinrateChart
                winrates={showTags ? freqTagStats : freqColorStats}
                showTags={showTags}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
