import qs from "qs";
import http, { RequestOptions } from "https";
import { IncomingMessage } from "http";

import globals from "./globals";
import { ipcSend } from "./backgroundUtil";
import { reduxAction } from "../shared/redux/sharedRedux";
import { setSyncState } from "./httpApi";
import debugLog from "../shared/debugLog";
import { constants } from "mtgatool-shared";

const { IPC_RENDERER, SYNC_PUSH } = constants;

const serverAddress = "mtgatool.com";

export interface HttpTask {
  reqId: string;
  method: string;
  method_path: string;
  [key: string]: string;
}

interface HttpTaskCallback {
  (
    error?: Error | null,
    task?: HttpTask,
    results?: string,
    parsedResult?: any
  ): void;
}

export const ipcPop = (args: any): void => ipcSend("popup", args);

export const ipcLog = (message: string): void => {
  debugLog(message);
  ipcSend("ipc_log", message);
};

export function handleError(error: Error): void {
  debugLog(error, "error");
  ipcLog(`!!!ERROR >> ${error.message}`);
  ipcPop({ text: error.message, time: 2000, progress: -1 });
}

export function makeSimpleResponseHandler(
  fnToWrap?: (parsedResult: any) => void
): HttpTaskCallback {
  return function (
    error?: Error | null,
    _task?: HttpTask,
    _results?: string,
    parsedResult?: any
  ): void {
    if (error) {
      handleError(error);
      return;
    }
    if (fnToWrap && parsedResult) {
      fnToWrap(parsedResult);
    }
  };
}

function getRequestOptions(task: HttpTask): RequestOptions {
  let options: RequestOptions;
  switch (task.method) {
    case "get_database":
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: "/database/" + task.lang,
        method: "GET",
      };
      // TODO why is this side-effect here?
      ipcPop({
        text: "Downloading metadata...",
        time: 0,
        progress: 2,
      });
      break;

    case "get_ladder_decks":
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: "/top_ladder.json",
        method: "GET",
      };
      break;

    case "get_ladder_traditional_decks":
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: "/top_ladder_traditional.json",
        method: "GET",
      };
      break;

    default:
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: task.method_path ? task.method_path : "/api.php",
        method: "POST",
      };
  }
  return options;
}

export function asyncWorker(task: HttpTask, callback: HttpTaskCallback): void {
  // list of requests that must always be sent, regardless of privacy settings
  const nonPrivacyMethods = [
    "auth",
    "delete_data",
    "get_database",
    "active_events",
    "get_database_version",
  ];
  const sendData = globals.store.getState().settings.send_data;
  const offline = globals.store.getState().renderer.offline;
  if ((!sendData || offline) && !nonPrivacyMethods.includes(task.method)) {
    if (!offline) {
      reduxAction(
        globals.store.dispatch,
        { type: "SET_OFFLINE", arg: true },
        IPC_RENDERER
      );
    }
    const text = `WARNING >> currently offline or settings prohibit sharing > (${task.method})`;
    ipcLog(text);
    callback(undefined, task, undefined, undefined);
    return;
  }
  const _headers: any = { ...task };
  _headers.token = Buffer.from(
    globals.store.getState().appsettings.token
  ).toString("ascii");
  const options = getRequestOptions(task);
  if (task.method !== "notifications") {
    //ipcLog("SEND >> " + task.method + ", " + _headers.reqId + ", " + _headers.token);
    debugLog("SEND", _headers);
  }
  if (
    task.method == "submit_course" ||
    task.method == "set_match" ||
    task.method == "set_draft" ||
    task.method == "set_economy" ||
    task.method == "set_seasonal"
  ) {
    setSyncState(SYNC_PUSH);
  }
  //debugLog("POST", _headers);
  const postData = qs.stringify(_headers);
  options.headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": postData.length,
  };
  options.rejectUnauthorized = true;
  let results = "";
  const req = http.request(options, function (res: IncomingMessage) {
    if (res.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
      const text = `Server error with request. (${task.method}: ${res.statusCode})`;
      callback(new Error(text), task);
      return;
    } else {
      res.on("data", function (chunk: any) {
        results = results + chunk;
      });
      res.on("end", function () {
        try {
          const parsedResult = JSON.parse(results);
          if (
            (globals.debugNet && task.method !== "notifications") ||
            (parsedResult && parsedResult.error) ||
            (parsedResult && parsedResult.ok == false)
          ) {
            //ipcLog("RECV << " + task.method + ", " + results.slice(0, 100));
            debugLog("RECV > " + results);
          }
          // TODO remove this hack for get_database_version
          if (parsedResult && task.method === "get_database_version") {
            parsedResult.ok = true;
          }
          if (parsedResult && parsedResult.ok) {
            callback(null, task, results, parsedResult);
            return;
          }
          if (parsedResult && parsedResult.error) {
            const text = `Server returned error code. (${task.method}: ${parsedResult.error})`;
            callback(new Error(text), task, results, parsedResult);
            return;
          }
          // should never get to this point
          throw new Error(
            `Error handling request. (${task.method}) > ${results}`
          );
        } catch (error) {
          console.error(error, results);
          debugLog(results, "debug");
          callback(error, task, results);
        }
      });
    }
  });
  req.on("error", callback);
  req.write(postData);
  req.end();
}
