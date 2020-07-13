import React from "react";

import colormap from "colormap";

import { AggregatorStats } from "../../aggregator";
import { formatPercent, getTagColor } from "../../rendererUtil";

import indexCss from "../../index.css";
import sharedCss from "../../../shared/shared.css";
import manaCurveCss from "../../../shared/ManaCurve/ManaCurve.css";

import {
  WHITE,
  BLUE,
  BLACK,
  RED,
  GREEN,
  COLORLESS,
} from "../../../shared/constants";

const manaClasses: string[] = [];
manaClasses[WHITE] = sharedCss.manaW;
manaClasses[BLUE] = sharedCss.manaU;
manaClasses[BLACK] = sharedCss.manaB;
manaClasses[RED] = sharedCss.manaR;
manaClasses[GREEN] = sharedCss.manaG;
manaClasses[COLORLESS] = sharedCss.manaC;

const frequencySort = (a: AggregatorStats, b: AggregatorStats): number =>
  b.total - a.total;

const tileColors = colormap({
  colormap: "viridis",
  nshades: 100,
  format: "hex",
  alpha: 1,
});

function tileColor(winrate: number): string {
  return tileColors[0 | (winrate * (tileColors.length - 1))];
  // Map 0% to 100% win rates to a red/yellow/green gradient.
  // hsl(0, 50%, 40%)
  // hsl(60, 80%, 55%)
  // hsl(120, 100%, 60%)
  // const h = winrate * 120;
  // const s = 0 | (50 + winrate * 50);
  // const l = 0 | (40 + winrate * 20);
  // return `hsl(${h}, ${s}%, ${l}%)`;
}

function tileGradient(color: string, size: number): string {
  // 1 =>   radial-gradient(rgb(34, 141, 141), rgb(34, 141, 141) 20%, transparent 50%);
  // 10 =>  radial-gradient(rgb(34, 141, 141), rgb(34, 141, 141) 35%, transparent 60%);
  // 20 =>  radial-gradient(rgb(34, 141, 141), rgb(34, 141, 141) 50%, transparent 70%);
  // 50 =>  radial-gradient(rgb(34, 141, 141), rgb(34, 141, 141) 65%, transparent 80%);
  // 150 => radial-gradient(rgb(34, 141, 141), rgb(34, 141, 141) 80%, transparent 90%);
  // 400 => radial-gradient(rgb(34, 141, 141), rgb(34, 141, 141) 95%, transparent 100%);
  // log[1, 10, 20, 50, 150, 400] => [0.0, 2.302585092994046, 2.995732273553991, 3.912023005428146, 5.0106352940962555, 5.991464547107982]

  const inside = 20 + 12.5 * Math.log(size);
  const outside = 50 + 8.3 * Math.log(size);
  return `radial-gradient(${color}, ${color} ${0 | inside}%, transparent ${
    0 | outside
  }%)`;
}

// floating point to rounded integer value.
const crudePercent = (x: number): number => 0 | ((x || 0) * 100);

function tileTooltipText(
  winRateInfo: AggregatorStats | undefined
): string | undefined {
  if (winRateInfo) {
    return `${formatPercent(winRateInfo.winrate)} winrate. ${
      winRateInfo.wins
    }:${winRateInfo.losses} = ${winRateInfo.total} matches`;
  }
}

function Tags({
  winRateInfo,
  visible,
}: {
  winRateInfo: AggregatorStats;
  visible: boolean;
}): JSX.Element {
  if (visible) {
    return (
      <div
        className={manaCurveCss.tags}
        style={{ backgroundColor: getTagColor(winRateInfo.tag) }}
        title={JSON.stringify(winRateInfo)}
      >
        {winRateInfo.tag ? winRateInfo.tag : winRateInfo.playerTag}
      </div>
    );
  }
  return <></>;
}

function ChartLabel({
  winRateInfo,
  showTags,
}: {
  winRateInfo: AggregatorStats;
  showTags: boolean;
}): JSX.Element {
  // We don't know if we are displaying player or opponent colours.
  // But the one we want to show will exist.
  const colors = winRateInfo.colors?.length
    ? winRateInfo.colors
    : winRateInfo.playerColors;

  let winRate = 0;
  if (winRateInfo.wins) {
    winRate = winRateInfo.wins / (winRateInfo.wins + winRateInfo.losses);
  }
  const totalMatches = winRateInfo?.total || 0;

  // const colClass = getWinrateClass(winRate, true);
  return (
    <div className={manaCurveCss.chartLabel}>
      <Tile
        value={winRate}
        size={totalMatches}
        text={crudePercent(winRate) + ""}
        title={tileTooltipText(winRateInfo)}
      />
      <Tags winRateInfo={winRateInfo} visible={showTags} />
      <div className={manaCurveCss.colors}>
        {colors?.map((color) => (
          <div
            key={color}
            className={sharedCss.manaS16 + " " + manaClasses[color]}
          />
        ))}
      </div>
    </div>
  );
}

