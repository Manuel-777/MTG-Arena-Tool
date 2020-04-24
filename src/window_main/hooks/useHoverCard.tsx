import { useDispatch } from "react-redux";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { IPC_NONE } from "../../shared/constants";
import { useCallback } from "react";

type HoverCardHook = (() => void)[];

export default function useHoverCard(
  card: number,
  wanted?: number
): HoverCardHook {
  const dispatcher = useDispatch();

  const hoverIn = useCallback((): void => {
    reduxAction(dispatcher, "SET_HOVER_IN", { grpId: card, wanted }, IPC_NONE);
  }, [dispatcher, card, wanted]);

  const hoverOut = useCallback((): void => {
    reduxAction(dispatcher, "SET_HOVER_OUT", card, IPC_NONE);
  }, [dispatcher, card]);

  return [hoverIn, hoverOut];
}
