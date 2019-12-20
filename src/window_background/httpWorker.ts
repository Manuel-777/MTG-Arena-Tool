import qs from "qs";
import http, { RequestOptions } from "https";
import { IncomingMessage } from "http";

import playerData from "../shared/player-data";
import globals from "./globals";
import { ipc_send as ipcSend, setData } from "./background-util";

const serverAddress = "mtgatool.com";

export interface HttpTask {
  reqId: string;
  method: string;
  method_path: string;
  [key: string]: string;
}

export interface HttpTaskCallback {
  (
    error?: Error | null,
    task?: HttpTask,
    results?: string,
    parsedResult?: any
  ): void;
}

export const ipcPop = (args: any): void => ipcSend("popup", args);

export const ipcLog = (message: string): void => {
  console.log(message);
  ipcSend("ipc_log", message);
};

export function handleError(error: Error): void {
  console.error(error);
  ipcLog(`!!!ERROR >> ${error.message}`);
  ipcPop({ text: error.message, time: 2000, progress: -1 });
}

export function makeSimpleResponseHandler(
  fnToWrap?: (parsedResult: any) => void
): HttpTaskCallback {
  return function(
    error?: Error | null,
    task?: HttpTask,
    results?: string,
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

export function getRequestOptions(task: HttpTask): RequestOptions {
  let options: RequestOptions;
  switch (task.method) {
    case "get_database":
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: "/database/" + task.lang,
        method: "GET"
      };
      // TODO why is this side-effect here?
      ipcPop({
        text: "Downloading metadata...",
        time: 0,
        progress: 2
      });
      break;

    case "get_ladder_decks":
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: "/top_ladder.json",
        method: "GET"
      };
      break;

    case "get_ladder_traditional_decks":
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: "/top_ladder_traditional.json",
        method: "GET"
      };
      break;

    default:
      options = {
        protocol: "https:",
        port: 443,
        hostname: serverAddress,
        path: task.method_path ? task.method_path : "/api.php",
        method: "POST"
      };
  }
  return options;
}

export function asyncWorker(task: HttpTask, callback: HttpTaskCallback): void {
  // list of requests that must always be sent, regardless of privacy settings
  const nonPrivacyMethods = ["auth", "delete_data", "get_database"];
  if (
    (!playerData.settings.send_data || playerData.offline) &&
    !nonPrivacyMethods.includes(task.method)
  ) {
    if (!playerData.offline) {
      setData({ offline: true });
    }
    const text = `Settings dont allow sending data! > (${task.method})`;
    callback(new Error(text), task);
  }
  const _headers: any = { ...task };
  _headers.token = playerData.settings.token;
  const options = getRequestOptions(task);
  if (globals.debugNet && task.method !== "notifications") {
    ipcLog(
      "SEND >> " + task.method + ", " + _headers.reqId + ", " + _headers.token
    );
  }
  // console.log("POST", _headers);
  const postData = qs.stringify(_headers);
  options.headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": postData.length
  };
  let results = "";
  const req = http.request(options, function(res: IncomingMessage) {
    if (res.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
      const text = `Server error with request. (${task.method}: ${res.statusCode})`;
      callback(new Error(text), task);
      return;
    } else {
      res.on("data", function(chunk: any) {
        results = results + chunk;
      });
      res.on("end", function() {
        try {
          if (globals.debugNet && task.method !== "notifications") {
            ipcLog("RECV << " + task.method + ", " + results.slice(0, 100));
          }
          const parsedResult = JSON.parse(results);
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
          throw new Error(`Error handling request. (${task.method})`);
        } catch (error) {
          callback(error, task, results);
        }
      });
    }
  });
  req.on("error", callback);
  req.write(postData);
  req.end();
}
