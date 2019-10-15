/*
global
  actionLog
  actionLogGenerateAbilityLink
  actionLogGenerateLink
  currentDeck
  currentMatch
  changePriority
  firstPass
  forceDeckUpdate
  getNameBySeat
  idChanges
  initialLibraryInstanceIds
  instanceToCardIdMap
  update_deck
*/
const { IPC_OVERLAY } = require("../shared/constants.js");
const { objectClone } = require("../shared/util");
const { ipc_send } = require("./background-util");

const Deck = require("../shared/deck");

let actionType = [];
actionType[0] = "ActionType_None";
actionType[1] = "ActionType_Cast";
actionType[2] = "ActionType_Activate";
actionType[3] = "ActionType_Play";
actionType[4] = "ActionType_Activate_Mana";
actionType[5] = "ActionType_Pass";
actionType[6] = "ActionType_Activate_Test";
actionType[7] = "ActionType_Mode";
actionType[8] = "ActionType_Special_TurnFaceUp";
actionType[9] = "ActionType_ResolutionCost";
actionType[10] = "ActionType_CastLeft";
actionType[11] = "ActionType_CastRight";
actionType[12] = "ActionType_Make_Payment";
actionType[13] = "ActionType_CastingTimeOption";
actionType[14] = "ActionType_CombatCost";
actionType[15] = "ActionType_OpeningHandAction";

const cardTypes = [
  //"CardType_None",
  "CardType_Artifact",
  "CardType_Creature",
  "CardType_Enchantment",
  "CardType_Instant",
  "CardType_Land",
  //"CardType_Phenomenon",
  //"CardType_Plane",
  "CardType_Planeswalker",
  //"CardType_Scheme",
  "CardType_Sorcery"
  //"CardType_Tribal",
  //"CardType_Vanguard",
];

function keyValuePair(obj, addTo) {
  // I found some times we get f as the value array.. *shrug*
  if (obj.f) {
    addTo[obj.key] = obj.f[0];
    return addTo;
  }
  try {
    if (obj.type == "KeyValuePairValueType_None")
      addTo[obj.key] = obj.valueNone;
    if (obj.type == "KeyValuePairValueType_uint32")
      addTo[obj.key] = obj.valueUint32;
    if (obj.type == "KeyValuePairValueType_int32")
      addTo[obj.key] = obj.valueInt32;
    if (obj.type == "KeyValuePairValueType_uint64")
      addTo[obj.key] = obj.valueUint64;
    if (obj.type == "KeyValuePairValueType_int64")
      addTo[obj.key] = obj.valueInt64;
    if (obj.type == "KeyValuePairValueType_bool")
      addTo[obj.key] = obj.valueBool;
    if (obj.type == "KeyValuePairValueType_string")
      addTo[obj.key] = obj.valueString;
    if (obj.type == "KeyValuePairValueType_float")
      addTo[obj.key] = obj.valueFloat;
    if (obj.type == "KeyValuePairValueType_double")
      addTo[obj.key] = obj.valueDouble;

    if (addTo[obj.key].length == 1) addTo[obj.key] = addTo[obj.key][0];
  } catch (e) {
    addTo[obj.key] = undefined;
  }

  return addTo;
}

function processAnnotations() {
  currentMatch.annotations.forEach(ann => {
    // if this annotation has already been processed, skip
    if (currentMatch.processedAnnotations.includes(ann.id)) return;

    let details = {};
    if (ann.details) {
      ann.details.forEach(detail => (details = keyValuePair(detail, details)));
    }

    let processedOk = true;
    try {
      ann.type.forEach(type => {
        var fn = annotationFunctions[type];
        if (typeof fn == "function") {
          fn(ann, details);
        }
      });
    } catch (e) {
      // console.log(ann, e);
      processedOk = false;
    }

    if (processedOk) {
      //currentMatch.annotations = currentMatch.annotations.splice(index, 1);
      // add this annotation to the list of processed
      currentMatch.processedAnnotations.push(ann.id);
    }
  });
}

function removeProcessedAnnotations() {
  currentMatch.annotations = currentMatch.annotations.filter(
    ann => !currentMatch.processedAnnotations.includes(ann.id)
  );
}

let annotationFunctions = {};

