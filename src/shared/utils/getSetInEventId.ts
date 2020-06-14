import database from "../database";

export default function getSetCodeInEventId(
  eventId: string
): string | undefined {
  const _undefined = undefined;
  if (eventId === _undefined) {
    return undefined;
  }
  const setCodes = Object.keys(database.sets)
    .filter(
      (setName) => eventId.indexOf(database.sets[setName].arenacode) !== -1
    )
    .map((setName) => database.sets[setName].arenacode);

  return setCodes[0] || undefined;
}
