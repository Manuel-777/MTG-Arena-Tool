import database from "../database";

export default function getSetCodeInEventId(
  eventId: string
): string | undefined {
  if (eventId) {
    const setCodes = Object.keys(database.sets)
      .filter(
        (setName) => eventId.indexOf(database.sets[setName].arenacode) !== -1
      )
      .map((setName) => database.sets[setName].arenacode);

    return setCodes[0] || undefined;
  }

  return undefined;
}
