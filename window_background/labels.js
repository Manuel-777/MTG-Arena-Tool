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
    clearDraftData
    processMatch
    getDraftData
    endDraft
    setDraftData
    startDraft
    clear_deck
    duringMatch
    playerWin
    draws
    oppWin
    matchCompletedOnGameNumber
    oppId
    playerData
    firstPass
    debugLog
*/
const _ = require("lodash");
const differenceInDays = require("date-fns/differenceInDays");

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
  parseWotcTimeFallback,
  setData
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
  logTime = parseWotcTimeFallback(entry.timestamp);

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

    var mid = payload.matchId + "-" + playerData.arenaId;
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

      game.cardsCast = _.cloneDeep(currentMatch.cardsCast);
      currentMatch.cardsCast = [];
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
  if (json.params.messageName === "Client.SceneChange") {
    const { toSceneName } = json.params.payloadObject;
    if (toSceneName === "Home") {
      if (debugLog || !firstPass) ipc_send("set_arena_state", ARENA_MODE_IDLE);
      duringMatch = false;
      endDraft();
    }
  }
}

function onLabelGreToClient(entry, json) {
  if (!json) return;
  if (skipMatch) return;
  logTime = parseWotcTimeFallback(entry.timestamp);

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
  if (debugLog || !firstPass) {
    store.set("rank", rank);
  }
}

function onLabelInEventGetActiveEvents(entry, json) {
  if (!json) return;

  let activeEvents = json.map(event => event.InternalEventName);
  ipc_send("set_active_events", JSON.stringify(activeEvents));
}

function onLabelRankUpdated(entry, json) {
  if (!json) return;
  const rank = { ...playerData.rank };

  // json.wasLossProtected
  // json.seasonOrdinal
  const updateType = json.rankUpdateType.toLowerCase();

  rank[updateType].rank = json.newClass;
  rank[updateType].tier = json.newLevel;
  rank[updateType].step = json.newStep;
  rank[updateType].seasonOrdinal = json.seasonOrdinal;

  setData({ rank });
  if (debugLog || !firstPass) {
    store.set("rank", rank);
  }
}

function onLabelMythicRatingUpdated(entry, json) {
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
  const rank = { ...playerData.rank };

  rank.constructed.percentile = json.newMythicPercentile;
  rank.constructed.leaderboardPlace = json.newMythicLeaderboardPlacement;

  setData({ rank });
  if (debugLog || !firstPass) {
    store.set("rank", rank);
  }
}

function onLabelInDeckGetDeckLists(entry, json) {
  if (!json) return;

  const decks = { ...playerData.decks };
  const static_decks = [];
  json.forEach(deck => {
    const deckData = { ...(playerData.deck(deck.id) || {}), ...deck };
    decks[deck.id] = deckData;
    if (debugLog || !firstPass) store.set("decks." + deck.id, deckData);
    static_decks.push(deck.id);
  });

  setData({ decks, static_decks });
  if (debugLog || !firstPass) store.set("static_decks", static_decks);
}

function onLabelInDeckGetDeckListsV3(entry, json) {
  if (!json) return;
  onLabelInDeckGetDeckLists(entry, json.map(d => convert_deck_from_v3(d)));
}

function onLabelInDeckGetPreconDecks(entry, json) {
  if (!json) return;
  ipc_send("set_precon_decks", json);
  // console.log(json);
}

function onLabelInEventGetPlayerCourses(entry, json) {
  if (!json) return;

  const static_events = [];
  json.forEach(course => {
    if (course.CurrentEventState != "PreMatch") {
      if (course.CourseDeck != null) {
        addCustomDeck(course.CourseDeck);
      }
    }
    if (course.Id) static_events.push(course.Id);
  });

  setData({ static_events });
  if (debugLog || !firstPass) store.set("static_events", static_events);
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
    json.date = parseWotcTimeFallback(entry.timestamp);
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
  const logTime = parseWotcTimeFallback(entry.timestamp);
  const _deck = playerData.deck(json.id);

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
    !playerData.deckChangeExists(changeId) &&
    (deltaDeck.changesMain.length || deltaDeck.changesSide.length);

  if (foundNewDeckChange) {
    if (debugLog || !firstPass)
      store.set("deck_changes." + changeId, deltaDeck);
    const deck_changes = { ...playerData.deck_changes, [changeId]: deltaDeck };
    const deck_changes_index = [...playerData.deck_changes_index];
    if (!deck_changes_index.includes(changeId)) {
      deck_changes_index.push(changeId);
    }
    if (debugLog || !firstPass)
      store.set("deck_changes_index", deck_changes_index);

    setData({ deck_changes, deck_changes_index });
  }

  const deckData = { ..._deck, ...json };
  const decks = { ...playerData.decks, [json.id]: deckData };
  if (debugLog || !firstPass) store.set("decks." + json.id, deckData);
  setData({ decks });
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
  if (!transaction) return;

  // Store this in case there are any future date parsing issues
  transaction.timestamp = entry.timestamp;

  // Add missing data
  transaction.date = parseWotcTimeFallback(entry.timestamp);

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
  logTime = parseWotcTimeFallback(entry.timestamp);
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
  if (debugLog || !firstPass) store.set("economy", economy);
}

