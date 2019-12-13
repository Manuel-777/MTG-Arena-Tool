import _ from "lodash";
import differenceInDays from "date-fns/differenceInDays";
import {
  IPC_OVERLAY,
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE,
  CONSTRUCTED_EVENTS
} from "../shared/constants";
import db from "../shared/database";
import { playerDb } from "../shared/db/LocalDatabase";
import CardsList from "../shared/cardsList";
import { get_deck_colors, objectClone } from "../shared/util";
import * as greToClientInterpreter from "./gre-to-client-interpreter";
import playerData from "../shared/player-data";
import sha1 from "js-sha1";
import globals from "./globals";
import getNameBySeat from "./getNameBySeat";
import Deck from "../shared/deck";
import {
  ipc_send,
  normaliseFields,
  parseWotcTimeFallback,
  setData
} from "./background-util";
import actionLog from "./actionLog";
import addCustomDeck from "./addCustomDeck";
import { createDraft, createMatch, completeMatch } from "./data";

var logLanguage = "English";

let skipMatch = false;

function clear_deck() {
  var deck = { mainDeck: [], sideboard: [], name: "" };
  ipc_send("set_deck", deck, IPC_OVERLAY);
}

function clearDraftData(draftId) {
  if (playerData.draftExists(draftId)) {
    if (playerData.draft_index.includes(draftId)) {
      const draft_index = [...playerData.draft_index];
      draft_index.splice(draft_index.indexOf(draftId), 1);
      setData({ draft_index }, false);
      playerDb.upsert("", "draft_index", draft_index);
    }
    setData({ [draftId]: null });
    playerDb.remove("", draftId);
  }
}

function decodePayload(payload, msgType) {
  const messages = require("./messages_pb");
  const binaryMsg = new Buffer.from(payload, "base64");

  try {
    let msgDeserialiser;
    if (
      msgType === "ClientToGREMessage" ||
      msgType === "ClientToGREUIMessage"
    ) {
      msgDeserialiser = messages.ClientToGREMessage;
    } else if (msgType === "ClientToMatchDoorConnectRequest") {
      msgDeserialiser = messages.ClientToMatchDoorConnectRequest;
    } else if (msgType === "AuthenticateRequest") {
      msgDeserialiser = messages.AuthenticateRequest;
    } else if (msgType === "CreateMatchGameRoomRequest") {
      msgDeserialiser = messages.CreateMatchGameRoomRequest;
    } else if (msgType === "EchoRequest") {
      msgDeserialiser = messages.EchoRequest;
    } else {
      console.warn(`${msgType} - unknown message type`);
      return;
    }
    const msg = msgDeserialiser.deserializeBinary(binaryMsg);
    return msg.toObject();
  } catch (e) {
    console.log(e.message);
  }

  return;
}

function startDraft() {
  if (globals.debugLog || !globals.firstPass) {
    if (playerData.settings.close_on_match) {
      ipc_send("renderer_hide", 1);
    }
    ipc_send("set_arena_state", ARENA_MODE_DRAFT);
  }
  globals.duringDraft = true;
}

function getDraftData(id, entry) {
  const data = playerData.draft(id) || createDraft(id, entry);
  if (!data.date) {
    // the first event we see we set the date.
    data.date = globals.logTime;
  }
  return data;
}

//
function setDraftData(data) {
  if (!data || !data.id) {
    console.log("Couldnt save undefined draft:", data);
    return;
  }
  const { id } = data;

  // console.log("Set draft data:", data);
  if (!playerData.draft_index.includes(id)) {
    const draft_index = [...playerData.draft_index, id];
    playerDb.upsert("", "draft_index", draft_index);
    setData({ draft_index }, false);
  }

  playerDb.upsert("", id, data);
  setData({
    [id]: data,
    cards: playerData.cards,
    cardsNew: playerData.cardsNew
  });
  ipc_send("set_draft_cards", data, IPC_OVERLAY);
}

//
function endDraft(data) {
  globals.duringDraft = false;
  if (globals.debugLog || !globals.firstPass)
    ipc_send("set_arena_state", ARENA_MODE_IDLE);
  if (!data) return;
  const httpApi = require("./httpApi");
  httpApi.httpSetDraft(data);
  ipc_send("popup", { text: "Draft saved!", time: 3000 });
}

// Create a match from data, set globals and trigger ipc
function processMatch(json, matchBeginTime) {
  actionLog(-99, globals.logTime, "");

  if (globals.debugLog || !globals.firstPass) {
    ipc_send("set_arena_state", ARENA_MODE_MATCH);
  }

  var match = createMatch(json, matchBeginTime);

  // set global values

  globals.currentMatch = match;
  globals.matchGameStats = [];
  globals.matchCompletedOnGameNumber = 0;
  globals.gameNumberCompleted = 0;
  globals.initialLibraryInstanceIds = [];
  globals.idChanges = {};
  globals.instanceToCardIdMap = {};

  ipc_send("ipc_log", "vs " + match.opponent.name);

  if (match.eventId == "DirectGame" && globals.currentDeck) {
    let str = globals.currentDeck.getSave();
    const httpApi = require("./httpApi");
    httpApi.httpTournamentCheck(str, match.opponent.name, true);
  }

  return match;
}

