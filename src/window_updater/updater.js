import { ipcRenderer as ipc, remote } from "electron";

if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: error => {
      openNewGitHubIssue({
        user: "Manuel-777",
        repo: "MTG-Arena-Tool",
        body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
      });
    }
  });
}

//
ipc.on("update_progress", (event, state) => {
  console.log(state);

  let progress = state.percent;
  let speed = Math.round(state.bytesPerSecond / 1024);
  let progressBar = document.getElementById("progressBar");
  progressBar.style.width = Math.round(progress) + "%";

  state.total = Math.round((state.total / 1024 / 1024) * 100) / 100;
  state.transferred = Math.round((state.transferred / 1024 / 1024) * 100) / 100;

  document.getElementById(
    "progressText"
  ).innerHTML = ` ${state.transferred}mb / ${state.total}mb (${speed}kb/s)`;
});

/*
state (download-progress)
	progress ProgressInfo
	bytesPerSecond
	percent
	total
	transferred
*/