annotationFunctions.AnnotationType_ObjectIdChanged = function(ann, details) {
  //let newObj = cloneDeep(currentMatch.gameObjs[details.orig_id]);
  //currentMatch.gameObjs[details.new_id] = newObj;
  idChanges[details.orig_id] = details.new_id;
};

annotationFunctions.AnnotationType_ZoneTransfer = function(ann, details) {
  // A player played a land
  if (details.category == "PlayLand") {
    let grpId = instanceIdToObject(ann.affectedIds[0]).grpId;
    let playerName = getNameBySeat(ann.affectorId);
    actionLog(
      ann.affectorId,
      logTime,
      `${playerName} played ${actionLogGenerateLink(grpId)}`
    );
  }

  // A player drew a card
  if (details.category == "Draw") {
    let zone = currentMatch.zones[details.zone_src];
    let playerName = getNameBySeat(zone.ownerSeatId);
    let obj = currentMatch.gameObjs[ann.affectedIds[0]];
    if (zone.ownerSeatId == currentMatch.player.seat && obj) {
      let grpId = obj.grpId;
      actionLog(
        zone.ownerSeatId,
        logTime,
        `${playerName} drew ${actionLogGenerateLink(grpId)}`
      );
    } else {
      actionLog(zone.ownerSeatId, logTime, `${playerName} drew a card`);
    }
  }

  // A player casts a spell
  if (details.category == "CastSpell") {
    let obj = instanceIdToObject(ann.affectedIds[0]);
    let grpId = obj.grpId;
    let seat = obj.ownerSeatId;
    let playerName = getNameBySeat(seat);

    let cast = {
      grpId: grpId,
      turn: currentMatch.turnInfo.turnNumber,
      player: seat
    };
    currentMatch.cardsCast.push(cast);

    actionLog(
      seat,
      logTime,
      `${playerName} cast ${actionLogGenerateLink(grpId)}`
    );
  }

  // A player discards a card
  if (details.category == "Discard") {
    let obj = instanceIdToObject(ann.affectedIds[0]);
    let grpId = obj.grpId;
    let seat = obj.ownerSeatId;
    let playerName = getNameBySeat(seat);
    actionLog(
      seat,
      logTime,
      `${playerName} discarded ${actionLogGenerateLink(grpId)}`
    );
  }

  // A player puts a card in a zone
  if (details.category == "Put") {
    let zone = currentMatch.zones[details.zone_dest].type;
    let obj = instanceIdToObject(ann.affectedIds[0]);
    let grpId = obj.grpId;
    let affector = instanceIdToObject(ann.affectorId);
    let seat = obj.ownerSeatId;
    let text = getNameBySeat(seat);
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (affector.type == "GameObjectType_Card") {
      text = actionLogGenerateLink(affector.grpId);
    }
    actionLog(
      seat,
      logTime,
      `${text} put ${actionLogGenerateLink(grpId)} in ${zone}`
    );
  }

  // A card is returned to a zone
  if (details.category == "Return") {
    let zone = currentMatch.zones[details.zone_dest].type;
    let affected = instanceIdToObject(ann.affectedIds[0]);
    let affector = instanceIdToObject(ann.affectorId);

    let text = "";
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (affector.type == "GameObjectType_Card") {
      text = actionLogGenerateLink(affector.grpId);
    }

    let seat = affected.ownerSeatId;
    actionLog(
      seat,
      logTime,
      `${text} returned ${actionLogGenerateLink(affected.grpId)} to ${zone}`
    );
  }

  // A card was exiled
  if (details.category == "Exile") {
    let affected = instanceIdToObject(ann.affectedIds[0]);
    let affector = instanceIdToObject(ann.affectorId);

    let text = "";
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (affector.type == "GameObjectType_Card") {
      text = actionLogGenerateLink(affector.grpId);
    }

    let seat = affector.ownerSeatId;
    actionLog(
      seat,
      logTime,
      `${text} exiled ${actionLogGenerateLink(affected.grpId)}`
    );
  }

  // Saw this one when Lava coil exiled a creature (??)
  if (details.category == "SBA_Damage") {
    //
  }

  // A spell or ability counters something
  if (details.category == "Countered") {
    let affector = instanceIdToObject(ann.affectorId);
    let affected = instanceIdToObject(ann.affectedIds[0]);

    let text = "";
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (affector.type == "GameObjectType_Card") {
      text = actionLogGenerateLink(affector.grpId);
    }

    let seat = affector.ownerSeatId;
    actionLog(
      seat,
      logTime,
      `${text} countered ${actionLogGenerateLink(affected.grpId)}`
    );
  }

  // A spell or ability destroys something
  if (details.category == "Destroy") {
    //
  }
};

