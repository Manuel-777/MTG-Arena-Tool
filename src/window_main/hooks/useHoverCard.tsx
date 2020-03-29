import { useDispatch } from "react-redux";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { IPC_NONE } from "../../shared/constants";

type HoverCardHook = (() => void)[];

export default function useHoverCard(
  card: number,
  wanted?: number
): HoverCardHook {
  const dispatcher = useDispatch();

  const hoverIn = (): void => {
    reduxAction(dispatcher, "SET_HOVER_IN", { grpId: card, wanted }, IPC_NONE);
  };

  const hoverOut = (): void => {
    reduxAction(dispatcher, "SET_HOVER_OUT", card, IPC_NONE);
  };

  return [hoverIn, hoverOut];
}