//
function saveCourse(json) {
  const id = json._id;
  delete json._id;
  json.id = id;
  const eventData = {
    date: globals.logTime,
    // preserve custom fields if possible
    ...(playerData.event(id) || {}),
    ...json
  };

  if (!playerData.courses_index.includes(id)) {
    const courses_index = [...playerData.courses_index, id];
    playerDb.upsert("", "courses_index", courses_index);
    setData({ courses_index }, false);
  }

  playerDb.upsert("", id, eventData);
  setData({ [id]: eventData });
}

function saveEconomyTransaction(transaction) {
  const id = transaction.id;
  const txnData = {
    // preserve custom fields if possible
    ...(playerData.transaction(id) || {}),
    ...transaction
  };

  if (!playerData.economy_index.includes(id)) {
    const economy_index = [...playerData.economy_index, id];
    playerDb.upsert("", "economy_index", economy_index);
    setData({ economy_index }, false);
  }

  playerDb.upsert("", id, txnData);
  setData({ [id]: txnData });
  const httpApi = require("./httpApi");
  httpApi.httpSetEconomy(txnData);
}

function saveMatch(id, matchEndTime) {
  //console.log(globals.currentMatch.matchId, id);
  if (
    !globals.currentMatch ||
    !globals.currentMatch.matchTime ||
    globals.currentMatch.matchId !== id
  ) {
    return;
  }
  const existingMatch = playerData.match(id) || {};
  const match = completeMatch(
    existingMatch,
    globals.currentMatch,
    matchEndTime
  );
  if (!match) {
    return;
  }

  // console.log("Save match:", match);
  if (!playerData.matches_index.includes(id)) {
    const matches_index = [...playerData.matches_index, id];
    playerDb.upsert("", "matches_index", matches_index);
    setData({ matches_index }, false);
  }

  playerDb.upsert("", id, match);
  setData({ [id]: match });
  if (globals.matchCompletedOnGameNumber === globals.gameNumberCompleted) {
    const httpApi = require("./httpApi");
    httpApi.httpSetMatch(match);
  }
  ipc_send("popup", { text: "Match saved!", time: 3000 });
}

function select_deck(arg) {
  if (arg.CourseDeck) {
    globals.currentDeck = new Deck(arg.CourseDeck);
  } else {
    globals.currentDeck = new Deck(arg);
  }
  // console.log("Select deck: ", globals.currentDeck, arg);
  globals.originalDeck = globals.currentDeck.clone();
  ipc_send("set_deck", globals.currentDeck.getSave(), IPC_OVERLAY);
}

function convertV3ToV2(v3List) {
  const ret = [];
  for (let i = 0; i < v3List.length; i += 2) {
    if (v3List[i + 1] > 0) {
      ret.push({ id: v3List[i], quantity: v3List[i + 1] });
    }
  }
  return ret;
}

function convertDeckFromV3(deck) {
  if (deck.CourseDeck) {
    if (deck.CourseDeck.mainDeck)
      deck.CourseDeck.mainDeck = convertV3ToV2(deck.CourseDeck.mainDeck);
    if (deck.CourseDeck.sideboard)
      deck.CourseDeck.sideboard = convertV3ToV2(deck.CourseDeck.sideboard);
  } else {
    if (deck.mainDeck) deck.mainDeck = convertV3ToV2(deck.mainDeck);
    if (deck.sideboard) deck.sideboard = convertV3ToV2(deck.sideboard);
  }
  return deck;
}