function ChartLabels({
  winrates,
  showTags,
  vertical,
}: {
  winrates: AggregatorStats[];
  showTags: boolean;
  vertical?: boolean | undefined;
}): JSX.Element {
  return (
    <div
      className={`${manaCurveCss.manaCurveCosts} ${
        vertical ? manaCurveCss.vertical : manaCurveCss.horizontal
      } ${manaCurveCss.chartLabels}`}
    >
      {winrates.map((winRateInfo, index) => (
        <ChartLabel key={index} winRateInfo={winRateInfo} showTags={showTags} />
      ))}
    </div>
  );
}

function ChartLegend(): JSX.Element {
  const winrates = Array(6)
    .fill(0)
    .map((_, i) => i / 5);

  // Aproximately exponential
  const sampleSizes = [1, 10, 20, 50, 150, 400];

  return (
    <div className={manaCurveCss.legend}>
      <h5> Legend </h5>
      <div>
        <label>Winrate (%):</label>
        <div>
          {winrates.map((wr, index) => (
            <Tile
              key={index}
              value={wr}
              size={10000}
              text={crudePercent(wr) + ""}
            />
          ))}
        </div>
      </div>
      <div>
        <label>Samples:</label>
        <div>
          {sampleSizes.map((ss, index) => (
            <Tile key={index} value={0.5} size={ss} text={ss + ""} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({
  value,
  size,
  text,
  title,
}: {
  value?: number;
  size?: number;
  text?: string;
  title?: string;
}): JSX.Element {
  // Represents a tile in a pairwise comparison plot

  // FIXME: `size` and tileGradient is tweaked for match sample sizes
  // This will need to be changed if the code is used elsewhere.

  const color = value !== undefined ? tileColor(value) : "rgba(0,0,0,0%)";

  return (
    <div
      className={manaCurveCss.tile}
      title={title}
      style={{
        background: tileGradient(color, size || 0),
      }}
    >
      <span>{text}</span>
    </div>
  );
}

function ChartRow({
  row,
}: {
  row: Array<AggregatorStats | undefined>;
}): JSX.Element {
  return (
    <tr className={manaCurveCss.chartRow}>
      {row.map((winRateInfo, index) => (
        <td key={index}>
          <Tile
            value={winRateInfo?.winrate}
            size={winRateInfo?.total}
            title={tileTooltipText(winRateInfo)}
            text={
              !winRateInfo ? "" : crudePercent(winRateInfo?.winrate || 0) + ""
            }
          />
        </td>
      ))}
    </tr>
  );
}

function Chart({
  matrix,
}: {
  matrix: Array<Array<AggregatorStats | undefined>>;
}): JSX.Element {
  return (
    <table className={manaCurveCss.chart}>
      {matrix.map((row, index) => (
        <ChartRow key={index} row={row} />
      ))}
    </table>
  );
}

export default function MatchupMatrix({
  opponentWinrates,
  playerWinrates,
  winrates,
  showTags,
}: {
  opponentWinrates: AggregatorStats[];
  playerWinrates: AggregatorStats[];
  winrates: { [key: string]: AggregatorStats };
  showTags: boolean;
}): JSX.Element {
  // We use the opponent winrates data to sort the matrix columns.
  opponentWinrates = [...opponentWinrates];
  opponentWinrates.sort(frequencySort);

  playerWinrates = [...playerWinrates];
  playerWinrates.sort(frequencySort);

  const matrix: Array<Array<AggregatorStats | undefined>> = [];

  function getKey(pi: AggregatorStats, oi: AggregatorStats): string {
    if (showTags) {
      return `${pi.playerTag} ${oi.tag}`;
    } else {
      return `${pi.playerColors?.join(",")} ${oi.colors?.join(",")}`;
    }
  }

  playerWinrates.forEach((pInfo) => {
    const row: Array<AggregatorStats | undefined> = [];
    opponentWinrates.forEach((oInfo) => {
      const key = getKey(pInfo, oInfo);
      if (key in winrates) {
        row.push(winrates[key]);
      } else {
        row.push(undefined);
      }
    });
    matrix.push(row);
  });

  return (
    <>
      <h4
        className={indexCss.ranks_history_title}
        style={{ marginTop: "24px", marginBottom: "12px" }}
      >
        Matchup Matrix
      </h4>

      <div className={manaCurveCss.chartContainer}>
        <Chart matrix={matrix} />
        <ChartLabels
          winrates={playerWinrates}
          showTags={showTags}
          vertical={true}
        />
        <ChartLabels winrates={opponentWinrates} showTags={showTags} />
        <ChartLegend />
      </div>
    </>
  );
}
