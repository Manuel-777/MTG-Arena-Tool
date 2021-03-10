//import http from "https";
import http, { IncomingMessage, RequestOptions } from "http";

import globals from "./globals";
import { ipcSend } from "./backgroundUtil";
import { reduxAction } from "../shared/redux/sharedRedux";
import { setSyncState } from "./httpApi";
import debugLog from "../shared/debugLog";
import { constants, HttpTask, HttpMethod } from "mtgatool-shared";

const { IPC_RENDERER, SYNC_PUSH } = constants;

const serverAddress = "127.0.0.1";

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
      console.log(parsedResult);
      handleError(error);
      return;
    }
    if (fnToWrap && parsedResult) {
      fnToWrap(parsedResult);
    }
  };
}

export function asyncWorker(task: HttpTask, callback: HttpTaskCallback): void {
  // list of requests that must always be sent, regardless of privacy settings
  const nonPrivacyMethods: HttpMethod[] = [
    "authLogin",
    "clearData",
    "getDatabase",
    "activeEvents",
    "getDatabaseVersion",
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
  const token = globals.store.getState().appsettings.token;
  const options = {
    method: "POST",
    ...task.options,
    headers: {} as Record<string, string>,
  } as RequestOptions;
  if (globals.debugNet) {
    ipcLog("SEND >> " + task.method + ", " + task.reqId);
    console.log("SEND", task.method, task.method_path, task.data);
  }
  if (
    task.method == "postCourse" ||
    task.method == "postMatch" ||
    task.method == "postDraft" ||
    task.method == "postEconomy" ||
    task.method == "postSeasonal"
  ) {
    setSyncState(SYNC_PUSH);
  }

  const postData = JSON.stringify(task.data || {});
  options.hostname = serverAddress;
  options.path = task.method_path;
  options.headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": postData.length,
  };
  if (token !== "") {
    options.headers["access-token"] = token;
  }
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
          if (globals.debugNet) {
            ipcLog("RECV << " + task.method + ", " + results.slice(0, 100));
            console.log("RECV", results);
          }
          const parsedResult = JSON.parse(results);
          if (
            globals.debugNet ||
            (parsedResult && parsedResult.error) ||
            (parsedResult && parsedResult.ok == false)
          ) {
            //ipcLog("RECV << " + task.method + ", " + results.slice(0, 100));
            debugLog("RECV > " + results);
          }
          // TODO remove this hack for get_database_version
          if (parsedResult && task.method === "getDatabaseVersion") {
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
