import { MatchServiceToClientMessage } from "mtgatool-shared/dist/types/greTypes";
import { IPC_RENDERER } from "mtgatool-shared/dist/shared/constants";
import { reduxAction } from "../../shared/redux/sharedRedux";
import LogEntry from "../../types/logDecoder";
import globals from "../globals";

interface Entry extends LogEntry {
  json: () => MatchServiceToClientMessage;
}

export default function onAuthenticateResponse(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  console.log("clientId", json.authenticateResponse?.clientId);
  console.log("screenName", json.authenticateResponse?.screenName);

  if (json.authenticateResponse?.screenName) {
    reduxAction(
      globals.store.dispatch,
      { type: "SET_PLAYER_NAME", arg: json.authenticateResponse?.screenName },
      IPC_RENDERER
    );
  }
}