function onLabelInPlayerInventoryGetPlayerCardsV3(entry, json) {
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

  if (debugLog || !firstPass) store.set("cards", cards);

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
function onLabelInProgressionGetPlayerProgress(entry, json) {
  if (!json || !json.activeBattlePass) return;
  logTime = parseWotcTimeFallback(entry.timestamp);
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
  if (debugLog || !firstPass) store.set("economy", economy);
}

//
function onLabelTrackProgressUpdated(entry, json) {
  if (!json) return;
  // console.log(json);
  const economy = { ...playerData.economy };
  json.forEach(track => {
    if (!track.trackDiff) return; // ignore rewardWebDiff updates for now

    const transaction = {
      context: "Track.Progress." + (track.trackName || ""),
      timestamp: entry.timestamp,
      date: parseWotcTimeFallback(entry.timestamp),
      delta: {},
      ...track
    };

    const trackDiff = minifiedDelta(transaction.trackDiff);
    if (trackDiff.inventoryDelta) {
      // this is redundant data, removing to save space
      delete trackDiff.inventoryDelta;
    }
    transaction.trackDiff = trackDiff;

    if (track.trackName) {
      economy.trackName = track.trackName;
    }
    if (track.trackTier !== undefined) {
      economy.trackTier = track.trackTier;
    }
    if (trackDiff.currentLevel !== undefined) {
      economy.currentLevel = trackDiff.currentLevel;
    }
    if (trackDiff.currentExp !== undefined) {
      economy.currentExp = trackDiff.currentExp;
    }

    if (transaction.orbDiff) {
      const orbDiff = minifiedDelta(transaction.orbDiff);
      transaction.orbDiff = orbDiff;
      if (orbDiff.currentOrbCount !== undefined) {
        economy.currentOrbCount = orbDiff.currentOrbCount;
      }
    }

    // Construct a unique ID
    transaction.id = sha1(
      entry.timestamp + JSON.stringify(transaction.trackDiff)
    );
    saveEconomyTransaction(transaction);
  });
  // console.log(economy);
  setData({ economy });
  if (debugLog || !firstPass) store.set("economy", economy);
}

//
function onLabelTrackRewardTierUpdated(entry, json) {
  if (!json) return;
  // console.log(json);
  const economy = { ...playerData.economy };

  const transaction = {
    context: "Track.RewardTier.Updated",
    timestamp: entry.timestamp,
    date: parseWotcTimeFallback(entry.timestamp),
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

  // Construct a unique ID
  transaction.id = sha1(
    entry.timestamp + transaction.oldTier + transaction.newTier
  );
  saveEconomyTransaction(transaction);

  // console.log(economy);
  setData({ economy });
  if (debugLog || !firstPass) store.set("economy", economy);
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
  var matchBeginTime = parseWotcTimeFallback(entry.timestamp);

  if (json.opponentRankingClass == "Mythic") {
    httpSetMythicRank(
      json.opponentScreenName,
      json.opponentMythicLeaderboardPlace
    );
  }

  ipc_send("ipc_log", "MATCH CREATED: " + matchBeginTime);
  if (json.eventId != "NPE") {
    processMatch(json, matchBeginTime);
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

function onLabelInDraftDraftStatus(entry, json) {
  // console.log("LABEL:  Draft status ", json);
  if (!json) return;

  startDraft();
  const { draftId, eventName, packNumber, pickNumber, pickedCards } = json;
  if (packNumber === 0 && pickNumber === 0 && pickedCards.length === 0) {
    // ensure new drafts have clear working-space
    clearDraftData(draftId);
  }
  const data = {
    ...getDraftData(draftId, entry),
    ...json,
    currentPack: (json.draftPack || []).slice(0)
  };
  data.draftId = data.id;
  data.set = getDraftSet(eventName) || data.set;

  setDraftData(data);
}

function onLabelInDraftMakePick(entry, json) {
  // console.log("LABEL:  Make pick > ", json);
  if (!json) return;
  const { draftId, eventName } = json;
  startDraft();
  const data = {
    ...getDraftData(draftId, entry),
    ...json,
    currentPack: (json.draftPack || []).slice(0)
  };
  data.draftId = data.id;
  data.set = getDraftSet(eventName) || data.set;
  setDraftData(data);
}

function onLabelOutDraftMakePick(entry, json) {
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

function onLabelInEventCompleteDraft(entry, json) {
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
  data.id = toolId;
  // clear working-space draft data
  clearDraftData(draftId);
  // save final version of draft
  setDraftData(data);
  endDraft(data);
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
      var matchBeginTime = parseWotcTimeFallback(entry.timestamp);
      processMatch(arg, matchBeginTime);
    }
    json.gameRoomConfig.reservedPlayers.forEach(player => {
      if (player.userId == playerData.arenaId) {
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
    if (debugLog || !firstPass) ipc_send("set_arena_state", ARENA_MODE_IDLE);
    matchCompletedOnGameNumber = json.finalMatchResult.resultList.length - 1;

    var matchEndTime = parseWotcTimeFallback(entry.timestamp);
    saveMatch(
      json.finalMatchResult.matchId + "-" + playerData.arenaId,
      matchEndTime
    );
  }

  if (json.players) {
    json.players.forEach(function(player) {
      if (player.userId == playerData.arenaId) {
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

  const data = {
    daily: db.rewards_daily_ends.toISOString(),
    weekly: db.rewards_weekly_ends.toISOString()
  };

  if (json.dailyReset) {
    if (!json.dailyReset.endsWith("Z")) json.dailyReset = json.dailyReset + "Z";
    data.daily = json.dailyReset;
  }

  // deprecated, leaving around for backwards compatibility for now
  // TODO handle week-based reward track system
  if (json.weeklyReset) {
    if (!json.weeklyReset.endsWith("Z"))
      json.weeklyReset = json.weeklyReset + "Z";
    data.weekly = json.weeklyReset;
  }

  ipc_send("set_reward_resets", data);
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
  onLabelInDeckGetPreconDecks,
  onLabelInEventGetPlayerCourses,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInDeckUpdateDeck,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInProgressionGetPlayerProgress,
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
  onLabelRankUpdated,
  onLabelTrackProgressUpdated,
  onLabelTrackRewardTierUpdated,
  onLabelMythicRatingUpdated
};
