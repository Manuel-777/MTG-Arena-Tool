import anime from 'animejs';
import { queryElements as $$, createDiv } from 'common/dom-fns';
import { createSelect } from 'common/select';
import * as deckDrawer from 'common/deck-drawer';
import { EASING_DEFAULT } from 'common/constants.js';
import { compare_cards, get_deck_export, get_deck_missing, getBoosterCountEstimate, makeId, objectClone, timestamp, toHHMMSS, urlDecode } from 'common/util';
import pd from 'common/player-data';
import Aggregator from './aggregator';
import FilterPanel from './filter-panel';
import { pop, changeBackground, drawDeck, drawDeckVisual, ipcSend } from './renderer-util';

let tournamentDeck = null;
let currentDeck = null;
let originalDeck = null;
let tou = null;

let touStates = {};

let stateClockInterval = null;
let lastSeenInterval = null;

export function tournamentCreate() {
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
  let mainDiv = $$("#ux_1")[0];
  mainDiv.innerHTML = "";
  mainDiv.classList.remove("flex_item");
  // Top navigation stuff
  let top = createDiv(["decklist_top"]);
  let buttonBack = createDiv(["button", "back"]);
  let topTitle = createDiv(["deck_name"], "Create Tournament");
  let topStatus = createDiv(["tou_top_status"]);
  top.appendChild(buttonBack);
  top.appendChild(topTitle);
  top.appendChild(topStatus);

  // Append
  mainDiv.appendChild(top);
  buttonBack.addEventListener("click", () => {
    changeBackground("default");
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
}

let stats;
let record = "-";
export function tournamentOpen(t) {
  //console.log(t);
  tou = t;
  let mainDiv = $$("#ux_1")[0];
  mainDiv.innerHTML = "";
  mainDiv.classList.remove("flex_item");

  let sd = tou.signupDuration;
  let rd = tou.roundDuration;
  let roundsStart = tou.starts + sd * 60 * 60;
  let roundEnd =
    tou.starts + sd * 60 * 60 + (tou.currentRound + 1) * 60 * 60 * rd;

  if (tou.deck) {
    currentDeck = tou.deck;
    originalDeck = objectClone(tou.deck);
  }

  let joined = false;
  if (tou.players.indexOf(pd.name) !== -1) {
    joined = true;
    stats = tou.playerStats[pd.name];
    record = stats.w + " - " + stats.d + " - " + stats.l;
  }

  let topButtonBack = createDiv(["button", "back"]);
  let topDeckName = createDiv(["deck_name"], tou.name);
  let top = createDiv(["decklist_top"]);
  top.appendChild(topButtonBack);
  top.appendChild(topDeckName);

  let flr = createDiv(["tou_top_status", "state_clock"]);
  flr.style.alignSelf = "center";

  let state = "";
  if (stateClockInterval !== null) clearInterval(stateClockInterval);
  if (tou.state == -1) {
    state = "";
    stateClockInterval = window.setInterval(() => {
      let tst = timestamp();
      let clockDiv = $$(".state_clock")[0];
      if (clockDiv == undefined) clearInterval(stateClockInterval);
      else
        clockDiv.innerHTML =
          "Registration begin in " + toHHMMSS(tst - tou.starts);
    }, 1000);
  }
  if (tou.state == 0) {
    state = "";
    stateClockInterval = window.setInterval(() => {
      let tst = timestamp();
      let clockDiv = $$(".state_clock")[0];
      if (clockDiv == undefined) clearInterval(stateClockInterval);
      else if (joined) {
        clockDiv.innerHTML = "Starts in " + toHHMMSS(roundsStart - tst);
      } else {
        clockDiv.innerHTML = toHHMMSS(roundsStart - tst) + " left to register.";
      }
    }, 1000);
  }
  if (tou.state == 1) {
    state = "";
    stateClockInterval = window.setInterval(() => {
      let tst = timestamp();
      let clockDiv = $$(".state_clock")[0];
      if (clockDiv == undefined) clearInterval(stateClockInterval);
      else
        clockDiv.innerHTML = `Round ${tou.currentRound + 1} ends in ${toHHMMSS(
          roundEnd - tst
        )}`;
    }, 1000);
  }
  if (tou.state == 3) {
    state = "";
    //$$(".state_clock")[0].innerHTML = "Top " + tou.top;
  }
  if (tou.state == 4) {
    state = "Tournament finish.";
  }

  flr.innerHTML = state;
  top.appendChild(flr);
  mainDiv.appendChild(top);

  let desc = createDiv(["tou_desc"], tou.desc);
  desc.style.alignSelf = "center";
  mainDiv.appendChild(desc);

  if (tou.state <= 0) {
    showTournamentRegister(mainDiv, tou);
  } else {
    showTournamentStarted(mainDiv, tou);
  }

  topButtonBack.addEventListener("click", () => {
    changeBackground("default");
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
}

function showTournamentRegister(mainDiv, tou) {
  let joined = false;
  if (tou.players.indexOf(pd.name) !== -1) {
    joined = true;
  }

  let buttonDrop, buttonJoin;
  if (joined) {
    let deckContainer = createDiv(["flex_item"]);
    let deckvisual = createDiv(["decklist"]);
    deckContainer.appendChild(deckvisual);

    mainDiv.appendChild(deckContainer);
    if (tou.deck) {
      drawDeckVisual(deckContainer, tou.deck);
    }

    if (tou.state !== 4) {
      buttonDrop = createDiv(["button_simple", "but_drop"], "Drop");
      mainDiv.appendChild(buttonDrop);
    }
  } else {
    let deckSelectContainer = createDiv(["flex_item"]);

    // filter to current decks in Arena with no missing cards
    const validDecks = pd.deckList
      .filter(deck => !deck.custom)
      .filter(deck => getBoosterCountEstimate(get_deck_missing(deck)) === 0);

    validDecks.sort(new Aggregator({ onlyCurrentDecks: true }).compareDecks);
    // hack to make pretty deck names
    // TODO move getDeckString out of FilterPanel
    const filterPanel = new FilterPanel("unused", null, {}, [], [], validDecks);
    const deckSelect = createSelect(
      deckSelectContainer,
      validDecks.map(deck => deck.id),
      -1,
      selectTourneyDeck,
      "tou_deck_select",
      filterPanel.getDeckString
    );

    deckSelect.style.width = "300px";
    deckSelect.style.margin = "16px auto";
    mainDiv.appendChild(deckSelect);

    if (tou.state == 0) {
      if (tou.password) {
        let cont = createDiv([
          "input_login_container",
          "tourney_pwd_container"
        ]);

        let lockIcon = createDiv(["status_locked", "input_lock"]);

        let pwdInput = document.createElement("input");
        pwdInput.id = "tourney_pass";
        pwdInput.autocomplete = "off";
        pwdInput.type = "password";

        let lockedMsg = createDiv(
          ["tou_desc"],
          "This tournament is password protected."
        );
        lockedMsg.style.margin = "32px 0 0px 0px";
        mainDiv.appendChild(lockedMsg);

        cont.appendChild(lockIcon);
        cont.appendChild(pwdInput);
        mainDiv.appendChild(cont);
      }

      buttonJoin = createDiv(["button_simple_disabled", "but_join"], "Join");
      mainDiv.appendChild(buttonJoin);
    }

    let joinDecklist = createDiv(["join_decklist"]);
    mainDiv.appendChild(joinDecklist);
  }

  let list = createDiv(["tou_list_players"]);
  let pJoined = createDiv(
    ["tou_list_player_name", "tou_list_player_name_title"],
    "Players joined:"
  );
  list.appendChild(pJoined);

  tou.players.forEach(p => {
    let pName = createDiv(["tou_list_player_name"], p.slice(0, -6));
    list.appendChild(pName);
  });
  list.appendChild(document.createElement("br"));
  mainDiv.appendChild(list);

  if (buttonJoin) {
    buttonJoin.addEventListener("click", () => {
      if (buttonJoin.classList.contains("button_simple")) {
        if (tou.password) {
          let pwd = document.getElementById("tourney_pass").value;
          tournamentJoin(tou._id, tournamentDeck, pwd);
        } else {
          tournamentJoin(tou._id, tournamentDeck, "");
        }
      }
    });
  }

  if (buttonDrop) {
    buttonDrop.addEventListener("click", () => {
      ipcSend("tou_drop", tou._id);
    });
  }
}

function tournamentJoin(_id, _deck, _pass) {
  ipcSend("tou_join", { id: _id, deck: _deck, pass: _pass });
}

function showTournamentStarted(mainDiv, tou) {
  let joined = false;
  if (tou.players.indexOf(pd.name) !== -1) {
    joined = true;
    stats = tou.playerStats[pd.name];
    record = stats.w + " - " + stats.d + " - " + stats.l;
  }

  if (tou.state !== 4) {
    let div = createDiv(["tou_reload"]);
    mainDiv.appendChild(div);
    div.addEventListener("click", () => {
      tournamentOpen(tou);
    });
  }
  if (joined) {
    let touRecordDiv = createDiv(["tou_record", "green"], record);
    mainDiv.appendChild(touRecordDiv);

    if (tou.state !== 4) {
      let onMtgaDiv = createDiv(
        ["tou_opp"],
        `<span>On MTGA: </span><span style="margin-left: 10px; color: rgb(250, 229, 210);">${urlDecode(
          tou.current_opponent
        )}`
      );
      let copyMtgaButton = createDiv(["copy_button", "copy_mtga"]);
      onMtgaDiv.appendChild(copyMtgaButton);
      mainDiv.appendChild(onMtgaDiv);

      let onDiscordDiv = createDiv(
        ["tou_opp"],
        `<span>On Discord: </span><span style="margin-left: 10px; color: rgb(250, 229, 210);">${urlDecode(
          tou.current_opponent_discord
        )}`
      );
      let copyDiscordButton = createDiv(["copy_button", "copy_discord"]);
      onDiscordDiv.appendChild(copyDiscordButton);
      mainDiv.appendChild(onDiscordDiv);

      let lastSeenDiv = createDiv(["tou_opp", "tou_opp_sub"]);
      let clockSpan = document.createElement("span");
      clockSpan.classList.add("last_seen_clock");
      lastSeenDiv.appendChild(clockSpan);
      mainDiv.appendChild(lastSeenDiv);

      copyMtgaButton.addEventListener("click", () => {
        pop("Copied to clipboard", 1000);
        ipcSend("set_clipboard", urlDecode(tou.current_opponent));
      });

      copyDiscordButton.addEventListener("click", () => {
        pop("Copied to clipboard", 1000);
        ipcSend("set_clipboard", urlDecode(tou.current_opponent_discord));
      });
    }

    if (lastSeenInterval !== null) clearInterval(lastSeenInterval);
    if (tou.current_opponent_last !== tou.server_time) {
      lastSeenInterval = window.setInterval(() => {
        let tst = timestamp();
        let diff = tst - tou.current_opponent_last;
        $$(".last_seen_clock")[0].innerHTML = `Last seen ${toHHMMSS(
          diff
        )} ago.`;
      }, 250);
    }

    if (
      tou.state !== 4 &&
      tou.current_opponent !== "bye" &&
      tou.current_opponent !== ""
    ) {
      let checks = createDiv(["tou_checks"]);
      checks.appendChild(generateChecks(tou.current_check, tou.current_seat));
      mainDiv.appendChild(checks);
    }
  }

  let tabs = createDiv(["tou_tabs_cont"]);
  let tab_rounds = createDiv(
    ["tou_tab", "tab_a", "tou_tab_selected"],
    "Rounds"
  );
  let tab_standings = createDiv(["tou_tab", "tab_b"], "Standings");

  tabs.appendChild(tab_rounds);
  tabs.appendChild(tab_standings);

  if (joined) {
    let tab_decklist = createDiv(["tou_tab", "tab_c"], "Decklist");
    tabs.appendChild(tab_decklist);
  }

  mainDiv.appendChild(tabs);

  let tab_cont_a = createRoundsTab(joined);
  let tab_cont_b = createStandingsTab(joined);

  mainDiv.appendChild(tab_cont_a);
  mainDiv.appendChild(tab_cont_b);

  if (joined) {
    let tab_cont_c = createDecklistTab();
    mainDiv.appendChild(tab_cont_c);
  }

  $$(".tou_tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (!tab.classList.contains("tou_tab_selected")) {
        $$(".tou_tab").forEach(_tab => {
          _tab.classList.remove("tou_tab_selected");
        });

        tab.classList.add("tou_tab_selected");
        $$(".tou_cont_div").forEach(cont => {
          cont.style.height = "0px";
          if (
            tab.classList.contains("tab_a") &&
            cont.classList.contains("tou_cont_a")
          )
            cont.style.height = "auto";
          if (
            tab.classList.contains("tab_b") &&
            cont.classList.contains("tou_cont_b")
          )
            cont.style.height = "auto";
          if (
            tab.classList.contains("tab_c") &&
            cont.classList.contains("tou_cont_c")
          )
            cont.style.height = "auto";
          if (
            tab.classList.contains("tab_d") &&
            cont.classList.contains("tou_cont_d")
          )
            cont.style.height = "auto";
        });
      }
    });
  });
}

