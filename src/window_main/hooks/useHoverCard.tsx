import { useDispatch } from "react-redux";
import { hoverSlice } from "../../shared/redux/reducers";

type HoverCardHook = (() => void)[];

export default function useHoverCard(card: number): HoverCardHook {
  const dispatcher = useDispatch();
  const { setHoverIn, setHoverOut } = hoverSlice.actions;
  const hoverIn = (): void => {
    dispatcher(setHoverIn(card));
  };

  const hoverOut = (): void => {
    dispatcher(setHoverOut());
  };

  return [hoverIn, hoverOut];
}
