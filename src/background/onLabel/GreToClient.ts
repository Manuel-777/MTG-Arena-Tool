import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import * as greToClientInterpreter from "../greToClientInterpreter";
import { parseLogTimestamp } from "../backgroundUtil";
import debugLog from "../../shared/debugLog";
import { GREToClientMessage } from "mtgatool-shared/dist/types/greTypes";

// timestamp example : "637130091622772767"
interface EntryJson {
  transactionId: string;
  timestamp: string;
  greToClientEvent: {
    greToClientMessages: GREToClientMessage[];
  };
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function GreToClient(entry: Entry): void {
  if (
    entry.jsonString &&
    entry.jsonString ==
      "[Message summarized because one or more GameStateMessages exceeded the 50 GameObject or 50 Annotation limit.]"
  ) {
    debugLog("GRE Message summarized", "info");
    return;
  }
  const json = entry.json();
  if (!json) return;
  //if (skipMatch) return;
  // Note: one of the only places we still depend on entry.timestamp
  // Another note: The timestamp now uses full epoch instead of the traditional format or date
  globals.logTime = parseLogTimestamp(json.timestamp);

  const message = json.greToClientEvent.greToClientMessages;
  message.forEach(function (msg) {
    greToClientInterpreter.GREMessage(msg, globals.logTime);
    /*
    const msgId = msg.msgId;
    globals.currentMatch.GREtoClient[msgId] = msg;
    globals.currentMatch.latestMessage = msgId;
    greToClientInterpreter.GREMessageByID(msgId, globals.logTime);
    */
  });
}