function sort_top(a, b) {
  return a.id - b.id;
}

function createMatchDiv(match) {
  let matchContainerDiv = createDiv(["tou_match_cont"]);
  let p1wc = "tou_score_loss";
  let p2wc = "tou_score_loss";
  if (match.winner == 1) p1wc = "tou_score_win";
  if (match.winner == 2) p2wc = "tou_score_win";

  if (match.p1 == "") match.p1 = "TBD#00000";
  if (match.p2 == "") match.p2 = "TBD#00000";

  let d1 = "";
  let d2 = "";
  if (match.p2 == "bye") match.p2 = "BYE#00000";
  try {
    if (match.drop1) d1 = " (drop)";
    if (match.drop2) d2 = " (drop)";
  } catch (e) {
    console.error(e);
  }

  let s = "";
  let p1 = createDiv(
    ["tou_match_p", match.p1 + "pn"],
    match.p1.slice(0, -6) + d1
  );
  if (match.check[0] == true) p1.style.borderLeft = "solid 4px #b7c89e";
  else p1.style.borderLeft = "solid 4px #dd8263";
  let p1w = createDiv([p1wc, "tou_match_score"], match.p1w);
  p1.appendChild(p1w);

  s = "";
  if (match.p2 == "BYE#00000") s = 'style="color: rgba(250, 229, 210, 0.65);"';

  let p2 = createDiv(
    ["tou_match_p", match.p2 + "pn"],
    match.p2.slice(0, -6) + d2
  );
  if (match.check[1] == true) p2.style.borderLeft = "solid 4px #b7c89e";
  else p2.style.borderLeft = "solid 4px #dd8263";
  let p2w = createDiv([p2wc, "tou_match_score"], match.p2w);
  p2.appendChild(p2w);

  matchContainerDiv.appendChild(p1);
  matchContainerDiv.appendChild(p2);
  return matchContainerDiv;
}