annotationFunctions.AnnotationType_AbilityInstanceCreated = function(
  ann,
  details
) {
  let affected = ann.affectedIds[0];
  let affector = instanceIdToObject(ann.affectorId);

  if (affector) {
    currentMatch.gameObjs[affected] = {
      instanceId: affected,
      grpId: 0,
      type: "GameObjectType_Ability",
      zoneId: affector.zoneId,
      visibility: "Visibility_Public",
      ownerSeatId: affector.ownerSeatId,
      controllerSeatId: affector.controllerSeatId,
      objectSourceGrpId: affector.grpId,
      parentId: affector.instanceId
    };
  }
};

annotationFunctions.AnnotationType_ResolutionStart = function(ann, details) {
  let affected = instanceIdToObject(ann.affectedIds[0]);
  let grpId = details.grpid;

  if (affected.type == "GameObjectType_Ability") {
    affected.grpId = grpId;
    actionLog(
      affected.controllerSeatId,
      logTime,
      `${actionLogGenerateLink(
        affected.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(grpId)}`
    );
  }
};

annotationFunctions.AnnotationType_DamageDealt = function(ann, details) {
  let recipient = "";
  if (ann.affectedIds[0] < 5) {
    recipient = getNameBySeat(ann.affectedIds[0]);
  } else {
    let affected = instanceIdToObject(ann.affectedIds[0]);
    recipient = actionLogGenerateLink(affected.grpId);
  }

  let affector = instanceIdToObject(ann.affectorId);
  let dmg = details.damage;

  actionLog(
    affector.controllerSeatId,
    logTime,
    `${actionLogGenerateLink(
      affector.grpId
    )} dealt ${dmg} damage to ${recipient}`
  );
};

annotationFunctions.AnnotationType_ModifiedLife = function(ann, details) {
  let affected = ann.affectedIds[0];
  let total = currentMatch.players[affected].lifeTotal;

  if (details.life > 0) details.life = "+" + details.life;

  actionLog(
    affected,
    logTime,
    `${getNameBySeat(affected)} life changed (${details.life}) to ${total}`
  );
};