export function onLabelOutLogInfo(entry) {
  const json = entry.json();
  if (!json) return;
  // console.log(json);

  if (json.params.messageName == "Client.UserDeviceSpecs") {
    let payload = {
      isWindowed: json.params.payloadObject.isWindowed,
      monitor: json.params.payloadObject.monitorResolution,
      game: json.params.payloadObject.gameResolution
    };
    ipc_send("set_device_specs", payload);
  }
  if (json.params.messageName == "DuelScene.GameStart") {
    let gameNumber = json.params.payloadObject.gameNumber;
    actionLog(-2, globals.logTime, `Game ${gameNumber} Start`);
  }

  if (json.params.messageName == "Client.Connected") {
    logLanguage = json.params.payloadObject.settings.language.language;
  }
  if (skipMatch) return;
  if (json.params.messageName == "DuelScene.GameStop") {
    globals.currentMatch.opponent.cards = globals.currentMatch.oppCardsUsed;

    var payload = json.params.payloadObject;

    let loserName = getNameBySeat(payload.winningTeamId == 1 ? 2 : 1);
    if (payload.winningReason == "ResultReason_Concede") {
      actionLog(-1, globals.logTime, `${loserName} Conceded`);
    }
    if (payload.winningReason == "ResultReason_Timeout") {
      actionLog(-1, globals.logTime, `${loserName} Timed out`);
    }

    let playerName = getNameBySeat(payload.winningTeamId);
    actionLog(-1, globals.logTime, `${playerName} Wins!`);

    var mid = payload.matchId + "-" + playerData.arenaId;
    var time = payload.secondsCount;
    if (mid == globals.currentMatch.matchId) {
      globals.gameNumberCompleted = payload.gameNumber;

      let game = {};
      game.time = time;
      game.winner = payload.winningTeamId;
      // Just a shortcut for future aggregations
      game.win = payload.winningTeamId == globals.currentMatch.player.seat;

      game.shuffledOrder = [];
      for (let i = 0; i < globals.initialLibraryInstanceIds.length; i++) {
        let instance = globals.initialLibraryInstanceIds[i];
        while (
          (!globals.instanceToCardIdMap[instance] ||
            !db.card(globals.instanceToCardIdMap[instance])) &&
          globals.idChanges[instance]
        ) {
          instance = globals.idChanges[instance];
        }
        let cardId = globals.instanceToCardIdMap[instance];
        if (db.card(cardId)) {
          game.shuffledOrder.push(cardId);
        } else {
          break;
        }
      }
      game.handsDrawn = payload.mulliganedHands.map(hand =>
        hand.map(card => card.grpId)
      );
      game.handsDrawn.push(
        game.shuffledOrder.slice(0, 7 - game.handsDrawn.length)
      );

      if (globals.gameNumberCompleted > 1) {
        let deckDiff = {};
        globals.currentMatch.player.deck.mainboard.get().forEach(card => {
          deckDiff[card.id] = card.quantity;
        });
        globals.currentMatch.player.originalDeck.mainboard
          .get()
          .forEach(card => {
            deckDiff[card.id] = (deckDiff[card.id] || 0) - card.quantity;
          });
        globals.matchGameStats.forEach((stats, i) => {
          if (i !== 0) {
            let prevChanges = stats.sideboardChanges;
            prevChanges.added.forEach(
              id => (deckDiff[id] = (deckDiff[id] || 0) - 1)
            );
            prevChanges.removed.forEach(
              id => (deckDiff[id] = (deckDiff[id] || 0) + 1)
            );
          }
        });

        let sideboardChanges = {
          added: [],
          removed: []
        };
        Object.keys(deckDiff).forEach(id => {
          let quantity = deckDiff[id];
          for (let i = 0; i < quantity; i++) {
            sideboardChanges.added.push(id);
          }
          for (let i = 0; i > quantity; i--) {
            sideboardChanges.removed.push(id);
          }
        });

        game.sideboardChanges = sideboardChanges;
        game.deck = objectClone(globals.currentMatch.player.deck.getSave());
      }

      game.handLands = game.handsDrawn.map(
        hand => hand.filter(card => db.card(card).type.includes("Land")).length
      );
      let handSize = 8 - game.handsDrawn.length;
      let deckSize = 0;
      let landsInDeck = 0;
      let multiCardPositions = { "2": {}, "3": {}, "4": {} };
      let cardCounts = {};
      globals.currentMatch.player.deck.mainboard.get().forEach(card => {
        cardCounts[card.id] = card.quantity;
        deckSize += card.quantity;
        if (card.quantity >= 2 && card.quantity <= 4) {
          multiCardPositions[card.quantity][card.id] = [];
        }
        let cardObj = db.card(card.id);
        if (cardObj && cardObj.type.includes("Land")) {
          landsInDeck += card.quantity;
        }
      });
      let librarySize = deckSize - handSize;
      let landsInLibrary =
        landsInDeck - game.handLands[game.handLands.length - 1];
      let landsSoFar = 0;
      let libraryLands = [];
      game.shuffledOrder.forEach((cardId, i) => {
        let cardCount = cardCounts[cardId];
        if (cardCount >= 2 && cardCount <= 4) {
          multiCardPositions[cardCount][cardId].push(i + 1);
        }
        if (i >= handSize) {
          let card = db.card(cardId);
          if (card && card.type.includes("Land")) {
            landsSoFar++;
          }
          libraryLands.push(landsSoFar);
        }
      });

      game.cardsCast = _.cloneDeep(globals.currentMatch.cardsCast);
      globals.currentMatch.cardsCast = [];
      game.deckSize = deckSize;
      game.landsInDeck = landsInDeck;
      game.multiCardPositions = multiCardPositions;
      game.librarySize = librarySize;
      game.landsInLibrary = landsInLibrary;
      game.libraryLands = libraryLands;

      globals.matchGameStats[globals.gameNumberCompleted - 1] = game;
      globals.currentMatch.matchTime = globals.matchGameStats.reduce(
        (acc, cur) => acc + cur.time,
        0
      );

      saveMatch(mid);
    }
  }
  if (json.params.messageName === "Client.SceneChange") {
    const { toSceneName } = json.params.payloadObject;
    if (toSceneName === "Home") {
      if (globals.debugLog || !globals.firstPass)
        ipc_send("set_arena_state", ARENA_MODE_IDLE);
      globals.duringMatch = false;
      endDraft();
    }
  }
}

export function onLabelGreToClient(entry) {
  const json = entry.json();
  if (!json) return;
  if (skipMatch) return;
  // Note: one of the only places we still depend on entry.timestamp
  globals.logTime = parseWotcTimeFallback(entry.timestamp);

  const message = json.greToClientEvent.greToClientMessages;
  message.forEach(function(msg) {
    let msgId = msg.msgId;
    greToClientInterpreter.GREMessage(msg, globals.logTime);
    /*
    globals.currentMatch.GREtoClient[msgId] = msg;
    globals.currentMatch.latestMessage = msgId;
    greToClientInterpreter.GREMessageByID(msgId, globals.logTime);
    */
  });
}

