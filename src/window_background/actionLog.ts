import { ipc_send } from "./backgroundUtil";
import fs from "fs";
import path from "path";
import { IPC_OVERLAY } from "../shared/constants.js";
import globals from "./globals";
import format from "date-fns/format";

var currentActionLog = "";

const actionLog = function(
  seat: number,
  time = new Date(),
  str: string,
  grpId = 0
): void {
  if (seat == -99) {
    currentActionLog = "version: 1\r\n";
  } else {
    /*
      str = str.replace(/(<([^>]+)>)/gi, "");
      */

    currentActionLog += `${seat}\r\n`;
    currentActionLog += `${format(time, "HH:mm:ss")}\r\n`;
    currentActionLog += `${str}\r\n`;

    try {
      fs.writeFileSync(
        path.join(globals.actionLogDir, globals.currentMatch.matchId + ".txt"),
        currentActionLog,
        "utf-8"
      );
    } catch (e) {
      //
    }
  }

  //console.log("action_log", { seat: seat, time: time }, str);
  ipc_send(
    "action_log",
    { seat: seat, time: time, str: str, grpId: grpId },
    IPC_OVERLAY
  );
};

export default actionLog;
