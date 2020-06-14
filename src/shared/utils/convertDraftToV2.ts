import {
  InternalDraft,
  InternalDraftv2,
  InternalDraftPackPick,
} from "../../types/draft";
import database from "../database";
import getSetCodeInEventId from "./getSetInEventId";

export default function convertDraftToV2(
  original: InternalDraft,
  metadata: InternalDraft
): InternalDraftv2 {
  // declae empty as default
  const packs: InternalDraftv2["packs"] = [
    Array(16).fill([]) as number[][],
    Array(16).fill([]) as number[][],
    Array(16).fill([]) as number[][],
  ];
  const picks: InternalDraftv2["picks"] = [
    Array(16).fill(0) as number[],
    Array(16).fill(0) as number[],
    Array(16).fill(0) as number[],
  ];
  for (let p = 0; p < 3; p++) {
    for (let i = 0; i < 15; i++) {
      const key = `pack_${p}pick_${i}`;
      const pickPack = original[key] as InternalDraftPackPick;
      if (pickPack) {
        packs[p][i] = pickPack.pack.map((d) => parseInt(d));
        picks[p][i] = parseInt(pickPack.pick);
      }
    }
  }

  return {
    archived: false,
    owner: original.owner,
    arenaId: original.player,
    date: original.date,
    eventId: original.InternalEventName || metadata.InternalEventName,
    id: original.id,
    draftSet:
      database.sets[original.set]?.arenacode ||
      getSetCodeInEventId(
        original.InternalEventName || metadata.InternalEventName
      ) ||
      "",
    currentPack: original.packNumber,
    currentPick: original.pickNumber,
    // removed number from the original CardPool to make this work
    // Basically we cant map a string[] | number[] array and get it
    // typed as a number[] automatically based on the map fn
    pickedCards:
      original.CardPool?.map((n: string | number) => parseInt(n + "")) ||
      metadata.CardPool?.map((n: string | number) => parseInt(n + "")) ||
      [],
    packs,
    picks,
    type: "draft",
  };
}
