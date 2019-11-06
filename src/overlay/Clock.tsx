import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { toMMSS, toHHMMSS } from "../shared/util";

const CLOCK_MODE_BOTH = 0;
const CLOCK_MODE_ELAPSED = 1;
const CLOCK_MODE_CLOCK = 2;

export interface ClockProps {
  matchBeginTime: Date;
  priorityTimers: number[];
  turnPriority: number;
  oppName: string;
  playerSeat: number;
}

export default function Clock(props: ClockProps): JSX.Element {
  const [clockMode, setClockMode] = useState(CLOCK_MODE_BOTH);
  const [now, setNow] = useState(new Date());
  const {
    matchBeginTime,
    priorityTimers,
    turnPriority,
    oppName,
    playerSeat
  } = props;

  const handleClockPrev = useCallback((): void => {
    if (clockMode <= CLOCK_MODE_BOTH) {
      setClockMode(CLOCK_MODE_CLOCK);
    } else {
      setClockMode(clockMode - 1);
    }
  }, [clockMode]);

  const handleClockNext = useCallback((): void => {
    if (clockMode >= CLOCK_MODE_CLOCK) {
      setClockMode(CLOCK_MODE_BOTH);
    } else {
      setClockMode(clockMode + 1);
    }
  }, [clockMode]);

  // update clock display by changing "now" state every 250ms
  useEffect(() => {
    const timerID = setInterval(() => {
      setNow(new Date());
    }, 250);
    return (): void => {
      clearInterval(timerID);
    };
  });

  // Memoize title computation
  const clockTitle = useMemo((): JSX.Element => {
    let cleanName = oppName;
    if (oppName !== "Sparky") {
      cleanName = oppName.slice(0, -6);
    }
    let p1name = cleanName;
    let p2name = "You";
    if (playerSeat === 1) {
      p1name = "You";
      p2name = cleanName;
    }
    if (clockMode === CLOCK_MODE_BOTH) {
      const className1 =
        "clock_pname1 " + (turnPriority === 1 ? "pname_priority" : "");
      const className2 =
        "clock_pname2 " + (turnPriority === 2 ? "pname_priority" : "");
      return (
        <>
          <div className={className1}>{p1name}</div>
          <div className={className2}>{p2name}</div>
        </>
      );
    }
    if (turnPriority === playerSeat) {
      return <>{"You have priority."}</>;
    }
    return <>{cleanName + " has priority."}</>;
  }, [clockMode, playerSeat, turnPriority]);

  // Clock Mode BOTH
  const lastDurationInSec = Math.floor(
    (now.getTime() - new Date(priorityTimers[0]).getTime()) / 1000
  );
  let duration1 = Math.floor(priorityTimers[1] / 1000);
  if (turnPriority === 1 && duration1 > 0) {
    duration1 += lastDurationInSec;
  }
  let duration2 = Math.floor(priorityTimers[2] / 1000);
  if (turnPriority === 2 && duration2 > 0) {
    duration2 += lastDurationInSec;
  }

  // Clock Mode ELAPSED
  const elapsedDuration = Math.floor(
    (now.getTime() - matchBeginTime.getTime()) / 1000
  );

  return (
    <div className="overlay_clock_container click-on">
      <div className="clock_prev" onClick={handleClockPrev} />
      <div className="clock_turn">{clockTitle}</div>
      <div className="clock_elapsed">
        {clockMode === CLOCK_MODE_BOTH && (
          <>
            <div className="clock_priority_1">{toMMSS(duration1)}</div>
            <div className="clock_priority_2">{toMMSS(duration2)}</div>
          </>
        )}
        {clockMode === CLOCK_MODE_ELAPSED && toHHMMSS(elapsedDuration)}
        {clockMode === CLOCK_MODE_CLOCK && now.toLocaleTimeString()}
      </div>
      <div className="clock_next" onClick={handleClockNext} />
    </div>
  );
}