function createRoundsTab(joined) {
  let tab_cont_a = createDiv(["tou_cont_a", "tou_cont_div"]);

  // DRAW TOP 8
  if (tou.top > 0 && tou.state >= 3) {
    let top_cont = createDiv(["tou_top"]);
    let tou_cont_a = createDiv(["tou_top_cont"]);
    let tou_cont_b = createDiv(["tou_top_cont"]);
    let tou_cont_c = createDiv(["tou_top_cont"]);

    let roundTitle = createDiv(["tou_round_title"], "Top " + tou.top);
    let roundContainer = createDiv(["tou_round_cont"]);

    let topMatches = tou["round_top"].sort(sort_top);

    if (tou.top >= 2) {
      tou_cont_c.appendChild(createMatchDiv(topMatches[0]));
    }
    if (tou.top >= 4) {
      tou_cont_b.appendChild(createMatchDiv(topMatches[1]));
      tou_cont_b.appendChild(createMatchDiv(topMatches[2]));
    }
    if (tou.top >= 8) {
      tou_cont_a.appendChild(createMatchDiv(topMatches[3]));
      tou_cont_a.appendChild(createMatchDiv(topMatches[4]));
      tou_cont_a.appendChild(createMatchDiv(topMatches[5]));
      tou_cont_a.appendChild(createMatchDiv(topMatches[6]));
    }
    if (tou.top >= 8) top_cont.appendChild(tou_cont_a);
    if (tou.top >= 4) top_cont.appendChild(tou_cont_b);
    if (tou.top >= 2) top_cont.appendChild(tou_cont_c);

    roundContainer.appendChild(top_cont);
    tab_cont_a.appendChild(roundTitle);
    tab_cont_a.appendChild(roundContainer);
  }

  // DRAW ROUNDS
  for (let i = tou.currentRound; i >= 0; i--) {
    let rname = "round_" + i;
    if (tou[rname] !== undefined) {
      let roundTitle = createDiv(["tou_round_title"], "Round " + (i + 1));
      let roundContainer = createDiv(["tou_round_cont"]);

      tou[rname].forEach(match => {
        let matchContainerDiv = createMatchDiv(match);
        roundContainer.appendChild(matchContainerDiv);
      });
      tab_cont_a.appendChild(roundTitle);
      tab_cont_a.appendChild(roundContainer);
    }
  }

  // DRAW DROP
  if (joined) {
    let dropButton = createDiv(["button_simple", "but_drop"], "Drop");
    tab_cont_a.appendChild(dropButton);
    dropButton.addEventListener("click", () => {
      ipcSend("tou_drop", tou._id);
    });
  }

  return tab_cont_a;
}

