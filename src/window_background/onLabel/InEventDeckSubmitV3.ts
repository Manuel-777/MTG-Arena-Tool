import Deck from "../../shared/deck";
import { PlayerCourse } from "../../types/event";
import LogEntry from "../../types/logDecoder";
import selectDeck from "../selectDeck";
import convertDeckFromV3 from "../convertDeckFromV3";

interface Entry extends LogEntry {
  json: () => PlayerCourse;
}

export default function onLabelInEventDeckSubmitV3(entry: Entry): void {
  const json = entry.json();
  if (!json || !json.CourseDeck) return;
  const deck = new Deck(convertDeckFromV3(json.CourseDeck));
  selectDeck(deck);
}
