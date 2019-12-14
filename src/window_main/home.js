import { shell } from "electron";
import db from "../shared/database";
import pd from "../shared/player-data";
import { queryElements as $$, createDiv } from "../shared/dom-fns";
import { addCardHover } from "../shared/card-hover";
import { toHHMMSS, toDDHHMMSS, timestamp } from "../shared/util";
import { tournamentCreate } from "./tournaments";
import {
  getLocalState,
  ipcSend,
  resetMainContainer,
  showLoadingBars
} from "./renderer-util";

let usersActive;
let tournaments_list;
let listInterval = [];
let topWildcards = null;
let homeInterval = null;
let filteredWildcardsSet = "";

//
function clearHomeInverals() {
  listInterval.forEach(_id => {
    clearInterval(_id);
  });
}

//
export function requestHome() {
  ipcSend("request_home", filteredWildcardsSet);
}

// Should separate these two into smaller functions
export function openHomeTab(arg, opentab = true) {
  const ls = getLocalState();
  const mainDiv = resetMainContainer();

  if (arg) {
    tournaments_list = arg.tournaments;
    topWildcards = arg.wildcards;
    usersActive = arg.users_active;
    if (!opentab) return;
  }

  if (usersActive) {
    let d = createDiv(["list_fill"]);
    mainDiv.appendChild(d);
    let title = createDiv(["card_tile_separator"], "General");
    mainDiv.appendChild(title);
    let users = createDiv(["text_centered"], "Users active: " + usersActive);
    users.setAttribute("tooltip-content", "In the last 24 hours.");
    users.setAttribute("tooltip-bottom", "");
    users.style.textAlign = "center";

    let daily = createDiv(
      ["text_centered", "white", "daily_left"],
      "Daily rewards end: -"
    );
    daily.style.textAlign = "center";

    const weekly = createDiv(
      ["text_centered", "white", "weekly_left"],
      "Weekly rewards end: -"
    );
    weekly.style.textAlign = "center";

    if (homeInterval !== null) clearInterval(homeInterval);

    homeInterval = window.setInterval(() => {
      let dd = db.rewards_daily_ends;
      let timeleft = dd.getTime() / 1000 - timestamp();
      daily.innerHTML = "Daily rewards end: " + toDDHHMMSS(timeleft);

      dd = db.rewards_weekly_ends;
      timeleft = dd.getTime() / 1000 - timestamp();
      weekly.innerHTML = "Weekly rewards end: " + toDDHHMMSS(timeleft);
    }, 250);

    mainDiv.appendChild(users);
    mainDiv.appendChild(daily);
    mainDiv.appendChild(weekly);
  }

  let d = createDiv(["list_fill"]);
  mainDiv.appendChild(d);
  let title = createDiv(["card_tile_separator"], "Tournaments");
  mainDiv.appendChild(title);
  let cont = createDiv(["tournament_list_cont"]);

  if (ls.discordTag === null || ls.discordTag == "") {
    let but = createDiv(["discord_but"]);
    but.addEventListener("click", () => {
      let url =
        "https://discordapp.com/api/oauth2/authorize?client_id=531626302004789280&redirect_uri=http%3A%2F%2Fmtgatool.com%2Fdiscord%2F&response_type=code&scope=identify%20email&state=" +
        ls.authToken;
      shell.openExternal(url);
    });

    cont.appendChild(but);
  } else {
    let dname = ls.discordTag.split("#")[0];
    let fl = createDiv(
      ["flex_item"],
      `<div class="discord_icon"></div><div class="top_username discord_username">${dname}</div><div class="discord_message">Your discord tag will be visible to your opponents.</div>`
    );
    fl.style.margin = "auto";
    fl.style.width = "fit-content";
    mainDiv.appendChild(fl);

    let unlinkBut = createDiv(["button_simple", "centered"], "Unlink");
    mainDiv.appendChild(unlinkBut);

    unlinkBut.addEventListener("click", () => {
      ipcSend("unlink_discord", true);
    });

    clearHomeInverals();
    listInterval = [];
    if (tournaments_list) {
      // Create tournament button
      if (pd.name === "Manuel777#63494") {
        let div = createDiv(["tou_container"]);
        div.id = "create";
        div.style.justifyContent = "center";
        let createBut = createDiv(["tou_create_but"]);
        let nam = createDiv(["tou_name"], "Create tournament");
        nam.style.width = "auto";

        div.appendChild(createBut);
        div.appendChild(nam);
        cont.appendChild(div);
      }

      // Tournaments list
      tournaments_list.forEach(function(tou, index) {
        let div = createDiv(["tou_container"]);
        div.id = tou._id;

        let stat = createDiv(["top_status"]);
        if (tou.password) {
          stat.classList.add("status_locked");
        } else {
          if (tou.state == -1) stat.classList.add("status_red");
          else if (tou.state == 4) stat.classList.add("status_black");
          else stat.classList.add("status_green");
        }

        let sd = tou.signupDuration;
        let rd = tou.roundDuration;

        let roundsStart = tou.starts + sd * 60 * 60;
        let roundEnd =
          tou.starts + sd * 60 * 60 + (tou.currentRound + 1) * (60 * 60) * rd;

        let state = "-";
        let stateb = "-";
        if (tou.state == -1) {
          state = "";
          listInterval.push(
            window.setInterval(() => {
              let now = timestamp();
              try {
                $$(".list_state_" + index)[0].innerHTML =
                  "Registration begins in " + toHHMMSS(now - tou.starts);
              } catch (e) {
                clearHomeInverals();
              }
            }, 250)
          );
        }
        if (tou.state == 0) {
          state = "Registration in progress.";
          stateb = "";
          listInterval.push(
            window.setInterval(() => {
              let now = timestamp();
              try {
                $$(".list_stateb_" + index)[0].innerHTML =
                  toHHMMSS(roundsStart - now) + " left";
              } catch (e) {
                clearHomeInverals();
              }
            }, 250)
          );
        }
        if (tou.state == 1) {
          state =
            "Round " +
            (tou.currentRound + 1) +
            "/" +
            tou.maxRounds +
            " in progress.";
          stateb = "";
          listInterval.push(
            window.setInterval(() => {
              let now = timestamp();
              try {
                $$(".list_stateb_" + index)[0].innerHTML =
                  toHHMMSS(roundEnd - now) + " left";
              } catch (e) {
                clearHomeInverals();
              }
            }, 250)
          );
        }
        if (tou.state == 3) {
          state = "Top " + tou.top + " in progress.";
          stateb = "-";
        }
        if (tou.state == 4) {
          state = "Tournament finish.";
          stateb = "Winner: " + tou.winner.slice(0, -6);
        }

        let nam = createDiv(["tou_name"], tou.name);
        let fo = createDiv(["tou_cell"], tou.format);
        let st = createDiv(["tou_state", "list_state_" + index], state);
        let stb = createDiv(["tou_cell"], tou.players.length + " players.");
        let pln = createDiv(["tou_cell", "list_stateb_" + index], stateb);
        pln.style.width = "140px";
        div.appendChild(stat);
        div.appendChild(nam);
        div.appendChild(fo);
        div.appendChild(st);
        div.appendChild(stb);
        div.appendChild(pln);
        cont.appendChild(div);
      });
    }
  }

  mainDiv.appendChild(cont);

  $$(".tou_container").forEach(cont => {
    cont.addEventListener("click", () => {
      if (cont.id == "create") {
        tournamentCreate();
      } else {
        document.body.style.cursor = "progress";
        ipcSend("tou_get", cont.id);
      }
    });
  });

  let orderedSets = Object.keys(db.sets).filter(
    set => db.sets[set].collation > 0
  );

  orderedSets.sort((a, b) => {
    if (a.release < b.release) return 1;
    if (a.release > b.release) return -1;
    return 0;
  });

  if (topWildcards) {
    d = createDiv(["list_fill"]);
    mainDiv.appendChild(d);
    title = createDiv(["card_tile_separator"], "Top Wildcards redeemed");
    title.setAttribute("tooltip-content", "In the last 15 days.");
    title.setAttribute("tooltip-bottom", "");
    mainDiv.appendChild(title);

    let setsContainer = createDiv(["top_wildcards_sets_cont"]);
    orderedSets.forEach(set => {
      let setbutton = createDiv(["set_filter"]);
      setbutton.style.backgroundImage = `url(data:image/svg+xml;base64,${
        db.sets[set].svg
      })`;
      if (filteredWildcardsSet !== set) {
        setbutton.classList.add("set_filter_on");
      }
      setbutton.title = set;

      setsContainer.appendChild(setbutton);
      setbutton.addEventListener("click", () => {
        if (!setbutton.classList.contains("set_filter_on")) {
          setbutton.classList.add("set_filter_on");
          filteredWildcardsSet = "";
        } else {
          setbutton.classList.remove("set_filter_on");
          filteredWildcardsSet = set;
        }
        showLoadingBars();
        requestHome();
      });
    });

    mainDiv.appendChild(setsContainer);
    cont = createDiv(["top_wildcards_cont"]);

    let cell;
    cell = createDiv(["line_dark", "line_bottom_border"], "Top");
    cell.style.gridArea = `1 / 1 / auto / 3`;
    cont.appendChild(cell);

    cell = createDiv(["line_dark", "line_bottom_border"]);
    cell.style.gridArea = `1 / 3 / auto / 4`;
    cont.appendChild(cell);

    cell = createDiv(["line_dark", "line_bottom_border"], "Name");
    cell.style.gridArea = `1 / 4 / auto / 5`;
    cont.appendChild(cell);

    cell = createDiv(["line_dark", "line_bottom_border"], "Amount");
    cell.style.gridArea = `1 / 5 / auto / 6`;
    cont.appendChild(cell);

    cell = createDiv(["line_dark", "line_bottom_border"]);
    cell.style.gridArea = `1 / 6 / auto / 8`;
    cont.appendChild(cell);

    topWildcards.forEach((wc, index) => {
      let card = db.card(wc.grpId);
      let ld = index % 2 ? "line_dark" : "line_light";

      cell = createDiv([ld], index + 1);
      cell.style.gridArea = `${index + 2} / 1 / auto / auto`;
      cell.style.textAlign = "center";
      cont.appendChild(cell);

      cell = createDiv([ld]);
      cell.style.gridArea = `${index + 2} / 2 / auto / auto`;

      let imageDiv = createDiv(["top_wildcards_set_icon"]);
      imageDiv.style.backgroundImage = `url(data:image/svg+xml;base64,${
        db.sets[card.set].svg
      })`;
      imageDiv.title = card.set;
      cell.appendChild(imageDiv);

      cont.appendChild(cell);

      cell = createDiv(["top_wildcards_wc_icon", "wc_" + wc.rarity, ld]);
      cell.title = wc.rarity;
      cell.style.gridArea = `${index + 2} / 3 / auto / auto`;
      cont.appendChild(cell);

      cell = createDiv([ld], card.name);
      cell.style.gridArea = `${index + 2} / 4 / auto / auto`;
      cell.style.textDecoration = "underline dotted";
      cont.appendChild(cell);
      addCardHover(cell, card);

      cell = createDiv([ld], wc.quantity);
      cell.style.gridArea = `${index + 2} / 5 / auto / auto`;
      cont.appendChild(cell);

      if (wc.change == 0) {
        cell = createDiv([ld]);
      } else {
        cell = createDiv([wc.change < 0 ? "arrow_down" : "arrow_up", ld]);
      }
      cell.style.gridArea = `${index + 2} / 6 / auto / auto`;
      cont.appendChild(cell);

      cell = createDiv([ld], (wc.change > 0 ? "+" : "") + wc.change);
      if (wc.change == 0) cell.innerHTML = "-";
      cell.style.gridArea = `${index + 2} / 7 / auto / auto`;
      cont.appendChild(cell);
    });

    mainDiv.appendChild(cont);
  }
}