export function onLabelClientToMatchServiceMessageTypeClientToGREMessage(
  entry
) {
  const json = entry.json();
  if (!json) return;
  if (skipMatch) return;
  let payload = json;
  if (json.Payload) {
    payload = json.Payload;
  }

  if (typeof payload == "string") {
    const msgType = entry.label.split("_")[1];
    payload = decodePayload(payload, msgType);
    payload = normaliseFields(payload);
    // console.log("Client To GRE: ", payload);
  }

  if (payload.submitdeckresp) {
    // Get sideboard changes
    const deckResp = payload.submitdeckresp.deck;

    const tempMain = new CardsList(deckResp.deckcards);
    const tempSide = new CardsList(deckResp.sideboardcards);
    const newDeck = globals.currentMatch.player.deck.clone();
    newDeck.mainboard = tempMain;
    newDeck.sideboard = tempSide;

    globals.currentMatch.player.deck = newDeck;
    console.log("> ", globals.currentMatch.player.deck);
  }
}

export function onLabelInEventGetCombinedRankInfo(entry) {
  const json = entry.json();
  if (!json) return;
  const rank = { constructed: {}, limited: {} };

  rank.constructed.rank = json.constructedClass;
  rank.constructed.tier = json.constructedLevel;
  rank.constructed.step = json.constructedStep;

  rank.limited.rank = json.limitedClass;
  rank.limited.tier = json.limitedLevel;
  rank.limited.step = json.limitedStep;

  rank.constructed.won = json.constructedMatchesWon;
  rank.constructed.lost = json.constructedMatchesLost;
  rank.constructed.drawn = json.constructedMatchesDrawn;

  rank.limited.won = json.limitedMatchesWon;
  rank.limited.lost = json.limitedMatchesLost;
  rank.limited.drawn = json.limitedMatchesDrawn;

  rank.constructed.percentile = json.constructedPercentile;
  rank.constructed.leaderboardPlace = json.constructedLeaderboardPlace;
  rank.constructed.seasonOrdinal = json.constructedSeasonOrdinal;

  rank.limited.percentile = json.limitedPercentile;
  rank.limited.leaderboardPlace = json.limitedLeaderboardPlace;
  rank.limited.seasonOrdinal = json.limitedSeasonOrdinal;

  var infoLength = Object.keys(json).length - 1;
  var processedLength = [rank.limited, rank.constructed]
    .map(o => Object.keys(o).length)
    .reduce((a, b) => a + b, 0);
  if (infoLength != processedLength) {
    console.warn("rankInfo is not processing all data.", Object.keys(json));
  }

  setData({ rank });
  playerDb.upsert("", "rank", rank);
}

export function onLabelInEventGetActiveEventsV2(entry) {
  const json = entry.json();
  if (!json) return;

  let activeEvents = json.map(event => event.InternalEventName);
  ipc_send("set_active_events", JSON.stringify(activeEvents));
}

