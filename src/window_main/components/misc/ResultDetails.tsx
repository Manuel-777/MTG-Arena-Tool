import React from "react";
import { InternalMatch } from "../../../types/match";

interface ResultDetailsProps {
  match: InternalMatch;
}

export default function ResultDetails(props: ResultDetailsProps): JSX.Element {
  const { match } = props;

  const colStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column"
  };

  // This is fundamentally wrong, it assumes players are always
  // on the play if they lost before and viceversa. This is
  // because we are not storing who played first on each game!
  const g1OnThePlay = match.player.seat == match.onThePlay;
  const g2OnThePlay = match.gameStats[1] ? !match.gameStats[0].win : -1;
  const g3OnThePlay = match.gameStats[2] ? !match.gameStats[1].win : -1;

  const g1Title =
    (g1OnThePlay ? "On the Play, " : "On the Draw, ") +
    (match.gameStats[0].win ? "Win" : "Loss");

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
        <div className={g1OnThePlay ? "ontheplaytext" : "onthedrawtext"}>
          {g1OnThePlay ? "P" : "D"}
        </div>
        <div className={match.gameStats[0].win ? "ontheplay" : "onthedraw"} />
      </div>
      <div title={g2Title} style={colStyle}>
        {match.gameStats[1] ? (
          <>
            <div className={g2OnThePlay ? "ontheplaytext" : "onthedrawtext"}>
              {g2OnThePlay ? "P" : "D"}
            </div>
            <div
              className={match.gameStats[1].win ? "ontheplay" : "onthedraw"}
            />
          </>
        ) : (
          <>
            <div className={"notplayedtext"}>{"-"}</div>
            <div className={"notplayed"} />
          </>
        )}
      </div>
      <div title={g3Title} style={colStyle}>
        {match.gameStats[2] ? (
          <>
            <div className={g3OnThePlay ? "ontheplaytext" : "onthedrawtext"}>
              {g3OnThePlay ? "P" : "D"}
            </div>
            <div
              className={match.gameStats[2].win ? "ontheplay" : "onthedraw"}
            />
          </>
        ) : (
          <>
            <div className={"notplayedtext"}>{"-"}</div>
            <div className={"notplayed"} />
          </>
        )}
      </div>
    </div>
  );
}
