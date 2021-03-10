/* eslint-disable @typescript-eslint/no-var-requires */
import LogEntry from "../../types/logDecoder";
import { normaliseFields } from "../backgroundUtil";
import { Deck } from "mtgatool-shared";
import { setOnThePlay } from "../../shared/store/currentMatchStore";
import globalStore from "../../shared/store";
import debugLog from "../../shared/debugLog";
import { ClientToGREMessage } from "mtgatool-shared/dist/types/greTypes";

interface Entry extends LogEntry {
  json: () => ClientToGREMessage;
}

function decodePayload(payload: any, msgType: string): any {
  const messages = require("../messages_pb");
  const binaryMsg = Buffer.from(payload, "base64");

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
    debugLog(e.message, "error");
  }

  return;
}

export default function ClientToMatchServiceMessageTypeClientToGREMessage(
  entry: Entry
): void {
  const json = entry.json();
  if (!json) return;
  //if (skipMatch) return;
  let payload: ClientToGREMessage = json;
  /*
  if (json.Payload) {
    payload = json.Payload;
  }
  */

  if (typeof payload == "string") {
    const msgType = entry.label.split("_")[1];
    payload = decodePayload(payload, msgType);
  }
  // The sideboarding log message has changed format multiple times, sometimes
  // going back to an earlier format. normaliseFields, together with the
  // conditional decodePayload call, allows the same code to handle each known
  // format in case Arena changes it again.
  payload = normaliseFields(payload);

  if (payload.submitDeckResp) {
    //debugLog("Client To GRE: ", payload);
    // Get sideboard changes
    const deckResp = payload.submitDeckResp?.deck || {
      deckCards: [],
      sideboardCards: [],
      commanderCards: [],
    };

    const currentDeck = globalStore.currentMatch.currentDeck.getSave();

    const newDeck = new Deck(
      currentDeck,
      deckResp.deckCards,
      deckResp.sideboardCards
    );
    globalStore.currentMatch.currentDeck = newDeck;
  }
  // We can safely handle these messages too now !
  if (payload.type == "ClientMessageType_ChooseStartingPlayerResp") {
    if (payload.chooseStartingPlayerResp) {
      const startingPlayer = payload.chooseStartingPlayerResp.systemSeatId;
      if (startingPlayer) {
        setOnThePlay(startingPlayer);
      }
    }
  }
}