function createStandingsTab(joined) {
  let tab_cont_b = createDiv(["tou_cont_b", "tou_cont_div"]);
  tab_cont_b.style.height = "0px";

  tou.players.sort(function(a, b) {
    if (tou.playerStats[a].mp > tou.playerStats[b].mp) return -1;
    else if (tou.playerStats[a].mp < tou.playerStats[b].mp) return 1;
    else {
      if (tou.playerStats[a].omwp > tou.playerStats[b].omwp) return -1;
      else if (tou.playerStats[a].omwp < tou.playerStats[b].omwp) return 1;
      else {
        if (tou.playerStats[a].gwp > tou.playerStats[b].gwp) return -1;
        else if (tou.playerStats[a].gwp < tou.playerStats[b].gwp) return 1;
        else {
          if (tou.playerStats[a].ogwp > tou.playerStats[b].ogwp) return -1;
          else if (tou.playerStats[a].ogwp < tou.playerStats[b].ogwp) return 1;
        }
      }
    }
    return 0;
  });

  let desc = createDiv(
    ["tou_desc"],
    "Points are updated only when a round ends."
  );
  tab_cont_b.appendChild(desc);

  let line = createDiv(["tou_stand_line_title", "line_dark"]);
  let linePos = createDiv(["tou_stand_cell"], "Pos");
  let lineName = createDiv(["tou_stand_cell"], "Name");
  let lineWarn = createDiv(["tou_stand_cell", "tou_center"], "Warn");
  let linePoints = createDiv(["tou_stand_cell", "tou_center"], "Points");
  let lineScore = createDiv(["tou_stand_cell", "tou_center"], "Score");
  let lineMatches = createDiv(["tou_stand_cell", "tou_center"], "Matches");
  let lineGames = createDiv(["tou_stand_cell", "tou_center"], "Games");
  let lineOMW = createDiv(["tou_stand_cell", "tou_center"], "OMW");
  let lineGW = createDiv(["tou_stand_cell", "tou_center"], "GW");
  let lineOGW = createDiv(["tou_stand_cell", "tou_center"], "OGW");

  linePos.style.gridArea = `1 / 1 / auto / 3`;
  lineName.style.gridArea = `1 / 3 / auto / 4`;
  lineWarn.style.gridArea = `1 / 4 / auto / 5`;
  linePoints.style.gridArea = `1 / 5 / auto / 6`;
  lineScore.style.gridArea = `1 / 6 / auto / 7`;
  lineMatches.style.gridArea = `1 / 7 / auto / 8`;
  lineGames.style.gridArea = `1 / 8 / auto / 9`;
  lineOMW.style.gridArea = `1 / 9 / auto / 10`;
  lineGW.style.gridArea = `1 / 10 / auto / 11`;
  lineOGW.style.gridArea = `1 / 11 / auto / 12`;

  line.appendChild(linePos);
  line.appendChild(lineName);
  line.appendChild(lineWarn);
  line.appendChild(linePoints);
  line.appendChild(lineScore);
  line.appendChild(lineMatches);
  line.appendChild(lineGames);
  line.appendChild(lineOMW);
  line.appendChild(lineGW);
  line.appendChild(lineOGW);
  tab_cont_b.appendChild(line);

  // DRAW STANDINGS
  tou.players.forEach(function(pname, index) {
    let stat = tou.playerStats[pname];
    if (index % 2) {
      line = createDiv(["tou_stand_line", "line_dark"]);
    } else {
      line = createDiv(["tou_stand_line"]);
    }

    let linePos = createDiv(["tou_stand_cell"], index + 1);

    let lineFlag = createDiv(["tou_stand_cell"]);

    let flag = document.createElement("img");
    flag.src = "blank.gif";
    flag.classList.add("flag");
    flag.classList.add("tou_flag");
    flag.classList.add("flag-" + tou.flags[pname].toLowerCase());
    lineFlag.appendChild(flag);

    let lineName = createDiv(
      ["tou_stand_cell"],
      pname.slice(0, -6) +
        " " +
        (tou.drops.indexOf(pname) !== -1 ? " (drop)" : "")
    );

    let lineWarn = createDiv(
      ["tou_stand_cell", "tou_center"],
      tou.warnings[pname] ? tou.warnings[pname] : "-"
    );
    let linePoints = createDiv(["tou_stand_cell", "tou_center"], stat.mp);
    let lineScore = createDiv(
      ["tou_stand_cell", "tou_center"],
      `${stat.w}-${stat.d}-${stat.l}`
    );
    let lineMatches = createDiv(["tou_stand_cell", "tou_center"], stat.rpl);
    let lineGames = createDiv(["tou_stand_cell", "tou_center"], stat.gpl);
    let lineOMW = createDiv(
      ["tou_stand_cell", "tou_center"],
      `${Math.round(stat.omwp * 10000) / 100}%`
    );
    let lineGW = createDiv(
      ["tou_stand_cell", "tou_center"],
      `${Math.round(stat.gwp * 10000) / 100}%`
    );
    let lineOGW = createDiv(
      ["tou_stand_cell", "tou_center"],
      `${Math.round(stat.ogwp * 10000) / 100}%`
    );

    linePos.style.gridArea = `1 / 1 / auto / 2`;
    lineFlag.style.gridArea = `1 / 2 / auto / 3`;
    lineName.style.gridArea = `1 / 3 / auto / 4`;
    lineWarn.style.gridArea = `1 / 4 / auto / 5`;
    linePoints.style.gridArea = `1 / 5 / auto / 6`;
    lineScore.style.gridArea = `1 / 6 / auto / 7`;
    lineMatches.style.gridArea = `1 / 7 / auto / 8`;
    lineGames.style.gridArea = `1 / 8 / auto / 9`;
    lineOMW.style.gridArea = `1 / 9 / auto / 10`;
    lineGW.style.gridArea = `1 / 10/ auto / 11`;
    lineOGW.style.gridArea = `1 / 11 / auto / 12`;

    line.appendChild(linePos);
    line.appendChild(lineFlag);
    line.appendChild(lineName);
    line.appendChild(lineWarn);
    line.appendChild(linePoints);
    line.appendChild(lineScore);
    line.appendChild(lineMatches);
    line.appendChild(lineGames);
    line.appendChild(lineOMW);
    line.appendChild(lineGW);
    line.appendChild(lineOGW);
    tab_cont_b.appendChild(line);
    tab_cont_b.appendChild(line);
  });

  return tab_cont_b;
}

