import { SET_HOVER_IN, SET_HOVER_OUT, dispatchAction } from "../app/reducers";
import { useDispatch } from "react-redux";

type HoverCardHook = (() => void)[];

export default function useHoverCard(card: number): HoverCardHook {
  const dispatcher = useDispatch();
  const hoverIn = (): void => {
    dispatchAction(dispatcher, SET_HOVER_IN, card);
  };

  const hoverOut = (): void => {
    dispatchAction(dispatcher, SET_HOVER_OUT, true);
  };

  return [hoverIn, hoverOut];
}
