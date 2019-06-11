/*
  global
    logTime
    actionLog
    skipMatch
    currentMatch
    getNameBySeat
    logLanguage
    gameNumberCompleted
    initialLibraryInstanceIds
    instanceToCardIdMap
    idChanges
    matchGameStats
    saveMatch
    greToClientInterpreter
    decodePayload
    addCustomDeck
    saveCourse
    select_deck
    sha1
    store
    saveEconomyTransaction
    matchBeginTime
    createMatch
    draftSet
    currentDraft
    createDraft
    setDraftCards
    clear_deck
    saveDraft
    duringMatch
    playerWin
    draws
    oppWin
    matchCompletedOnGameNumber
    oppId
    pd
    firstPass
*/
const { ARENA_MODE_IDLE } = require("../shared/constants");
const db = require("../shared/database");
const CardsList = require("../shared/cards-list");
const { get_deck_colors, objectClone, replaceAll } = require("../shared/util");
const {
  httpSetMythicRank,
  httpSubmitCourse,
  httpTournamentCheck
} = require("./http-api");
const {
  ipc_send,
  normaliseFields,
  parseWotcTime,
  pd_set
} = require("./background-util");

//
function convert_deck_from_v3(deck) {
  return JSON.parse(JSON.stringify(deck), (key, value) => {
    if (key === "mainDeck" || key === "sideboard") {
      let ret = [];
      for (let i = 0; i < value.length; i += 2) {
        if (value[i + 1] > 0) {
          ret.push({ id: value[i], quantity: value[i + 1] });
        }
      }
      return ret;
    }
    return value;
  });
}

