import React from "react";
import indexCss from "../../index.css";
import { InternalMatch } from "mtgatool-shared/dist/types/match";

interface ResultDetailsProps {
  match: InternalMatch;
}

export default function ResultDetails(props: ResultDetailsProps): JSX.Element {
  const { match } = props;

  const colStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
  };

  let g1OnThePlay: boolean | -1 = -1;
  let g2OnThePlay: boolean | -1 = -1;
  let g3OnThePlay: boolean | -1 = -1;

  const hasPlayDrawData = match && match.toolVersion >= 262400;
  if (hasPlayDrawData) {
    g1OnThePlay = match.gameStats[0]
      ? match.player.seat == match.gameStats[0].onThePlay
      : false;
    g2OnThePlay = match.gameStats[1]
      ? match.player.seat == match.gameStats[1].onThePlay
      : false;
    g3OnThePlay = match.gameStats[2]
      ? match.player.seat == match.gameStats[2].onThePlay
      : false;
  } else {
    // This is fundamentally wrong, it assumes players are always
    // on the play if they lost before and viceversa. This is
    // because we are not storing who played first on each game!
    g1OnThePlay = match.player.seat == match.onThePlay;
    g2OnThePlay =
      match && match.gameStats[0] && match.gameStats[1]
        ? !match.gameStats[0].win
        : -1;
    g3OnThePlay =
      match && match.gameStats[1] && match.gameStats[2]
        ? !match.gameStats[1].win
        : -1;
  }

  let g1Title;
  if (match.gameStats[0]) {
    g1Title =
      (g1OnThePlay ? "On the Play, " : "On the Draw, ") +
      (match.gameStats[0].win ? "Win" : "Loss");
  } else {
    g1Title = "Not played";
  }

  let g2Title;
  if (match.gameStats[1]) {
    g2Title =
      (g2OnThePlay ? "On the Play, " : "On the Draw, ") +
      (match.gameStats[1].win ? "Win" : "Loss");
  } else {
    g2Title = "Not played";
  }

  let g3Title;
  if (match.gameStats[2]) {
    g3Title =
      (g3OnThePlay ? "On the Play, " : "On the Draw, ") +
      (match.gameStats[2].win ? "Win" : "Loss");
  } else {
    g3Title = "Not played";
  }

  return (
    <div style={{ display: "flex", flexDirection: "row", margin: "auto 4px" }}>
      <div title={g1Title} style={colStyle}>
        <div
          className={
            g1OnThePlay ? indexCss.ontheplaytext : indexCss.onthedrawtext
          }
        >
          {g1OnThePlay ? "P" : "D"}
        </div>
        <div
          className={
            match.gameStats[0] && match.gameStats[0].win
              ? indexCss.ontheplay
              : indexCss.onthedraw
          }
        />
      </div>
      <div title={g2Title} style={colStyle}>
        {match.gameStats[1] ? (
          <>
            <div
              className={
                g2OnThePlay ? indexCss.ontheplaytext : indexCss.onthedrawtext
              }
            >
              {g2OnThePlay ? "P" : "D"}
            </div>
            <div
              className={
                match.gameStats[1].win ? indexCss.ontheplay : indexCss.onthedraw
              }
            />
          </>
        ) : (
          <>
            <div className={indexCss.notplayedtext}>{"-"}</div>
            <div className={indexCss.notplayed} />
          </>
        )}
      </div>
      <div title={g3Title} style={colStyle}>
        {match.gameStats[2] ? (
          <>
            <div
              className={
                g3OnThePlay ? indexCss.ontheplaytext : indexCss.onthedrawtext
              }
            >
              {g3OnThePlay ? "P" : "D"}
            </div>
            <div
              className={
                match.gameStats[2].win ? indexCss.ontheplay : indexCss.onthedraw
              }
            />
          </>
        ) : (
          <>
            <div className={indexCss.notplayedtext}>{"-"}</div>
            <div className={indexCss.notplayed} />
          </>
        )}
      </div>
    </div>
  );
}
