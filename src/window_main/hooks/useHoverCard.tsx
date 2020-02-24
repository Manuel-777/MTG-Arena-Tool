import { useDispatch } from "../app/ContextProvider";
import { SET_HOVER_CARD, dispatchAction } from "../app/ContextReducer";

type HoverCardHook = (() => void)[];

export default function useHoverCard(card: number): HoverCardHook {
  const dispatcher = useDispatch();
  const hoverIn = (): void => {
    dispatchAction(dispatcher, SET_HOVER_CARD, { grpId: card, opacity: 1 });
  };

  const hoverOut = (): void => {
    dispatchAction(dispatcher, SET_HOVER_CARD, { grpId: card, opacity: 0 });
  };

  return [hoverIn, hoverOut];
}
