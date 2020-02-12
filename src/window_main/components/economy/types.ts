import { CellProps, TableState, Row } from "react-table";
import { TableControlsProps, TableViewRowProps } from "../tables/types";

export interface SerializedTransaction {
  id: string;
  date: string;
  originalContext: string;
  trackDiff: {
    currentLevel: number;
    oldLevel: number;
  };
  orbCountDiff: {
    currentOrbCount: number;
    oldOrbCount: number;
  };
  delta: {
    artSkinsAdded?: { artId: string }[];
    boosterDelta?: { collationId: number; count: number }[];
    cardsAdded?: { grpId: string }[];
    draftTokensDelta?: number;
    gemsDelta?: number;
    goldDelta?: number;
    sealedTokensDelta?: number;
    vanityItemsAdded?: string[];
    vaultProgressDelta?: number;
    wcCommonDelta?: number;
    wcUncommonDelta?: number;
    wcRareDelta?: number;
    wcMythicDelta?: number;
  };
  aetherizedCards: { grpId: string }[];
  xpGained: string;
  archived: boolean;
}

export interface TransactionData extends SerializedTransaction {
  aetherizedCardsCount: number;
  archivedSortVal: number;
  artSkinsAddedCount: number;
  boosterDeltaCount: number;
  cardsAddedCount: number;
  custom: boolean;
  daysAgo: number;
  draftTokensDelta: number;
  fullContext: string;
  gemsDelta: number;
  goldDelta: number;
  orbDelta: number;
  prettyContext: string;
  sealedTokensDelta: number;
  timestamp: number;
  trackLevelDelta: number;
  vanityAddedCount: number;
  vaultProgressDelta: number;
  wcCommonDelta: number;
  wcDelta: number;
  wcMythicDelta: number;
  wcRareDelta: number;
  wcUncommonDelta: number;
  xpGainedNumber: number;
}

export interface EconomyTableProps {
  archiveCallback: (id: string) => void;
  cachedState?: TableState<TransactionData>;
  cachedTableMode: string;
  data: TransactionData[];
  tableModeCallback: (tableMode: string) => void;
  tableStateCallback: (state: TableState<TransactionData>) => void;
}

export interface EconomyTableControlsProps
  extends TableControlsProps<TransactionData> {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export interface EconomyTableRowProps
  extends TableViewRowProps<TransactionData> {
  isExpanded: boolean;
  tableMode: string;
  prepareRow: (row: Row<TransactionData>) => void;
}

export interface EconomyTableCellProps extends CellProps<TransactionData> {
  archiveCallback: (id: string) => void;
}
