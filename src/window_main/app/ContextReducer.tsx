export const SET_BACKGROUND_IMAGE = 0;
export const SET_TOP_ARTIST = 1;
export const SET_HOVER_CARD = 2;
export const SET_OFFLINE = 3;
export const SET_LOADING = 4;
export const SET_TOP_NAV = 5;

export default function contextReducer(state: any, action: any): any {
  switch (action.type) {
    case SET_BACKGROUND_IMAGE: {
      return { ...state, BackgroundImage: action.value };
    }
    case SET_TOP_ARTIST: {
      return { ...state, TopArtist: action.value };
    }
    case SET_HOVER_CARD: {
      return { ...state, HoverGrpId: action.value };
    }
    case SET_OFFLINE: {
      return { ...state, Offline: action.value };
    }
    case SET_LOADING: {
      return { ...state, Loading: action.value };
    }
    case SET_TOP_NAV: {
      return { ...state, TopNav: action.value };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

export function dispatchAction(
  dispatch: any,
  action: number,
  value: any
): void {
  dispatch({ type: action, value: value });
}

/*
const dispatch = useDispatch();
dispatchAction(dispatch, SET_LOADING, true)
dispatch({ type: SET_LOADING, loading: true });


*/