function createDecklistTab() {
  let tab_cont_c = createDiv(["tou_cont_c", "tou_cont_div"]);
  tab_cont_c.style.height = "0px";

  let decklistCont = createDiv(["sideboarder_container"]);
  drawSideboardDeck(decklistCont);

  let buttonExport = createDiv(
    ["button_simple", "exportDeck"],
    "Export to Arena"
  );
  tab_cont_c.appendChild(buttonExport);
  tab_cont_c.appendChild(decklistCont);

  buttonExport.addEventListener("click", () => {
    let list = get_deck_export(currentDeck);
    ipcSend("set_clipboard", list);
  });
  return tab_cont_c;
}

export function tournamentSetState(state) {
  touStates[state.tid] = state;
  if (state.tid == tou._id) {
    $$(".tou_checks")[0].innerHTML = "";
    $$(".tou_checks").appendChild(
      generateChecks(state.check, state.game, state.seat)
    );
  }
}

function generateChecks(state, seat) {
  let checks = createDiv(["tou_check_cont"]);

  state.forEach((c, index) => {
    let ch;
    let ss = index % 2;
    ch = createDiv(["tou_check", c ? "green_bright_bg" : "red_bright_bg"]);
    ch.title = ss == seat ? "You" : tou.current_opponent.slice(0, -6);
    checks.appendChild(ch);
  });

  return checks;
}