function onLabelOutLogInfo(entry, json) {
  if (!json) return;
  logTime = parseWotcTime(entry.timestamp);
  if (json.params.messageName == "DuelScene.GameStart") {
    let gameNumber = json.params.payloadObject.gameNumber;
    actionLog(-2, logTime, `Game ${gameNumber} Start`);
  }

  if (json.params.messageName == "Client.Connected") {
    logLanguage = json.params.payloadObject.settings.language.language;
  }
  if (skipMatch) return;
  if (json.params.messageName == "DuelScene.GameStop") {
    currentMatch.opponent.cards = currentMatch.oppCardsUsed;

    var payload = json.params.payloadObject;

    let loserName = getNameBySeat(payload.winningTeamId == 1 ? 2 : 1);
    if (payload.winningReason == "ResultReason_Concede") {
      actionLog(-1, logTime, `${loserName} Conceded`);
    }
    if (payload.winningReason == "ResultReason_Timeout") {
      actionLog(-1, logTime, `${loserName} Timed out`);
    }

    let playerName = getNameBySeat(payload.winningTeamId);
    actionLog(-1, logTime, `${playerName} Wins!`);

    var mid = payload.matchId + "-" + pd.arenaId;
    var time = payload.secondsCount;
    if (mid == currentMatch.matchId) {
      gameNumberCompleted = payload.gameNumber;
      currentMatch.matchTime += time;

      let game = {};
      game.shuffledOrder = [];
      for (let i = 0; i < initialLibraryInstanceIds.length; i++) {
        let instance = initialLibraryInstanceIds[i];
        while (
          (!instanceToCardIdMap[instance] ||
            !db.card(instanceToCardIdMap[instance])) &&
          idChanges[instance]
        ) {
          instance = idChanges[instance];
        }
        let cardId = instanceToCardIdMap[instance];
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

      if (gameNumberCompleted > 1) {
        let deckDiff = {};
        currentMatch.player.deck.mainboard.get().forEach(card => {
          deckDiff[card.id] = card.quantity;
        });
        currentMatch.player.originalDeck.mainboard.get().forEach(card => {
          deckDiff[card.id] = (deckDiff[card.id] || 0) - card.quantity;
        });
        matchGameStats.forEach((stats, i) => {
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
        game.deck = objectClone(currentMatch.player.deck.getSave());
      }

      game.handLands = game.handsDrawn.map(
        hand => hand.filter(card => db.card(card).type.includes("Land")).length
      );
      let handSize = 8 - game.handsDrawn.length;
      let deckSize = 0;
      let landsInDeck = 0;
      let multiCardPositions = { "2": {}, "3": {}, "4": {} };
      let cardCounts = {};
      currentMatch.player.deck.mainboard.get().forEach(card => {
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

      game.deckSize = deckSize;
      game.landsInDeck = landsInDeck;
      game.multiCardPositions = multiCardPositions;
      game.librarySize = librarySize;
      game.landsInLibrary = landsInLibrary;
      game.libraryLands = libraryLands;

      matchGameStats[gameNumberCompleted - 1] = game;

      saveMatch(mid);
    }
  }
}

function onLabelGreToClient(entry, json) {
  if (!json) return;
  if (skipMatch) return;
  logTime = parseWotcTime(entry.timestamp);

  json = json.greToClientEvent.greToClientMessages;
  json.forEach(function(msg) {
    let msgId = msg.msgId;
    greToClientInterpreter.GREMessage(msg, logTime);
    /*
    currentMatch.GREtoClient[msgId] = msg;
    currentMatch.latestMessage = msgId;
    greToClientInterpreter.GREMessageByID(msgId, logTime);
    */
  });
}

function onLabelClientToMatchServiceMessageTypeClientToGREMessage(entry, json) {
  //
  if (!json) return;
  if (skipMatch) return;
  if (json.Payload) {
    json.payload = json.Payload;
  }
  if (!json.payload) return;

  if (typeof json.payload == "string") {
    json.payload = decodePayload(json);
    json.payload = normaliseFields(json.payload);
  }

  if (json.payload.submitdeckresp) {
    // Get sideboard changes
    let deckResp = json.payload.submitdeckresp.deck;

    let tempMain = new CardsList(deckResp.deckcards);
    let tempSide = new CardsList(deckResp.sideboardcards);
    let newDeck = currentMatch.player.deck.clone();
    newDeck.mainboard = tempMain;
    newDeck.sideboard = tempSide;
    newDeck.getColors();

    currentMatch.player.deck = newDeck;
    console.log("> ", currentMatch.player.deck);
  }
}

function onLabelInEventGetCombinedRankInfo(entry, json) {
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

  pd_set({ rank });
  ipc_send("player_data_updated");
}

function onLabelInEventGetActiveEvents(entry, json) {
  if (!json) return;

  let activeEvents = json.map(event => event.InternalEventName);
  ipc_send("set_active_events", JSON.stringify(activeEvents));
}

function onLabelRankUpdated(entry, json) {
  if (!json) return;
  const rank = { ...pd.rank };

  if (json.rankUpdateType === "Constructed") {
    rank.constructed.rank = json.newClass;
    rank.constructed.tier = json.newLevel;
    rank.constructed.step = json.newStep;
  } else {
    rank.limited.rank = json.newClass;
    rank.limited.tier = json.newLevel;
    rank.limited.step = json.newStep;
  }

  pd_set({ rank });
  ipc_send("player_data_updated");
}

function onLabelInDeckGetDeckLists(entry, json) {
  if (!json) return;

  const decks = { ...pd.decks };
  // decks_index is for backwards compatibility
  // (just in case bleeding edge folks need to revert)
  const decks_index = [...pd.decks_index];
  const static_decks = [];
  json.forEach(deck => {
    if (!decks_index.includes(deck.id)) {
      decks_index.push(deck.id);
    }
    decks[deck.id] = { ...(pd.deck(deck.id) || {}), ...deck };
    static_decks.push(deck.id);
  });

  pd_set({ decks, decks_index, static_decks });
  if (!firstPass) ipc_send("player_data_refresh");
}

function onLabelInDeckGetDeckListsV3(entry, json) {
  if (!json) return;
  onLabelInDeckGetDeckLists(entry, json.map(d => convert_deck_from_v3(d)));
}

function onLabelInEventGetPlayerCourses(entry, json) {
  if (!json) return;

  json.forEach(course => {
    if (course.CurrentEventState != "PreMatch") {
      if (course.CourseDeck != null) {
        addCustomDeck(course.CourseDeck);
      }
    }
  });
}

function onLabelInEventGetPlayerCoursesV2(entry, json) {
  if (!json) return;
  json.forEach(course => {
    if (course.CourseDeck) {
      course.CourseDeck = convert_deck_from_v3(course.CourseDeck);
    }
  });
  onLabelInEventGetPlayerCourses(entry, json);
}

function onLabelInEventGetPlayerCourse(entry, json) {
  if (!json) return;

  if (json.Id != "00000000-0000-0000-0000-000000000000") {
    json.date = parseWotcTime(entry.timestamp);
    json._id = json.Id;
    delete json.Id;

    if (json.CourseDeck) {
      json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
      addCustomDeck(json.CourseDeck);
      //json.date = timestamp();
      //console.log(json.CourseDeck, json.CourseDeck.colors)
      httpSubmitCourse(json);
      saveCourse(json);
    }
    select_deck(json);
  }
}

function onLabelInEventGetPlayerCourseV2(entry, json) {
  if (!json) return;
  if (json.CourseDeck) {
    json.CourseDeck = convert_deck_from_v3(json.CourseDeck);
  }
  onLabelInEventGetPlayerCourse(entry, json);
}

function onLabelInEventJoin(entry, json) {
  if (!json) return;

  if (json.CourseDeck) {
    json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
    addCustomDeck(json.CourseDeck);
    select_deck(json);
  }
}

function onLabelInDeckUpdateDeck(entry, json) {
  if (!json) return;
  const logTime = parseWotcTime(entry.timestamp);
  const _deck = pd.deck(json.id);

  const changeId = sha1(json.id + "-" + logTime);
  const deltaDeck = {
    id: changeId,
    deckId: _deck.id,
    date: logTime,
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
    !pd.deckChangeExists(changeId) &&
    (deltaDeck.changesMain.length || deltaDeck.changesSide.length);

  if (foundNewDeckChange) {
    store.set("deck_changes." + changeId, deltaDeck);
    const deck_changes = { ...pd.deck_changes, [changeId]: deltaDeck };
    const deck_changes_index = [...pd.deck_changes_index];
    if (!deck_changes_index.includes(changeId)) {
      deck_changes_index.push(changeId);
    }
    store.set("deck_changes_index", deck_changes_index);

    pd_set({ deck_changes, deck_changes_index });
    if (!firstPass) ipc_send("player_data_refresh");
  }
}

function onLabelInDeckUpdateDeckV3(entry, json) {
  if (!json) return;
  onLabelInDeckUpdateDeck(entry, convert_deck_from_v3(json));
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
function onLabelInventoryUpdated(entry, transaction) {
  // if (!transaction) return;

  // Store this in case there are any future date parsing issues
  transaction.timestamp = entry.timestamp;

  // Add missing data
  transaction.date = parseWotcTime(entry.timestamp);

  // Reduce the size for storage
  transaction.delta = minifiedDelta(transaction.delta);

  // Construct a unique ID
  let context = transaction.context;
  //let milliseconds = transaction.date.getTime();
  // We use the original time string for the ID to ensure parsing does not alter it
  // This will make the ID the same if parsing either changes or breaks
  transaction.id = sha1(
    entry.timestamp + context + JSON.stringify(transaction.delta)
  );

  // Do not modify the context from now on.
  saveEconomyTransaction(transaction);
  return;
}

function onLabelInPlayerInventoryGetPlayerInventory(entry, json) {
  if (!json) return;
  logTime = parseWotcTime(entry.timestamp);
  const economy = {
    gold: json.gold,
    gems: json.gems,
    vault: json.vaultProgress,
    wcTrack: json.wcTrackPosition,
    wcCommon: json.wcCommon,
    wcUncommon: json.wcUncommon,
    wcRare: json.wcRare,
    wcMythic: json.wcMythic
  };
  pd_set({ economy });
  if (!firstPass) ipc_send("player_data_refresh");
}

function onLabelInPlayerInventoryGetPlayerCardsV3(entry, json) {
  if (!json) return;

  const date = new Date(pd.cards.cards_time);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  const days = Math.floor(diff / (1000 * 3600 * 24));

  let cards_before = pd.cards.cards_before;
  // If a day has passed since last update
  if (pd.cards.cards_time !== 0 && days > 0) {
    cards_before = pd.cards.cards;
  }

  const cards = {
    ...pd.cards,
    cards_time: now,
    cards_before,
    cards: json
  };

  store.set("cards", cards);

  const cardsNew = {};
  Object.keys(json).forEach(function(key) {
    // get differences
    if (cards_before[key] === undefined) {
      cardsNew[key] = json[key];
    } else if (cards_before[key] < json[key]) {
      cardsNew[key] = json[key] - cards_before[key];
    }
  });

  pd_set({ cards, cardsNew });
  if (!firstPass) ipc_send("player_data_refresh");
}

function onLabelInEventDeckSubmit(entry, json) {
  if (!json) return;
  select_deck(json);
}

function onLabelInEventDeckSubmitV3(entry, json) {
  if (!json) return;
  onLabelInEventDeckSubmit(entry, convert_deck_from_v3(json));
}

function onLabelEventMatchCreated(entry, json) {
  if (!json) return;
  matchBeginTime = parseWotcTime(entry.timestamp);

  if (json.opponentRankingClass == "Mythic") {
    httpSetMythicRank(
      json.opponentScreenName,
      json.opponentMythicLeaderboardPlace
    );
  }

  ipc_send("ipc_log", "MATCH CREATED: " + matchBeginTime);
  if (json.eventId != "NPE") {
    createMatch(json);
  }
}

function onLabelOutDirectGameChallenge(entry, json) {
  if (!json) return;
  var deck = json.params.deck;

  deck = replaceAll(deck, '"Id"', '"id"');
  deck = replaceAll(deck, '"Quantity"', '"quantity"');
  deck = JSON.parse(deck);
  select_deck(deck);

  httpTournamentCheck(
    deck,
    json.params.opponentDisplayName,
    false,
    json.params.playFirst,
    json.params.bo3
  );
}

function onLabelOutEventAIPractice(entry, json) {
  if (!json) return;
  var deck = json.params.deck;

  deck = replaceAll(deck, '"Id"', '"id"');
  deck = replaceAll(deck, '"Quantity"', '"quantity"');
  deck = JSON.parse(deck);
  select_deck(deck);
}

function onLabelInDraftDraftStatus(entry, json) {
  if (!json) return;

  if (json.eventName != undefined) {
    for (let set in db.sets) {
      let setCode = db.sets[set]["code"];
      if (json.eventName.indexOf(setCode) !== -1) {
        draftSet = set;
      }
    }
  }

  if (
    currentDraft == undefined ||
    (json.packNumber == 0 && json.pickNumber <= 0)
  ) {
    createDraft();
  }
  currentDraft.packNumber = json.packNumber;
  currentDraft.pickNumber = json.pickNumber;
  currentDraft.pickedCards = json.pickedCards;
  currentDraft.currentPack = json.draftPack.slice(0);
  setDraftCards(currentDraft);
}

function onLabelInDraftMakePick(entry, json) {
  if (!json) return;
  // store pack in recording
  if (json.eventName != undefined) {
    for (let set in db.sets) {
      let setCode = db.sets[set]["code"];
      if (json.eventName.indexOf(setCode) !== -1) {
        currentDraft.set = set;
      }
    }
  }

  if (json.draftPack != undefined) {
    if (currentDraft == undefined) {
      createDraft();
    }
    currentDraft.packNumber = json.packNumber;
    currentDraft.pickNumber = json.pickNumber;
    currentDraft.pickedCards = json.pickedCards;
    currentDraft.currentPack = json.draftPack.slice(0);
    setDraftCards(currentDraft);
  }
}

function onLabelOutDraftMakePick(entry, json) {
  if (!json) return;
  // store pick in recording
  var value = {};
  value.pick = json.params.cardId;
  value.pack = currentDraft.currentPack;
  var key = "pack_" + json.params.packNumber + "pick_" + json.params.pickNumber;
  currentDraft[key] = value;
}

function onLabelInEventCompleteDraft(entry, json) {
  if (!json) return;
  clear_deck();
  ipc_send("set_arena_state", ARENA_MODE_IDLE);
  //ipc_send("renderer_show", 1);

  currentDraft.draftId = json.Id;
  console.log("Complete draft", json);
  saveDraft();
}

function onLabelMatchGameRoomStateChangedEvent(entry, json) {
  if (!json) return;

  json = json.matchGameRoomStateChangedEvent.gameRoomInfo;
  let eventId = "";

  if (json.gameRoomConfig) {
    eventId = json.gameRoomConfig.eventId;
    duringMatch = true;
  }

  if (eventId == "NPE") return;

  if (json.stateType == "MatchGameRoomStateType_Playing") {
    // If current match does nt exist (create match was not recieved , maybe a reconnection)
    // Only problem is recieving the decklist
    if (!currentMatch) {
      let oName = "";
      json.gameRoomConfig.reservedPlayers.forEach(player => {
        if (!player.userId === pd.arenaId) {
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
      createMatch(arg);
    }
    json.gameRoomConfig.reservedPlayers.forEach(player => {
      if (player.userId == pd.arenaId) {
        currentMatch.player.seat = player.systemSeatId;
      } else {
        currentMatch.opponent.name = player.playerName;
        currentMatch.opponent.id = player.userId;
        currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
  if (json.stateType == "MatchGameRoomStateType_MatchCompleted") {
    currentMatch.results = objectClone(json.finalMatchResult.resultList);

    json.finalMatchResult.resultList.forEach(function(res) {
      if (res.scope == "MatchScope_Match") {
        skipMatch = false;
        duringMatch = false;
      }
    });

    clear_deck();
    ipc_send("set_arena_state", ARENA_MODE_IDLE);
    matchCompletedOnGameNumber = json.finalMatchResult.resultList.length - 1;
    saveMatch(json.finalMatchResult.matchId + "-" + pd.arenaId);
  }

  if (json.players) {
    json.players.forEach(function(player) {
      if (player.userId == pd.arenaId) {
        currentMatch.player.seat = player.systemSeatId;
      } else {
        oppId = player.userId;
        currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
}

function onLabelInEventGetSeasonAndRankDetail(entry, json) {
  if (!json) return;
  db.handleSetSeason(null, json);
  ipc_send("set_season", json);
}

function onLabelGetPlayerInventoryGetRewardSchedule(entry, json) {
  if (!json) return;

  if (!json.dailyReset.endsWith("Z")) json.dailyReset = json.dailyReset + "Z";
  if (!json.weeklyReset.endsWith("Z"))
    json.weeklyReset = json.weeklyReset + "Z";

  ipc_send("set_reward_resets", {
    daily: json.dailyReset,
    weekly: json.weeklyReset
  });
}

module.exports = {
  onLabelOutLogInfo,
  onLabelGreToClient,
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelInEventGetPlayerCourse,
  onLabelInEventGetPlayerCourseV2,
  onLabelInEventJoin,
  onLabelInEventGetCombinedRankInfo,
  onLabelInDeckGetDeckLists,
  onLabelInDeckGetDeckListsV3,
  onLabelInEventGetPlayerCourses,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInDeckUpdateDeck,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInEventDeckSubmit,
  onLabelInEventDeckSubmitV3,
  onLabelInEventGetActiveEvents,
  onLabelEventMatchCreated,
  onLabelOutDirectGameChallenge,
  onLabelOutEventAIPractice,
  onLabelInDraftDraftStatus,
  onLabelInDraftMakePick,
  onLabelOutDraftMakePick,
  onLabelInEventCompleteDraft,
  onLabelMatchGameRoomStateChangedEvent,
  onLabelInEventGetSeasonAndRankDetail,
  onLabelGetPlayerInventoryGetRewardSchedule,
  onLabelRankUpdated
};