annotationFunctions.AnnotationType_TargetSpec = function(ann) {
  let target;
  if (ann.affectedIds[0] < 5) {
    target = getNameBySeat(ann.affectedIds[0]);
  } else {
    let grpId = instanceIdToObject(ann.affectedIds[0]).grpId;
    target = actionLogGenerateLink(grpId);
  }

  let affector = instanceIdToObject(ann.affectorId);
  let seat = affector.ownerSeatId;
  let text = getNameBySeat(seat);
  if (affector.type == "GameObjectType_Ability") {
    text = `${actionLogGenerateLink(
      affector.objectSourceGrpId
    )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
  }
  if (affector.type == "GameObjectType_Card") {
    text = actionLogGenerateLink(affector.grpId);
  }
  actionLog(seat, logTime, `${text} targetted ${target}`);
};

annotationFunctions.AnnotationType_Scry = function(ann, details) {
  let affector = ann.affectorId;
  if (affector > 3) {
    affector = instanceIdToObject(affector).ownerSeatId;
  }
  let player = getNameBySeat(affector);

  let top = details.topIds;
  let bottom = details.bottomIds;
  if (!Array.isArray(top)) {
    top = top !== undefined ? [top] : [];
  }
  if (!Array.isArray(bottom)) {
    bottom = bottom !== undefined ? [bottom] : [];
  }
  let xtop = top.length;
  let xbottom = bottom.length;
  let scrySize = xtop + xbottom;

  actionLog(
    affector,
    logTime,
    `${player} scry ${scrySize}: ${xtop} top, ${xbottom} bottom`
  );
  if (affector == currentMatch.player.seat) {
    if (xtop > 0) {
      top.forEach(instanceId => {
        let grpId = instanceIdToObject(instanceId).grpId;
        actionLog(
          affector,
          logTime,
          ` ${actionLogGenerateLink(grpId)} to the top`
        );
      });
    }
    if (xbottom > 0) {
      bottom.forEach(instanceId => {
        let grpId = instanceIdToObject(instanceId).grpId;
        actionLog(
          affector,
          logTime,
          ` ${actionLogGenerateLink(grpId)} to the bottom`
        );
      });
    }
  }
};

annotationFunctions.AnnotationType_CardRevealed = function(ann, details) {
  if (ann.ignoreForSeatIds == currentMatch.player.seat) return;

  let grpId = ann.affectedIds;
  let zone = currentMatch.zones[details.source_zone];
  let owner = zone.ownerSeatId;

  actionLog(
    owner,
    logTime,
    `revealed ${actionLogGenerateLink(grpId)} from ${zone.type}`
  );
};

// Used for debug only.
function processAll() {
  for (var i = 0; i < currentMatch.latestMessage; i++) {
    let message = currentMatch.GREtoClient[i];
    if (message) {
      var fn = GREMessages[message.type];
      if (typeof fn == "function") {
        console.log(`Process: ${message.type} (${message.msgId})`);
        fn(message);
      }
    }
  }
  currentMatch.cardTypesByZone = getCardsTypeZone();
  currentMatch.playerCardsUsed = getPlayerUsedCards();
  currentMatch.oppCardsUsed = getOppUsedCards();
}

let logTime = false;
function GREMessageByID(msgId, time) {
  let message = currentMatch.GREtoClient[msgId];
  logTime = time;

  var fn = GREMessages[message.type];
  if (typeof fn == "function") {
    fn(message);
  }

  currentMatch.cardTypesByZone = getCardsTypeZone();
  currentMatch.playerCardsUsed = getPlayerUsedCards();
  currentMatch.oppCardsUsed = currentMatch.opponent.cards.concat(
    getOppUsedCards()
  );
}

function GREMessage(message, time) {
  //currentMatch.GREtoClient[message.msgId] = message;
  logTime = time;

  var fn = GREMessages[message.type];
  if (typeof fn == "function") {
    fn(message);
  }

  currentMatch.cardTypesByZone = getCardsTypeZone();
  currentMatch.playerCardsUsed = getPlayerUsedCards();
  currentMatch.oppCardsUsed = currentMatch.opponent.cards.concat(
    getOppUsedCards()
  );
}

function getOppUsedCards() {
  let cardsUsed = [];
  Object.keys(currentMatch.zones).forEach(key => {
    let zone = currentMatch.zones[key];
    if (zone.objectInstanceIds && zone.type !== "ZoneType_Limbo") {
      zone.objectInstanceIds.forEach(id => {
        let grpId;
        try {
          let obj = currentMatch.gameObjs[id];
          if (
            obj.ownerSeatId == currentMatch.opponent.seat &&
            obj.type == "GameObjectType_Card"
          ) {
            grpId = obj.grpId;
            //cardsUsed.push(db.card(grpId).name+" - "+zone.type);
            // 3 is the code for "Face down card", apparently
            if (grpId !== 3) cardsUsed.push(grpId);
          }
        } catch (e) {
          //
        }
      });
    }
  });
  return cardsUsed;
}

function getCardsTypeZone() {
  let data = {};
  Object.keys(currentMatch.zones).forEach(key => {
    let zone = currentMatch.zones[key];
    let zoneType = zone.type;
    if (zone.objectInstanceIds) {
      zone.objectInstanceIds.forEach(id => {
        try {
          let obj = currentMatch.gameObjs[id];
          if (obj.type == "GameObjectType_Card" && obj.grpId !== 3) {
            obj.cardTypes
              .filter(cardType => cardTypes.includes(cardType))
              .forEach(cardType => {
                let grpId;
                grpId = obj.grpId;
                let owner = obj.controllerSeatId;
                if (!data[owner]) data[owner] = {};
                if (!data[owner][zoneType]) data[owner][zoneType] = {};
                if (!data[owner][zoneType][cardType])
                  data[owner][zoneType][cardType] = [];

                data[owner][zoneType][cardType].push(grpId);
              });
          }
        } catch (e) {
          //
        }
      });
    }
  });

  return data;
}

function getPlayerUsedCards() {
  let cardsUsed = [];
  Object.keys(currentMatch.zones).forEach(key => {
    let zone = currentMatch.zones[key];
    if (
      zone.objectInstanceIds &&
      zone.type !== "ZoneType_Limbo" &&
      zone.type !== "ZoneType_Library" &&
      zone.type !== "ZoneType_Revealed"
    ) {
      zone.objectInstanceIds.forEach(id => {
        let grpId;
        try {
          let obj = currentMatch.gameObjs[id];
          if (
            obj.ownerSeatId == currentMatch.player.seat &&
            obj.type == "GameObjectType_Card"
          ) {
            grpId = obj.grpId;
            //cardsUsed.push(db.card(grpId).name+" - "+zone.type);
            if (grpId !== 3) cardsUsed.push(grpId);
          }
        } catch (e) {
          //
        }
      });
    }
  });
  return cardsUsed;
}

let GREMessages = {};

// Some game state messages are sent as queued
GREMessages.GREMessageType_QueuedGameStateMessage = function(msg) {
  GREMessages.GREMessageType_GameStateMessage(msg);
};

GREMessages.GREMessageType_ConnectResp = function(msg) {
  if (
    msg.connectResp.deckMessage.deckCards &&
    currentMatch.player.originalDeck == null
  ) {
    let deck = new Deck({}, msg.connectResp.deckMessage.deckCards);
    currentMatch.player.originalDeck = deck;
    currentMatch.player.deck = deck.clone();
    currentMatch.playerCardsLeft = deck.clone();
  }
};

GREMessages.GREMessageType_GameStateMessage = function(msg) {
  if (
    !currentMatch.msgId ||
    msg.msgId === 1 ||
    msg.msgId < currentMatch.msgId
  ) {
    // New game, reset per-game fields.
    currentMatch.gameStage = "GameStage_Start";
    currentMatch.opponent.cards = currentMatch.oppCardsUsed;
    currentMatch.processedAnnotations = [];
    currentMatch.timers = {};
    currentMatch.zones = {};
    currentMatch.players = {};
    currentMatch.annotations = [];
    currentMatch.gameObjs = {};
    currentMatch.gameInfo = {};
    currentMatch.turnInfo = {};
    currentMatch.playerCardsUsed = [];
    currentMatch.oppCardsUsed = [];
    currentMatch.cardTypesByZone = [];
    initialLibraryInstanceIds = [];
    idChanges = {};
    instanceToCardIdMap = {};
  }
  if (msg.msgId) {
    currentMatch.msgId = msg.msgId;
  }

  let gameState = msg.gameStateMessage;

  if (gameState.gameInfo) {
    checkGameInfo(gameState.gameInfo);
    currentMatch.gameInfo = gameState.gameInfo;
  }

  if (gameState.turnInfo) {
    checkTurnDiff(gameState.turnInfo);
    currentMatch.turnInfo = gameState.turnInfo;
  }

  if (gameState.timers) {
    gameState.timers.forEach(timer => {
      currentMatch.timers[timer.timerId] = timer;
    });
  }

  if (gameState.zones) {
    gameState.zones.forEach(zone => {
      currentMatch.zones[zone.zoneId] = zone;
    });
  }

  if (gameState.players) {
    gameState.players.forEach(player => {
      currentMatch.players[player.controllerSeatId] = player;
    });
  }

  if (gameState.gameObjects) {
    gameState.gameObjects.forEach(obj => {
      currentMatch.gameObjs[obj.instanceId] = obj;
      instanceToCardIdMap[obj.instanceId] = obj.grpId;
    });
  }

  if (gameState.annotations) {
    gameState.annotations.forEach(annotation => {
      currentMatch.annotations[annotation.id] = annotation;
    });
  }

  processAnnotations();
  removeProcessedAnnotations();
  checkForStartingLibrary();

  currentMatch.playerCardsLeft = currentMatch.player.deck.clone();
  forceDeckUpdate();
  update_deck(false);
  return true;
};

function instanceIdToObject(instanceID) {
  let orig = instanceID;
  while (!currentMatch.gameObjs[instanceID] && idChanges[instanceID]) {
    instanceID = idChanges[instanceID];
  }

  let instance = currentMatch.gameObjs[instanceID];
  if (instance) {
    return instance;
  }
  throw new noInstanceException(orig, instanceID, instance);
  //return false;
}

function noInstanceException(orig, instanceID, instance) {
  this.message = `No instance with ID ${orig} found.`;
  this.instanceID = instanceID;
  this.instance = instance;
}

function checkForStartingLibrary() {
  let zoneHand, zoneLibrary;
  Object.keys(currentMatch.zones).forEach(key => {
    let zone = currentMatch.zones[key];
    if (zone.ownerSeatId == currentMatch.player.seat) {
      if (zone.type == "ZoneType_Hand") {
        zoneHand = zone;
      }
      if (zone.type == "ZoneType_Library") {
        zoneLibrary = zone;
      }
    }
  });

  if (currentMatch.gameStage !== "GameStage_Start") return -1;
  if (!zoneHand || !zoneHand.objectInstanceIds) return -2;
  if (!zoneLibrary || !zoneLibrary.objectInstanceIds) return -3;

  let hand = zoneHand.objectInstanceIds || [];
  let library = zoneLibrary.objectInstanceIds || [];
  // Check that a post-mulligan scry hasn't been done
  if (library.length == 0 || library[library.length - 1] < library[0])
    return -4;

  if (hand.length + library.length == currentDeck.mainboard.count()) {
    if (hand.length >= 2 && hand[0] == hand[1] + 1) hand.reverse();
    initialLibraryInstanceIds = [...hand, ...library];
  }
  return initialLibraryInstanceIds;
}

function checkGameInfo(gameInfo) {
  //console.log(`>> GameStage: ${gameInfo.stage} (${currentMatch.gameStage})`);
  //actionLog(-1, logTime, `>> GameStage: ${gameInfo.stage} (${currentMatch.gameStage})`);
  currentMatch.gameStage = gameInfo.stage;
  currentMatch.game = gameInfo.gameNumber;
  if (gameInfo.matchWinCondition) {
    if (gameInfo.matchWinCondition == "MatchWinCondition_SingleElimination") {
      currentMatch.bestOf = 1;
    } else if (gameInfo.matchWinCondition == "MatchWinCondition_Best2of3") {
      currentMatch.bestOf = 3;
    } else {
      currentMatch.bestOf = undefined;
    }
  }

  if (gameInfo.results) {
    currentMatch.results = objectClone(gameInfo.results);
  }
}

function checkTurnDiff(turnInfo) {
  if (
    turnInfo.turnNumber &&
    turnInfo.turnNumber == 1 &&
    turnInfo.activePlayer &&
    currentMatch.game == 1
  ) {
    currentMatch.onThePlay = turnInfo.activePlayer;
  }
  if (currentMatch.turnInfo.turnNumber !== turnInfo.turnNumber) {
    if (turnInfo.priorityPlayer !== currentMatch.turnInfo.currentPriority) {
      changePriority(
        turnInfo.priorityPlayer,
        currentMatch.turnInfo.currentPriority,
        logTime
      );
    }

    actionLog(
      -1,
      logTime,
      getNameBySeat(turnInfo.activePlayer) +
        "'s turn begin. (#" +
        turnInfo.turnNumber +
        ")"
    );
  }

  if (!firstPass) {
    ipc_send(
      "set_turn",
      {
        playerSeat: currentMatch.player.seat,
        turnPhase: turnInfo.phase,
        turnStep: turnInfo.step,
        turnNumber: turnInfo.turnNumber,
        turnActive: turnInfo.activePlayer,
        turnPriority: turnInfo.priorityPlayer,
        turnDecision: turnInfo.decisionPlayer
      },
      IPC_OVERLAY
    );
  }
}

GREMessages.GREMessageType_DieRollResultsResp = function(msg) {
  if (msg.dieRollResultsResp) {
    let highest = msg.dieRollResultsResp.playerDieRolls.reduce((a, b) => {
      if (a.rollValue > b.rollValue) {
        return a;
      } else {
        return b;
      }
    });
    currentMatch.onThePlay = highest.systemSeatId;
  }
  return true;
};

module.exports = {
  GREMessage,
  GREMessageByID,
  processAll
};
