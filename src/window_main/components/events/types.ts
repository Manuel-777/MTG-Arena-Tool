import { TableState } from "react-table";
import { AggregatorFilters } from "../../aggregator";
import { TableControlsProps, TableData } from "../tables/types";

export interface SerializedEvent {
  archived?: boolean;
  CourseDeck: {
    id: string;
    name: string;
    colors: number[];
    deckTileId: number;
  };
  CurrentEventState: string | number;
  custom: boolean;
  date: string;
  id: string;
  InternalEventName: string;
  ModuleInstanceData: {
    WinLossGate?: {
      CurrentWins: number;
      CurrentLosses: number;
      ProcessedMatchIds: string[];
    };
    WinNoGate?: {
      CurrentWins: number;
      ProcessedMatchIds: string[];
    };
  };
  type: "Event";
}

export interface EventInstanceData {
  CurrentWins: number;
  CurrentLosses?: number;
  ProcessedMatchIds?: string[];
}

export interface EventStats {
  displayName: string;
  duration?: number;
  eventState: string;
  gameWins?: number;
  gameLosses?: number;
  isMissingMatchData: boolean;
  losses: number;
  matchIds: string[];
  wins: number;
}

export interface EventTableData extends TableData, SerializedEvent, EventStats {
  archivedSortVal: number;
  colors: number[];
  colorSortVal: string;
  deckId: string;
  deckName: string;
  stats: EventStats;
  timestamp: number;
}

export interface EventsTableProps {
  archiveCallback: (id: string | number) => void;
  aggFilters: AggregatorFilters;
  cachedState: TableState<EventTableData>;
  cachedTableMode: string;
  data: EventTableData[];
  editTagCallback: (tag: string, color: string) => void;
  events: string[];
  filterDataCallback: (data: EventTableData[]) => void;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  tableModeCallback: (tableMode: string) => void;
  tableStateCallback: (state: TableState<EventTableData>) => void;
}

export interface EventsTableControlsProps
  extends TableControlsProps<EventTableData> {
  aggFilters: AggregatorFilters;
  events: string[];
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
}