function selectTourneyDeck(index) {
  const _deck = pd.deck(index);
  tournamentDeck = _deck.id;
  _deck.mainDeck.sort(compare_cards);
  _deck.sideboard.sort(compare_cards);
  drawDeck($$(".join_decklist")[0], _deck, true);

  $$(".but_join")[0].classList.add("button_simple");
}

function drawSideboardDeck(div) {
  let unique = makeId(4);

  div.innerHTML = "";
  div.style.dsiplay = "flex";

  let mainboardDiv = createDiv(["decklist_divided"]);

  currentDeck.mainDeck.sort(compare_cards);
  currentDeck.sideboard.sort(compare_cards);

  let size = 0;
  currentDeck.mainDeck.forEach(function(card) {
    size += card.quantity;
  });
  let separator = deckDrawer.cardSeparator(`Mainboard (${size})`);
  mainboardDiv.append(separator);
  currentDeck.mainDeck.forEach(function(card) {
    let grpId = card.id;

    if (card.quantity > 0) {
      let tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        grpId,
        unique + "a",
        card.quantity
      );
      mainboardDiv.append(tile);
    }
  });

  let sideboardDiv = createDiv(["decklist_divided"]);

  if (currentDeck.sideboard != undefined) {
    if (currentDeck.sideboard.length > 0) {
      size = 0;
      currentDeck.sideboard.forEach(function(card) {
        size += card.quantity;
      });
      let separator = deckDrawer.cardSeparator(`Sideboard (${size})`);
      sideboardDiv.append(separator);

      currentDeck.sideboard.forEach(function(card) {
        let grpId = card.id;
        if (card.quantity > 0) {
          let tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            grpId,
            unique + "b",
            card.quantity
          );
          sideboardDiv.append(tile);
        }
      });
    }
  }

  div.appendChild(mainboardDiv);
  div.appendChild(sideboardDiv);
}
