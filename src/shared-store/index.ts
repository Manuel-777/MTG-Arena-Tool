import { InternalMatch } from "../types/match";

const globalStore = {
  matches: {} as Record<string, InternalMatch>
};

export function getMatch(id: string): InternalMatch | undefined {
  return globalStore.matches[id] || undefined;
}

export default globalStore;
