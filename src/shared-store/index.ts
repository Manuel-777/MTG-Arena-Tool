import { InternalMatch } from "../types/match";

const globalStore = {
  matches: {} as Record<string, InternalMatch>
};

export function getMatch(id: string): InternalMatch | undefined {
  return globalStore.matches[id] || undefined;
}

export function matchExists(id: string): boolean {
  return globalStore.matches[id] ? true : false;
}

export function matchesList(): InternalMatch[] {
  return Object.keys(globalStore.matches).map(
    (key: string) => globalStore.matches[key]
  );
}

export default globalStore;