export function onLabelRankUpdated(entry) {
  const json = entry.json();
  if (!json) return;
  json.id = entry.hash;
  json.date = json.timestamp;
  json.timestamp = globals.logTime;
  json.lastMatchId = globals.currentMatch.matchId;
  json.eventId = globals.currentMatch.eventId;
  const rank = { ...playerData.rank };

  // json.wasLossProtected
  // json.seasonOrdinal
  const updateType = json.rankUpdateType.toLowerCase();

  rank[updateType].rank = json.newClass;
  rank[updateType].tier = json.newLevel;
  rank[updateType].step = json.newStep;
  rank[updateType].seasonOrdinal = json.seasonOrdinal;

  const seasonal_rank = playerData.addSeasonalRank(
    json,
    json.seasonOrdinal,
    updateType
  );

  const httpApi = require("./httpApi");
  httpApi.httpSetSeasonal(json);

  setData({ rank, seasonal_rank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonal_rank);
}

export function onLabelMythicRatingUpdated(entry) {
  const json = entry.json();
  // This is exclusive to constructed?
  // Not sure what the limited event is called.

  // Example data:
  // (-1) Incoming MythicRating.Updated {
  //   "oldMythicPercentile": 100.0,
  //   "newMythicPercentile": 100.0,
  //   "newMythicLeaderboardPlacement": 77,
  //   "context": "PostMatchResult"
  // }

  if (!json) return;
  json.date = json.timestamp;
  json.timestamp = parseWotcTimeFallback(json.timestamp).getTime();
  json.lastMatchId = globals.currentMatch.matchId;
  json.eventId = globals.currentMatch.eventId;

  // Default constructed?
  let type = "constructed";
  if (CONSTRUCTED_EVENTS.includes(json.eventId)) {
    type = "constructed";
  } else if (db.ranked_events.includes(json.eventId)) {
    type = "limited";
  }

  const rank = { ...playerData.rank };

  rank.constructed.percentile = json.newMythicPercentile;
  rank.constructed.leaderboardPlace = json.newMythicLeaderboardPlacement;

  let seasonal_rank = playerData.addSeasonalRank(
    json,
    rank.constructed.seasonOrdinal,
    type
  );

  setData({ rank, seasonal_rank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonal_rank);
}

export function onLabelInDeckGetDeckLists(entry, json = false) {
  if (!json && entry) json = entry.json();
  if (!json) return;

  const decks = { ...playerData.decks };
  const static_decks = [];
  json.forEach(deck => {
    const deckData = { ...(playerData.deck(deck.id) || {}), ...deck };
    decks[deck.id] = deckData;
    playerDb.upsert("decks", deck.id, deckData);
    static_decks.push(deck.id);
  });

  setData({ decks, static_decks });
  playerDb.upsert("", "static_decks", static_decks);
}

export function onLabelInDeckGetDeckListsV3(entry) {
  const json = entry.json();
  if (!json) return;
  onLabelInDeckGetDeckLists(
    entry,
    json.map(d => convertDeckFromV3(d))
  );
}

export function onLabelInDeckGetPreconDecks(entry) {
  const json = entry.json();
  if (!json) return;
  ipc_send("set_precon_decks", json);
  // console.log(json);
}

export function onLabelInEventGetPlayerCoursesV2(entry) {
  const json = entry.json();
  if (!json) return;

  const static_events = [];
  json.forEach(course => {
    if (course.CourseDeck) {
      course.CourseDeck = convertDeckFromV3(course.CourseDeck);
    }
    if (course.CurrentEventState != "PreMatch") {
      if (course.CourseDeck != null) {
        addCustomDeck(course.CourseDeck);
      }
    }
    if (course.Id) static_events.push(course.Id);
  });

  setData({ static_events });
  playerDb.upsert("", "static_events", static_events);
}

export function onLabelInEventGetPlayerCourseV2(entry) {
  const json = entry.json();
  if (!json) return;
  if (json.Id == "00000000-0000-0000-0000-000000000000") return;

  json.date = globals.logTime;
  json._id = json.Id;
  delete json.Id;

  if (json.CourseDeck) {
    json.CourseDeck = convertDeckFromV3(json.CourseDeck);
    json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
    addCustomDeck(json.CourseDeck);
    //json.date = timestamp();
    //console.log(json.CourseDeck, json.CourseDeck.colors)
    const httpApi = require("./httpApi");
    httpApi.httpSubmitCourse(json);
    saveCourse(json);
    select_deck(json);
  }
}

export function onLabelInEventJoin(entry) {
  const json = entry.json();
  if (!json) return;

  if (json.CourseDeck) {
    json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
    addCustomDeck(json.CourseDeck);
    select_deck(convertDeckFromV3(json));
  }
}

export function onLabelInDeckUpdateDeckV3(entry) {
  let json = entry.json();
  if (!json) return;

  json = convertDeckFromV3(json);
  const _deck = playerData.deck(json.id);

  const changeId = entry.hash;
  const deltaDeck = {
    id: changeId,
    deckId: _deck.id,
    date: json.lastUpdated,
    changesMain: [],
    changesSide: [],
    previousMain: _deck.mainDeck,
    previousSide: _deck.sideboard
  };

  // Check Mainboard
  _deck.mainDeck.forEach(card => {
    const cardObj = db.card(card.id);

    let diff = 0 - card.quantity;
    json.mainDeck.forEach(cardB => {
      const cardObjB = db.card(cardB.id);
      if (cardObj.name === cardObjB.name) {
        cardB.existed = true;
        diff = cardB.quantity - card.quantity;
      }
    });

    if (diff !== 0) {
      deltaDeck.changesMain.push({ id: card.id, quantity: diff });
    }
  });

  json.mainDeck.forEach(card => {
    if (card.existed === undefined) {
      deltaDeck.changesMain.push({ id: card.id, quantity: card.quantity });
    }
  });
  // Check sideboard
  _deck.sideboard.forEach(card => {
    const cardObj = db.card(card.id);

    let diff = 0 - card.quantity;
    json.sideboard.forEach(cardB => {
      const cardObjB = db.card(cardB.id);
      if (cardObj.name === cardObjB.name) {
        cardB.existed = true;
        diff = cardB.quantity - card.quantity;
      }
    });

    if (diff !== 0) {
      deltaDeck.changesSide.push({ id: card.id, quantity: diff });
    }
  });

  json.sideboard.forEach(card => {
    if (card.existed === undefined) {
      deltaDeck.changesSide.push({ id: card.id, quantity: card.quantity });
    }
  });

  const foundNewDeckChange =
    !playerData.deckChangeExists(changeId) &&
    (deltaDeck.changesMain.length || deltaDeck.changesSide.length);

  if (foundNewDeckChange) {
    playerDb.upsert("deck_changes", changeId, deltaDeck);
    const deck_changes = { ...playerData.deck_changes, [changeId]: deltaDeck };
    const deck_changes_index = [...playerData.deck_changes_index];
    if (!deck_changes_index.includes(changeId)) {
      deck_changes_index.push(changeId);
    }
    playerDb.upsert("", "deck_changes_index", deck_changes_index);
    setData({ deck_changes, deck_changes_index });
  }

  const deckData = { ..._deck, ...json };
  const decks = { ...playerData.decks, [json.id]: deckData };
  playerDb.upsert("decks", json.id, deckData);
  setData({ decks });
}

// Given a shallow object of numbers and lists return a
// new object which doesn't contain 0s or empty lists.
function minifiedDelta(delta) {
  let newDelta = {};
  Object.keys(delta).forEach(key => {
    let val = delta[key];
    if (val === 0 || (Array.isArray(val) && !val.length)) {
      return;
    }
    newDelta[key] = val;
  });
  return newDelta;
}

// Called for all "Inventory.Updated" labels
export function onLabelInventoryUpdated(entry) {
  const transaction = entry.json();
  if (!transaction) return;

  transaction.updates.forEach(update => {
    const delta = { ...update };
    if (update.context && update.context.source) {
      // combine sub-context with parent context
      delta.subContext = update.context; // preserve sub-context object data
      delta.context = transaction.context + "." + update.context.source;
    }
    // Construct a unique ID
    delta.id = sha1(JSON.stringify(delta) + entry.hash);
    // Add missing data
    delta.date = globals.logTime;
    // Add delta to our current values
    if (delta.delta) {
      inventoryAddDelta(delta.delta);
    }
    // Reduce the size for storage
    delta.delta = minifiedDelta(delta.delta);
    // Do not modify the context from now on.
    saveEconomyTransaction(delta);
  });
}

function inventoryAddDelta(delta) {
  const economy = playerData.economy;
  economy.gems += delta.gemsDelta;
  economy.gold += delta.goldDelta;

  // Update new cards obtained.
  let cardsNew = playerData.cardsNew;
  let cards = playerData.cards;
  delta.cardsAdded.forEach(grpId => {
    // Add to inventory
    if (cards.cards[grpId] === undefined) {
      cards.cards[grpId] = 1;
    } else {
      cards.cards[grpId] += 1;
    }
    // Add to newly aquired
    if (cardsNew[grpId] === undefined) {
      cardsNew[grpId] = 1;
    } else {
      cardsNew[grpId] += 1;
    }
  });

  economy.vault += delta.vaultProgressDelta;
  economy.wcCommon += delta.wcCommonDelta;
  economy.wcUncommon += delta.wcUncommonDelta;
  economy.wcRare += delta.wcRareDelta;
  economy.wcMythic += delta.wcMythicDelta;
  // console.log("cardsNew", cardsNew);
  setData({ economy, cardsNew, cards });
}

function inventoryUpdate(entry, update) {
  // combine sub-context with parent context
  // console.log("inventoryUpdate", entry, update);
  let context = "PostMatch.Update";
  if (update.context && update.context.source) {
    // combine sub-context with parent context
    context += "." + update.context.source;
    if (update.context.sourceId && update.context.source === "QuestReward") {
      context += "." + update.context.sourceId;
    }
  }
  if (update.context && update.context.subSource) {
    // combine sub-sub-context with parent context
    context += "." + update.context.subSource;
  }

  if (update.delta) {
    inventoryAddDelta(update.delta);
  }

  const transaction = {
    ...update,
    // Reduce the size for storage
    delta: update.delta ? minifiedDelta(update.delta) : {},
    context,
    subContext: update.context // preserve sub-context object data
  };
  // Construct a unique ID
  transaction.id = sha1(JSON.stringify(transaction) + entry.hash);
  // Add missing data
  transaction.date = globals.logTime;

  saveEconomyTransaction(transaction);
}

function trackUpdate(entry, trackUpdate) {
  if (!trackUpdate) return;
  const { trackName, trackTier, trackDiff, orbCountDiff } = trackUpdate;

  if (trackDiff && trackDiff.inventoryUpdates) {
    trackDiff.inventoryUpdates.forEach(update => {
      const data = {
        ...update,
        trackName,
        trackTier
      };
      data.context.subSource = trackName;
      inventoryUpdate(entry, data);
    });
  }

  // For some reason, orbs live separately from all other inventory
  if (
    orbCountDiff &&
    orbCountDiff.oldOrbCount !== undefined &&
    orbCountDiff.currentOrbCount !== undefined &&
    orbCountDiff.currentOrbCount - orbCountDiff.oldOrbCount
  ) {
    const data = { trackName, trackTier, orbCountDiff };
    inventoryUpdate(entry, data);
  }
}

export function onLabelPostMatchUpdate(entry) {
  const json = entry.json();
  if (!json) return;

  json.questUpdate.forEach(quest => {
    if (quest.inventoryUpdate) {
      inventoryUpdate(entry, quest.inventoryUpdate);
    }
  });

  json.dailyWinUpdates.forEach(update => {
    inventoryUpdate(entry, update);
  });

  json.weeklyWinUpdates.forEach(update => {
    inventoryUpdate(entry, update);
  });

  trackUpdate(entry, json.eppUpdate);
  trackUpdate(entry, json.battlePassUpdate);
}

export function onLabelInPlayerInventoryGetPlayerInventory(entry) {
  const json = entry.json();
  if (!json) return;
  const economy = {
    ...playerData.economy,
    gold: json.gold,
    gems: json.gems,
    vault: json.vaultProgress,
    wcTrack: json.wcTrackPosition,
    wcCommon: json.wcCommon,
    wcUncommon: json.wcUncommon,
    wcRare: json.wcRare,
    wcMythic: json.wcMythic,
    boosters: json.boosters
  };
  setData({ economy });
  playerDb.upsert("", "economy", economy);
}

export function onLabelInPlayerInventoryGetPlayerCardsV3(entry) {
  const json = entry.json();
  if (!json) return;
  const now = new Date();

  let { cards_time, cards_before } = playerData.cards;
  if (cards_time) {
    // If a day has passed since last update
    if (differenceInDays(now, new Date(cards_time)) > 0) {
      cards_before = playerData.cards.cards;
      cards_time = now;
    }
  } else {
    // Initialize
    cards_time = now;
  }

  const cards = {
    ...playerData.cards,
    cards_time,
    cards_before,
    cards: json
  };

  playerDb.upsert("", "cards", cards);

  const cardsNew = {};
  Object.keys(json).forEach(function(key) {
    // get differences
    if (cards_before[key] === undefined) {
      cardsNew[key] = json[key];
    } else if (cards_before[key] < json[key]) {
      cardsNew[key] = json[key] - cards_before[key];
    }
  });

  setData({ cards, cardsNew });
}

//
export function onLabelInProgressionGetPlayerProgress(entry) {
  const json = entry.json();
  if (!json || !json.activeBattlePass) return;
  const activeTrack = json.activeBattlePass;
  const economy = {
    ...playerData.economy,
    trackName: activeTrack.trackName,
    trackTier: activeTrack.currentTier,
    currentLevel: activeTrack.currentLevel,
    currentExp: activeTrack.currentExp,
    currentOrbCount: activeTrack.currentOrbCount
  };
  setData({ economy });
  playerDb.upsert("", "economy", economy);
}

//
export function onLabelTrackRewardTierUpdated(entry) {
  const json = entry.json();
  if (!json) return;
  // console.log(json);
  const economy = { ...playerData.economy };

  const transaction = {
    id: entry.hash,
    context: "Track.RewardTier.Updated",
    timestamp: json.timestamp,
    date: parseWotcTimeFallback(json.timestamp),
    delta: {},
    ...json
  };

  if (transaction.inventoryDelta) {
    // this is redundant data, removing to save space
    delete transaction.inventoryDelta;
  }
  if (transaction.newTier !== undefined) {
    economy.trackTier = transaction.newTier;
  }

  if (transaction.orbCountDiff) {
    const orbDiff = minifiedDelta(transaction.orbCountDiff);
    transaction.orbCountDiff = orbDiff;
    if (orbDiff.currentOrbCount !== undefined) {
      economy.currentOrbCount = orbDiff.currentOrbCount;
    }
  }

  saveEconomyTransaction(transaction);

  // console.log(economy);
  setData({ economy });
  playerDb.upsert("", "economy", economy);
}

export function onLabelInEventDeckSubmitV3(entry) {
  const json = entry.json();
  if (!json) return;
  select_deck(convertDeckFromV3(json));
}

export function onLabelEventMatchCreated(entry) {
  const json = entry.json();
  if (!json) return;
  const matchBeginTime = globals.logTime || new Date();

  if (json.opponentRankingClass == "Mythic") {
    const httpApi = require("./httpApi");
    httpApi.httpSetMythicRank(
      json.opponentScreenName,
      json.opponentMythicLeaderboardPlace
    );
  }

  ipc_send("ipc_log", "MATCH CREATED: " + matchBeginTime);
  if (json.eventId != "NPE") {
    processMatch(json, matchBeginTime);
  }
}

export function onLabelOutDirectGameChallenge(entry) {
  const json = entry.json();
  if (!json) return;
  var deck = json.params.deck;
  deck = JSON.parse(deck);
  select_deck(convertDeckFromV3(deck));

  const httpApi = require("./httpApi");
  httpApi.httpTournamentCheck(
    globals.currentDeck.getSave(),
    json.params.opponentDisplayName,
    false,
    json.params.playFirst,
    json.params.bo3
  );
}

export function onLabelOutEventAIPractice(entry) {
  const json = entry.json();
  if (!json) return;
  var deck = json.params.deck;
  deck = JSON.parse(deck);
  select_deck(convertDeckFromV3(deck));
}

function getDraftSet(eventName) {
  if (!eventName) return "";
  for (let set in db.sets) {
    const setCode = db.sets[set].code;
    if (eventName.includes(setCode)) {
      return set;
    }
  }
  return "";
}

export function onLabelInDraftDraftStatus(entry) {
  const json = entry.json();
  // console.log("LABEL:  Draft status ", json);
  if (!json) return;

  startDraft();
  const {
    DraftId: draftId,
    PackNumber: packNumber,
    PickNumber: pickNumber,
    PickedCards
  } = json;
  if (packNumber === 0 && pickNumber === 0 && PickedCards.length === 0) {
    // ensure new drafts have clear working-space
    clearDraftData(draftId);
  }
  const data = {
    ...getDraftData(draftId, entry),
    ...json,
    currentPack: (json.DraftPack || []).slice(0)
  };
  data.draftId = data.id;

  setDraftData(data);
}

export function onLabelInDraftMakePick(entry) {
  const json = entry.json();
  // console.log("LABEL:  Make pick > ", json);
  if (!json) return;
  const {
    DraftId: draftId,
    PackNumber: packNumber,
    PickNumber: pickNumber,
    PickedCards: pickedCards
  } = json;
  startDraft();
  const data = {
    ...getDraftData(draftId, entry),
    draftId,
    packNumber,
    pickNumber,
    pickedCards,
    currentPack: (json.DraftPack || []).slice(0)
  };
  data.draftId = data.id;
  setDraftData(data);
}

export function onLabelOutDraftMakePick(entry) {
  const json = entry.json();
  // console.log("LABEL:  Make pick < ", json);
  if (!json || !json.params) return;
  const { draftId, packNumber, pickNumber, cardId } = json.params;
  const key = "pack_" + packNumber + "pick_" + pickNumber;
  const data = getDraftData(draftId, entry);
  data[key] = {
    pick: cardId,
    pack: data.currentPack
  };
  setDraftData(data);
}

export function onLabelInEventCompleteDraft(entry) {
  const json = entry.json();
  // console.log("LABEL:  Complete draft ", json);
  if (!json) return;
  const toolId = json.Id + "-draft";
  const savedData = getDraftData(toolId, entry);
  const draftId = json.ModuleInstanceData.DraftInfo.DraftId;
  const data = {
    ...savedData,
    ...getDraftData(draftId, entry),
    ...json
  };
  data.set = getDraftSet(json.InternalEventName) || data.set;
  data.id = toolId;
  // clear working-space draft data
  clearDraftData(draftId);
  // save final version of draft
  setDraftData(data);
  endDraft(data);
}

export function onLabelMatchGameRoomStateChangedEvent(entry) {
  let json = entry.json();
  if (!json) return;

  json = json.matchGameRoomStateChangedEvent.gameRoomInfo;
  let eventId = "";

  if (json.gameRoomConfig) {
    eventId = json.gameRoomConfig.eventId;
    globals.duringMatch = true;
  }

  if (eventId == "NPE") return;

  if (json.stateType == "MatchGameRoomStateType_Playing") {
    // If current match does nt exist (create match was not recieved , maybe a reconnection)
    // Only problem is recieving the decklist
    if (!globals.currentMatch) {
      let oName = "";
      json.gameRoomConfig.reservedPlayers.forEach(player => {
        if (!player.userId === playerData.arenaId) {
          oName = player.playerName;
        }
      });

      let arg = {
        opponentScreenName: oName,
        opponentRankingClass: "",
        opponentRankingTier: 1,
        eventId: eventId,
        matchId: json.gameRoomConfig.matchId
      };
      // Note: one of the only places we still depend on entry.timestamp
      const matchBeginTime = parseWotcTimeFallback(entry.timestamp);
      processMatch(arg, matchBeginTime);
    }
    json.gameRoomConfig.reservedPlayers.forEach(player => {
      if (player.userId == playerData.arenaId) {
        globals.currentMatch.player.seat = player.systemSeatId;
      } else {
        globals.currentMatch.opponent.name = player.playerName;
        globals.currentMatch.opponent.id = player.userId;
        globals.currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
  if (json.stateType == "MatchGameRoomStateType_MatchCompleted") {
    globals.currentMatch.results = objectClone(
      json.finalMatchResult.resultList
    );

    json.finalMatchResult.resultList.forEach(function(res) {
      if (res.scope == "MatchScope_Match") {
        skipMatch = false;
        globals.duringMatch = false;
      }
    });

    clear_deck();
    if (globals.debugLog || !globals.firstPass)
      ipc_send("set_arena_state", ARENA_MODE_IDLE);
    globals.matchCompletedOnGameNumber =
      json.finalMatchResult.resultList.length - 1;

    var matchEndTime = parseWotcTimeFallback(entry.timestamp);
    saveMatch(
      json.finalMatchResult.matchId + "-" + playerData.arenaId,
      matchEndTime
    );
  }

  if (json.players) {
    json.players.forEach(function(player) {
      if (player.userId == playerData.arenaId) {
        globals.currentMatch.player.seat = player.systemSeatId;
      } else {
        globals.currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
}

export function onLabelInEventGetSeasonAndRankDetail(entry) {
  const json = entry.json();
  if (!json) return;
  db.handleSetSeason(null, json);
  ipc_send("set_season", json);
}

export function onLabelGetPlayerInventoryGetRewardSchedule(entry) {
  const json = entry.json();
  if (!json) return;

  const data = {
    daily: db.rewards_daily_ends.toISOString(),
    weekly: db.rewards_weekly_ends.toISOString()
  };

  if (json.dailyReset) {
    if (!json.dailyReset.endsWith("Z")) json.dailyReset = json.dailyReset + "Z";
    data.daily = json.dailyReset;
  }

  if (json.weeklyReset) {
    if (!json.weeklyReset.endsWith("Z"))
      json.weeklyReset = json.weeklyReset + "Z";
    data.weekly = json.weeklyReset;
  }

  ipc_send("set_reward_resets", data);
}
